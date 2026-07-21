/**
 * Versioned schema migrations.
 *
 * `SCHEMA_SQL` (lib/schema.ts) bootstraps a *fresh* database with
 * `CREATE TABLE IF NOT EXISTS`. It can never alter a table that already
 * exists, so every change after initial creation belongs here instead.
 *
 * Contract:
 *   - Migrations run in ascending `version` order, exactly once each,
 *     tracked in the `schema_migrations` table.
 *   - Each runs inside its own transaction: a throwing migration rolls back
 *     and aborts the run, leaving the database at the last good version.
 *   - Never edit a migration that has shipped. Add a new one.
 *   - Prefer idempotent statements (`IF NOT EXISTS`, guarded ALTERs) so a
 *     migration is still safe if it meets a database that was hand-repaired.
 */
import type { DatabaseSync } from "node:sqlite";

export interface Migration {
  version: number;
  name: string;
  up(db: DatabaseSync): void;
}

/** Add a column only if it isn't already present (ALTER TABLE has no IF NOT EXISTS). */
function ensureColumn(db: DatabaseSync, table: string, column: string, ddl: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

/**
 * Refuse to create a unique index over a table that already violates it.
 * Throws with a diagnosis instead of letting SQLite fail opaquely at startup.
 */
function assertNoDuplicates(db: DatabaseSync, table: string, cols: string[]): void {
  const key = cols.join(", ");
  const dupes = db
    .prepare(`SELECT ${key}, COUNT(*) AS n FROM ${table} GROUP BY ${key} HAVING n > 1`)
    .all() as Record<string, unknown>[];
  if (dupes.length > 0) {
    throw new Error(
      `Cannot add a unique index on ${table}(${key}) — ${dupes.length} duplicate group(s) exist. ` +
        `This should be impossible via the seeder; if you hand-edited the database, ` +
        `remove the duplicates and restart. Offending keys: ${JSON.stringify(dupes.slice(0, 5))}`,
    );
  }
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "study_plan_session_columns",
    // Previously applied ad-hoc on every connection by lib/db.ts#migrate().
    // Folded into the migration ledger; the guards keep it safe on databases
    // that already received these columns from the old code path.
    up(db) {
      ensureColumn(db, "study_plan", "session_code", "session_code TEXT");
      ensureColumn(db, "study_plan", "start_time", "start_time TEXT");
    },
  },
  {
    version: 2,
    name: "unique_natural_keys",
    // Enables ON CONFLICT upserts in the seeder, so re-seeding preserves row
    // IDs instead of deleting and reinserting. That deletion was nulling
    // questions.topic_id / questions.paper_id via ON DELETE SET NULL, silently
    // orphaning the whole question bank on every `npm run seed`.
    up(db) {
      assertNoDuplicates(db, "topics", ["exam_id", "area", "subtopic"]);
      assertNoDuplicates(db, "papers", ["exam_id", "title"]);
      assertNoDuplicates(db, "sources", ["exam_id", "name"]);

      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_topics_natural
          ON topics(exam_id, area, subtopic);
        CREATE UNIQUE INDEX IF NOT EXISTS ux_papers_natural
          ON papers(exam_id, title);
        CREATE UNIQUE INDEX IF NOT EXISTS ux_sources_natural
          ON sources(exam_id, name);
      `);
    },
  },
  {
    version: 3,
    name: "test_sessions_modules_annotations",
    // Phase 1. A digital SAT section is two timed modules where module 2's
    // difficulty depends on module 1 performance. That was unrepresentable:
    // `attempts` had no module or section column, so satSectionScore()'s
    // routing logic had nothing to operate on and was never called.
    //
    // A test_session owns one or more attempts (one per module). Deliberately
    // free-text `section` and `kind` rather than CHECK constraints, so a third
    // exam track does not need a migration to add its own section codes.
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS test_sessions (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          exam_id           INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
          section           TEXT NOT NULL,        -- 'Math'|'RW' (SAT), 'P1'|'P2' (TMUA)
          kind              TEXT NOT NULL,        -- 'adaptive_section' | 'single_paper'
          mode              TEXT NOT NULL,        -- mirrors attempts.mode
          started_at        TEXT NOT NULL DEFAULT (datetime('now')),
          finished_at       TEXT,
          routed_difficulty TEXT,                 -- 'easy'|'hard' once module 1 is marked
          raw_score         REAL,
          scaled_score      REAL,
          seconds_total     INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_exam ON test_sessions(exam_id, started_at);
      `);

      // One attempt per module, linked back to the owning session.
      ensureColumn(db, "attempts", "session_id", "session_id INTEGER REFERENCES test_sessions(id) ON DELETE CASCADE");
      ensureColumn(db, "attempts", "module_number", "module_number INTEGER");
      ensureColumn(db, "attempts", "section", "section TEXT");
      // Which module-2 variant was actually served ('easy'|'hard'), so a past
      // attempt can still be interpreted after the routing rules change.
      ensureColumn(db, "attempts", "module_difficulty", "module_difficulty TEXT");

      db.exec("CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id, module_number)");

      // Bluebook parity: Mark for Review and the answer eliminator are part of
      // how the test is taken, so they belong with the response, not in UI state.
      ensureColumn(db, "responses", "flagged", "flagged INTEGER NOT NULL DEFAULT 0");
      ensureColumn(db, "responses", "eliminated_json", "eliminated_json TEXT");

      // Highlights & notes. attempt_id is nullable so an annotation can also be
      // made while reviewing, outside any attempt.
      db.exec(`
        CREATE TABLE IF NOT EXISTS annotations (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          attempt_id   INTEGER REFERENCES attempts(id) ON DELETE CASCADE,
          question_id  INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
          kind         TEXT NOT NULL CHECK (kind IN ('highlight','note')),
          quoted_text  TEXT,
          start_offset INTEGER,
          end_offset   INTEGER,
          color        TEXT,
          note_md      TEXT,
          created_at   TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_annotations_question ON annotations(question_id);
        CREATE INDEX IF NOT EXISTS idx_annotations_attempt  ON annotations(attempt_id);
      `);
    },
  },
  {
    version: 4,
    name: "passages_and_desmos_drills",
    up(db) {
      // Reading & Writing questions are a passage plus a stem. Storing both in
      // prompt_md made the split-pane layout impossible and muddled the
      // question text with the material it refers to.
      ensureColumn(db, "questions", "passage_md", "passage_md TEXT");

      // Desmos fluency is a timed skill, so drills are scored on speed as well
      // as correctness. Kept separate from `responses`: a drill is not an exam
      // question and must never enter section scoring or the mistake notebook.
      db.exec(`
        CREATE TABLE IF NOT EXISTS desmos_drill_attempts (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          drill_code  TEXT NOT NULL,
          correct     INTEGER NOT NULL,
          seconds     REAL NOT NULL,
          par_seconds INTEGER NOT NULL,
          created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_drill_code ON desmos_drill_attempts(drill_code, created_at);
      `);
    },
  },
  {
    version: 5,
    name: "mistake_root_cause",
    up(db) {
      // `error_type` is a fine-grained, exam-specific label (trap_answer,
      // grammar_rule_unknown, ...). What drives study decisions is the coarse
      // reason: did you not know it, or did you know it and slip? Those need
      // different responses — content review versus checking procedure — so
      // they are recorded separately rather than inferred from the detail label.
      ensureColumn(db, "mistakes", "root_cause", "root_cause TEXT");
      // Whether the student has actually triaged this, as opposed to the
      // system's guess. An untriaged guess must not be presented as fact.
      ensureColumn(db, "mistakes", "triaged", "triaged INTEGER NOT NULL DEFAULT 0");

      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_mistakes_root ON mistakes(root_cause, resolved, created_at)",
      );
    },
  },
  {
    version: 6,
    name: "observed_difficulty_and_flashcards",
    up(db) {
      // Observed difficulty is kept SEPARATE from the asserted `difficulty`.
      // See lib/calibration.ts: the asserted label drives module routing so a
      // simulated section still resembles the real exam, while the observed one
      // drives personal drilling. Merging them would make "hard module 2" mean
      // "questions this student gets wrong" and flatter the predicted score.
      ensureColumn(db, "questions", "observed_p_value", "observed_p_value REAL");
      ensureColumn(db, "questions", "observed_attempts", "observed_attempts INTEGER NOT NULL DEFAULT 0");
      ensureColumn(db, "questions", "calibrated_difficulty", "calibrated_difficulty TEXT");
      ensureColumn(db, "questions", "calibrated_at", "calibrated_at TEXT");

      // Vocab and formula flashcards: a lighter content type than a practice
      // question, with no choices, no marking and no place in section scoring.
      db.exec(`
        CREATE TABLE IF NOT EXISTS flashcards (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          exam_id    INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
          topic_id   INTEGER REFERENCES topics(id) ON DELETE SET NULL,
          kind       TEXT NOT NULL CHECK (kind IN ('vocab','formula')),
          front_md   TEXT NOT NULL,
          back_md    TEXT NOT NULL,
          hint_md    TEXT,
          source     TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE UNIQUE INDEX IF NOT EXISTS ux_flashcards_front
          ON flashcards(exam_id, kind, front_md);
        CREATE INDEX IF NOT EXISTS idx_flashcards_exam ON flashcards(exam_id, kind);
      `);

      // Let an SRS card point at a flashcard as well as a question.
      ensureColumn(
        db,
        "srs_cards",
        "flashcard_id",
        "flashcard_id INTEGER REFERENCES flashcards(id) ON DELETE CASCADE",
      );
      db.exec("CREATE INDEX IF NOT EXISTS idx_srs_flashcard ON srs_cards(flashcard_id)");
    },
  },
];

/** Apply every migration newer than the database's current version. */
export function runMigrations(db: DatabaseSync): { applied: number[]; from: number; to: number } {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const row = db.prepare("SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations").get() as
    | { v: number }
    | undefined;
  const from = Number(row?.v ?? 0);

  const pending = MIGRATIONS.filter((m) => m.version > from).sort((a, b) => a.version - b.version);
  const applied: number[] = [];

  for (const m of pending) {
    db.exec("BEGIN");
    try {
      m.up(db);
      db.prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?)").run(
        m.version,
        m.name,
      );
      db.exec("COMMIT");
      applied.push(m.version);
    } catch (err) {
      db.exec("ROLLBACK");
      throw new Error(
        `Migration ${m.version} (${m.name}) failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { applied, from, to: applied.length > 0 ? Math.max(from, ...applied) : from };
}

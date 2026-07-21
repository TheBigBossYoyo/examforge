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

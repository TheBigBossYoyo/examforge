/**
 * ExamForge database schema (section C of the build spec).
 *
 * Uses Node's built-in `node:sqlite` module — zero native compilation,
 * fully local-first. All data lives in `data/examforge.db`.
 *
 * This file contains the canonical DDL. It is idempotent: every table is
 * created with `IF NOT EXISTS`, so running it repeatedly is safe.
 */

export const SCHEMA_SQL = /* sql */ `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS exams (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL CHECK (name IN ('TMUA','SAT')),
  target_score REAL NOT NULL,
  exam_date    TEXT NOT NULL,           -- ISO date (YYYY-MM-DD)
  scale_min    REAL NOT NULL,
  scale_max    REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('official','adjacent')),
  exam_id      INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  cost         TEXT NOT NULL CHECK (cost IN ('free','paid')),
  url          TEXT,
  has_solutions INTEGER NOT NULL DEFAULT 0,   -- bool
  license_note TEXT
);

CREATE TABLE IF NOT EXISTS papers (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id           INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  exam_id             INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  year                INTEGER,
  kind                TEXT NOT NULL CHECK (kind IN ('paper','module','topic_set','mock')),
  time_limit_min      INTEGER,
  num_questions       INTEGER,
  difficulty          TEXT CHECK (difficulty IN ('easy','med','hard','1600level','real')),
  pdf_url             TEXT,
  relevance_to_target INTEGER CHECK (relevance_to_target BETWEEN 1 AND 5),
  note                TEXT
);

CREATE TABLE IF NOT EXISTS topics (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id   INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  area      TEXT NOT NULL,
  subtopic  TEXT NOT NULL,
  parent_id INTEGER REFERENCES topics(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id          INTEGER REFERENCES papers(id) ON DELETE SET NULL,
  exam_id           INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  topic_id          INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  prompt_md         TEXT NOT NULL,
  choices_json      TEXT,                 -- JSON array of strings (nullable for free-response)
  correct_answer    TEXT NOT NULL,
  solution_md       TEXT,
  difficulty        TEXT CHECK (difficulty IN ('easy','med','hard','1600level','real')),
  source_label      TEXT,
  origin            TEXT NOT NULL CHECK (origin IN ('user_import','ai_generated')),
  hint1_md          TEXT,
  hint2_md          TEXT,
  hint3_md          TEXT,
  desmos_recommended INTEGER NOT NULL DEFAULT 0,
  desmos_state_json TEXT,
  faster_method_md  TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attempts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id      INTEGER REFERENCES papers(id) ON DELETE SET NULL,
  exam_id       INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  started_at    TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at   TEXT,
  mode          TEXT NOT NULL CHECK (mode IN ('exam','untimed','redo','drill','diagnostic')),
  raw_score     REAL,
  scaled_score  REAL,
  seconds_total INTEGER
);

CREATE TABLE IF NOT EXISTS responses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id   INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id  INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  given_answer TEXT,
  is_correct   INTEGER,                  -- bool (nullable = unanswered)
  seconds_spent INTEGER NOT NULL DEFAULT 0,
  hints_used   INTEGER NOT NULL DEFAULT 0,
  confidence   TEXT CHECK (confidence IN ('guessed','unsure','confident'))
);

CREATE TABLE IF NOT EXISTS mistakes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  response_id INTEGER REFERENCES responses(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  topic_id    INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  error_type  TEXT NOT NULL,
  note_md     TEXT,
  resolved    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resources (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id        INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  source_id      INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  url            TEXT NOT NULL,
  topic_tags_json TEXT,                  -- JSON array of strings
  difficulty     TEXT,
  type           TEXT NOT NULL CHECK (type IN ('past_paper','spec','notes','theory','questionbank','video','tool','dates')),
  cost           TEXT NOT NULL CHECK (cost IN ('free','paid')),
  has_solutions  INTEGER NOT NULL DEFAULT 0,
  relevance      INTEGER,
  license_note   TEXT
);

CREATE TABLE IF NOT EXISTS study_plan (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id      INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  date         TEXT NOT NULL,
  task_md      TEXT NOT NULL,
  topic_id     INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  est_minutes  INTEGER,
  type         TEXT NOT NULL CHECK (type IN ('drill','mock','theory','review','desmos')),
  done         INTEGER NOT NULL DEFAULT 0,
  session_code TEXT,                  -- catalogue session this task belongs to (section M)
  start_time   TEXT                   -- 'HH:MM' of the owning schedule block (for calendar placement)
);

-- Fixed weekly schedule (section M). day_of_week: 0=Mon .. 6=Sun.
-- locked=1 marks a non-study block the planner must never schedule study into.
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TEXT NOT NULL,         -- 'HH:MM'
  end_time     TEXT NOT NULL,         -- 'HH:MM'
  category     TEXT NOT NULL CHECK (category IN
                 ('SAT','TMUA','Workout','Chess','Chess (Coach)','Personal Statement','free')),
  session_code TEXT,                  -- nullable; default catalogue session for SAT/TMUA blocks
  locked       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS progress (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id        INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  topic_id       INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  accuracy       REAL NOT NULL DEFAULT 0,
  avg_seconds    REAL NOT NULL DEFAULT 0,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  last_practiced TEXT,
  mastery        INTEGER NOT NULL DEFAULT 0 CHECK (mastery BETWEEN 0 AND 100),
  UNIQUE (exam_id, topic_id)
);

CREATE TABLE IF NOT EXISTS srs_cards (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id       INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  topic_id      INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  question_id   INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  ease          REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  due_date      TEXT NOT NULL,
  reps          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Indexes for fast filtering / search
CREATE INDEX IF NOT EXISTS idx_questions_exam   ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic  ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_paper  ON questions(paper_id);
CREATE INDEX IF NOT EXISTS idx_responses_attempt ON responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_responses_question ON responses(question_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_question ON mistakes(question_id);
CREATE INDEX IF NOT EXISTS idx_resources_exam   ON resources(exam_id);
CREATE INDEX IF NOT EXISTS idx_papers_exam      ON papers(exam_id);
CREATE INDEX IF NOT EXISTS idx_topics_exam      ON topics(exam_id);
CREATE INDEX IF NOT EXISTS idx_attempts_exam    ON attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_srs_due          ON srs_cards(due_date);
CREATE INDEX IF NOT EXISTS idx_studyplan_exam_date ON study_plan(exam_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_dow ON schedule_blocks(day_of_week);
`;

/**
 * Database connection (singleton) using Node's built-in `node:sqlite`.
 *
 * Why node:sqlite instead of better-sqlite3?
 *   better-sqlite3 requires a C++ toolchain to compile on install. Node 22.5+
 *   ships a built-in, synchronous SQLite (`DatabaseSync`) with a near-identical
 *   API (prepare / run / get / all), so ExamForge stays 100% local-first with
 *   zero native-build steps. Requires Node >= 22.5 (Node 24 recommended).
 *
 * The connection is cached on `globalThis` so Next.js dev hot-reload does not
 * open a new handle on every module evaluation.
 */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { SCHEMA_SQL } from "./schema";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = process.env.EXAMFORGE_DB_PATH || path.join(DB_DIR, "examforge.db");

type GlobalWithDb = typeof globalThis & { __examforgeDb?: DatabaseSync };
const g = globalThis as GlobalWithDb;

function createConnection(): DatabaseSync {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  const conn = new DatabaseSync(DB_PATH);
  conn.exec(SCHEMA_SQL);
  migrate(conn);
  return conn;
}

/**
 * Lightweight, idempotent column migrations for databases created before a
 * schema column existed. `CREATE TABLE IF NOT EXISTS` never alters an existing
 * table, so additive columns are applied here, guarded by PRAGMA table_info.
 */
function migrate(conn: DatabaseSync): void {
  const ensureColumn = (table: string, column: string, ddl: string) => {
    const cols = conn.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) {
      conn.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    }
  };
  ensureColumn("study_plan", "session_code", "session_code TEXT");
  ensureColumn("study_plan", "start_time", "start_time TEXT");
}

/** The shared database handle. Schema is applied lazily on first access. */
export function getDb(): DatabaseSync {
  if (!g.__examforgeDb) {
    g.__examforgeDb = createConnection();
  }
  return g.__examforgeDb;
}

/**
 * node:sqlite returns null-prototype row objects. This normalises them into
 * plain objects so they serialize cleanly across the RSC / client boundary.
 */
export function plain<T>(row: unknown): T {
  return { ...(row as object) } as T;
}

export function plainAll<T>(rows: unknown[]): T[] {
  return rows.map((r) => plain<T>(r));
}

/** Convenience: prepare + all, returning plain objects. */
export function query<T>(sql: string, params: unknown[] = []): T[] {
  const stmt = getDb().prepare(sql);
  return plainAll<T>(stmt.all(...(params as never[])));
}

/** Convenience: prepare + get, returning a single plain object or undefined. */
export function queryOne<T>(sql: string, params: unknown[] = []): T | undefined {
  const stmt = getDb().prepare(sql);
  const row = stmt.get(...(params as never[]));
  return row === undefined ? undefined : plain<T>(row);
}

/** Convenience: prepare + run, returning lastInsertRowid as a number. */
export function execute(
  sql: string,
  params: unknown[] = [],
): { changes: number; lastInsertRowid: number } {
  const stmt = getDb().prepare(sql);
  const res = stmt.run(...(params as never[]));
  return {
    changes: Number(res.changes),
    lastInsertRowid: Number(res.lastInsertRowid),
  };
}

/** Run a function inside a transaction. */
export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export { DB_PATH };

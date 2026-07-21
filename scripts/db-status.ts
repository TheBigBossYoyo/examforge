/**
 * Print database health: applied migrations, row counts, and the integrity
 * checks that matter for this app (orphaned questions, empty bank).
 *
 *   npm run db:status
 */
import { getDb, query, queryOne } from "../lib/db";

getDb(); // opens the connection, applies schema + pending migrations

const migrations = query<{ version: number; name: string; applied_at: string }>(
  "SELECT version, name, applied_at FROM schema_migrations ORDER BY version",
);

console.log("→ Migrations");
if (migrations.length === 0) {
  console.log("  (none applied)");
} else {
  for (const m of migrations) {
    console.log(`  ✓ ${String(m.version).padStart(3)} ${m.name.padEnd(32)} ${m.applied_at}`);
  }
}

const TABLES = [
  "exams",
  "topics",
  "questions",
  "papers",
  "sources",
  "resources",
  "attempts",
  "responses",
  "mistakes",
  "progress",
  "srs_cards",
  "study_plan",
  "schedule_blocks",
];

console.log("\n→ Row counts");
for (const t of TABLES) {
  const n = queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`)?.n ?? 0;
  console.log(`  ${t.padEnd(18)} ${String(n).padStart(6)}`);
}

console.log("\n→ Integrity");

const orphanTopic =
  queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM questions WHERE topic_id IS NULL")?.n ?? 0;
const totalQ = queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM questions")?.n ?? 0;
if (totalQ === 0) {
  console.log("  ! Question bank is EMPTY — run `npm run seed` then `npm run load:bank`");
} else if (orphanTopic > 0) {
  console.log(
    `  ! ${orphanTopic}/${totalQ} questions have no topic_id — topic drills, mastery and ` +
      `analytics-by-topic will not work for them`,
  );
} else {
  console.log(`  ✓ All ${totalQ} questions are topic-tagged`);
}

const fk = query<Record<string, unknown>>("PRAGMA foreign_key_check");
console.log(
  fk.length === 0
    ? "  ✓ No foreign-key violations"
    : `  ! ${fk.length} foreign-key violation(s): ${JSON.stringify(fk.slice(0, 5))}`,
);

const integrity = queryOne<{ integrity_check: string }>("PRAGMA integrity_check");
console.log(
  integrity?.integrity_check === "ok"
    ? "  ✓ SQLite integrity check passed"
    : `  ! Integrity check: ${integrity?.integrity_check}`,
);

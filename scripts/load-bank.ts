/**
 * ExamForge static AI-original bank loader.
 *   npm run load:bank [-- --force]
 *
 * Imports every samples/bank/*.json file (each an array of ImportQuestion)
 * into the question bank with origin='ai_generated'. Idempotent: if an
 * "AI Original" bank is already present it skips, unless --force is passed
 * (which first removes previously loaded, un-attempted AI Original questions).
 *
 * Run after npm run seed (topics must exist).
 */
import fs from "node:fs";
import path from "node:path";
import { getDb, execute, queryOne } from "../lib/db";
import { importQuestions, type ImportQuestion } from "../lib/importer";

function main() {
  const force = process.argv.slice(2).includes("--force");
  getDb(); // apply schema

  const bankDir = path.join(process.cwd(), "samples", "bank");
  if (!fs.existsSync(bankDir)) {
    console.error(`✗ No bank directory at ${bankDir}. Nothing to load.`);
    process.exit(1);
  }

  const existing = queryOne<{ n: number }>(
    "SELECT COUNT(*) AS n FROM questions WHERE source_label = 'AI Original'",
  );
  if ((existing?.n ?? 0) > 0) {
    if (!force) {
      console.log(
        `• AI Original bank already present (${existing?.n} questions). ` +
          `Re-run with '-- --force' to reload.`,
      );
      return;
    }
    // Remove only previously loaded bank questions that have NOT been attempted.
    const del = execute(
      `DELETE FROM questions
       WHERE source_label = 'AI Original'
         AND id NOT IN (SELECT DISTINCT question_id FROM responses)`,
    );
    console.log(`  • --force: removed ${del.changes} un-attempted AI Original questions.`);
  }

  const files = fs
    .readdirSync(bankDir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .sort();
  if (files.length === 0) {
    console.error(`✗ No .json files in ${bankDir}.`);
    process.exit(1);
  }

  let totalInserted = 0;
  let totalRejected = 0;
  for (const file of files) {
    const full = path.join(bankDir, file);
    let rows: ImportQuestion[];
    try {
      rows = JSON.parse(fs.readFileSync(full, "utf8")) as ImportQuestion[];
    } catch (err) {
      console.warn(`  ! ${file}: invalid JSON — ${err instanceof Error ? err.message : err}`);
      continue;
    }
    if (!Array.isArray(rows)) {
      console.warn(`  ! ${file}: expected a JSON array — skipped.`);
      continue;
    }
    const res = importQuestions(rows, "ai_generated");
    totalInserted += res.inserted;
    totalRejected += res.rejected.length;
    console.log(`  ✓ ${file}: +${res.inserted}${res.rejected.length ? `, ${res.rejected.length} rejected` : ""}`);
    if (res.rejected.length)
      console.warn(`      first rejection: ${res.rejected[0]?.reason}`);
  }

  console.log(
    `\n✓ Bank load complete: ${totalInserted} inserted` +
      `${totalRejected ? `, ${totalRejected} rejected` : ""}.`,
  );
}

main();

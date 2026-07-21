/**
 * Recompute observed difficulty from real answers.
 *   npm run calibrate [-- --dry-run] [--exam SAT|TMUA]
 *
 * Updates only the observed_* columns; the asserted `difficulty` that module
 * routing reads is left alone. See lib/calibration.ts for why those must stay
 * separate in a single-user app.
 */
import { getDb, queryOne } from "../lib/db";
import { runCalibration, getMistaggedQuestions } from "../lib/calibration-store";
import { MIN_ATTEMPTS_TO_CALIBRATE } from "../lib/calibration";

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const examArg = argv.includes("--exam") ? argv[argv.indexOf("--exam") + 1] : undefined;

  getDb();

  let examId: number | undefined;
  if (examArg) {
    examId = queryOne<{ id: number }>("SELECT id FROM exams WHERE name = ?", [examArg])?.id;
    if (!examId) {
      console.error(`✗ Unknown exam '${examArg}'.`);
      process.exit(1);
    }
  }

  const { summary, written } = runCalibration(examId, dryRun);

  console.log(`→ Calibration${dryRun ? " (dry-run)" : ""}`);
  console.log(`  questions with any answers : ${summary.considered}`);
  console.log(`  enough answers to trust    : ${summary.reliable} (>= ${MIN_ATTEMPTS_TO_CALIBRATE} attempts)`);
  console.log(`  mis-tagged by 2+ bands     : ${summary.mistagged}`);

  if (summary.reliable > 0) {
    console.log("\n  Observed difficulty distribution:");
    for (const band of ["easy", "med", "hard", "1600level"]) {
      const n = summary.byBand[band] ?? 0;
      if (n > 0) console.log(`    ${band.padEnd(10)} ${String(n).padStart(4)}`);
    }
  }

  if (summary.worst.length > 0) {
    console.log("\n  Worst disagreements (shipped label vs reality):");
    for (const w of summary.worst) {
      console.log(
        `    #${String(w.questionId).padEnd(5)} says ${String(w.asserted).padEnd(10)}` +
          ` but p=${w.pValue.toFixed(2)} over ${w.attempts} attempts -> ${w.calibrated}`,
      );
    }
  }

  if (!dryRun) console.log(`\n✓ Updated ${written} question(s).`);

  const stillWrong = getMistaggedQuestions(examId, 5);
  if (stillWrong.length > 0 && !dryRun) {
    console.log(
      `\n  ${stillWrong.length} question(s) remain mis-tagged. They are still served under their` +
        `\n  shipped label for exam fidelity, but drills and next-best-action use the observed one.`,
    );
  }
}

main();

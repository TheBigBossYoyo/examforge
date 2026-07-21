/**
 * Difficulty calibration from observed performance.
 *
 * Every question ships with an *asserted* difficulty — whatever the generator
 * or importer claimed. That claim is frequently wrong, and a wrong difficulty
 * is not cosmetic: it decides which questions fill a "hard" module 2, so a
 * mis-tagged bank quietly corrupts adaptive scoring.
 *
 * THE IMPORTANT CAVEAT. ExamForge is single-user. A p-value computed from one
 * student's attempts measures "how hard is this *for Youssef*", not "how hard
 * is this item" in the norm-referenced sense the real exam uses. Those are
 * different quantities and must not be conflated:
 *
 *   - `difficulty` (asserted) stays the exam-fidelity label and keeps driving
 *     module routing, so a simulated section still resembles the real one.
 *   - `calibrated_difficulty` (observed) drives personal drilling and
 *     next-best-action, where "hard for you" is exactly the right signal.
 *
 * Collapsing the two would create a feedback loop: module 2 "hard" would become
 * "questions Youssef gets wrong", the simulation would drift away from the real
 * test, and the predicted score would flatter him.
 */
import type { DifficultyBand } from "./exam-format";

/**
 * Below this, a p-value is noise. Four attempts of a coin-flip question can
 * read 0.0 or 1.0 by luck.
 */
export const MIN_ATTEMPTS_TO_CALIBRATE = 4;

/** Facility index thresholds — the share answering correctly. */
export function pValueToDifficulty(p: number): DifficultyBand {
  if (p >= 0.85) return "easy";
  if (p >= 0.6) return "med";
  if (p >= 0.35) return "hard";
  return "1600level";
}

/** Ordering used to measure how far apart two labels are. */
const BAND_ORDER: DifficultyBand[] = ["easy", "med", "hard", "1600level"];

export function bandDistance(a: string | null, b: string | null): number {
  const ia = BAND_ORDER.indexOf(a as DifficultyBand);
  const ib = BAND_ORDER.indexOf(b as DifficultyBand);
  if (ia < 0 || ib < 0) return 0;
  return Math.abs(ia - ib);
}

export interface CalibrationInput {
  questionId: number;
  asserted: string | null;
  attempts: number;
  correct: number;
}

export interface CalibrationResult {
  questionId: number;
  pValue: number;
  attempts: number;
  asserted: string | null;
  calibrated: DifficultyBand | null;
  /** Enough attempts for the p-value to mean anything. */
  reliable: boolean;
  /** Bands between the claim and the observation. */
  drift: number;
  /** Two or more bands apart — the shipped label is probably wrong. */
  mistagged: boolean;
}

export function calibrateQuestion(input: CalibrationInput): CalibrationResult {
  const attempts = Math.max(0, input.attempts);
  const correct = Math.max(0, Math.min(attempts, input.correct));
  const pValue = attempts > 0 ? correct / attempts : 0;
  const reliable = attempts >= MIN_ATTEMPTS_TO_CALIBRATE;
  const calibrated = reliable ? pValueToDifficulty(pValue) : null;
  const drift = calibrated ? bandDistance(input.asserted, calibrated) : 0;

  return {
    questionId: input.questionId,
    pValue,
    attempts,
    asserted: input.asserted,
    calibrated,
    reliable,
    drift,
    mistagged: reliable && drift >= 2,
  };
}

export function calibrateBatch(inputs: CalibrationInput[]): CalibrationResult[] {
  return inputs.map(calibrateQuestion);
}

export interface CalibrationSummary {
  considered: number;
  reliable: number;
  mistagged: number;
  /** How many landed in each observed band. */
  byBand: Record<string, number>;
  /** Worst offenders, most drifted first. */
  worst: CalibrationResult[];
}

export function summarise(results: CalibrationResult[], worstLimit = 10): CalibrationSummary {
  const reliable = results.filter((r) => r.reliable);
  const byBand: Record<string, number> = {};
  for (const r of reliable) {
    if (r.calibrated) byBand[r.calibrated] = (byBand[r.calibrated] ?? 0) + 1;
  }
  return {
    considered: results.length,
    reliable: reliable.length,
    mistagged: reliable.filter((r) => r.mistagged).length,
    byBand,
    worst: reliable
      .filter((r) => r.mistagged)
      .sort((a, b) => b.drift - a.drift || a.pValue - b.pValue)
      .slice(0, Math.max(0, worstLimit)),
  };
}

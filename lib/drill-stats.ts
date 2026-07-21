/** Persistence and stats for Desmos speed drills. */
import { execute, query, queryOne } from "./db";
import { DESMOS_DRILLS } from "./desmos-drills";

export interface DrillAttemptInput {
  drillCode: string;
  correct: boolean;
  seconds: number;
  parSeconds: number;
}

export function recordDrillAttempt(input: DrillAttemptInput): void {
  execute(
    `INSERT INTO desmos_drill_attempts (drill_code, correct, seconds, par_seconds)
     VALUES (?,?,?,?)`,
    [
      input.drillCode,
      input.correct ? 1 : 0,
      Math.max(0, Math.min(3600, input.seconds)),
      Math.max(1, Math.round(input.parSeconds)),
    ],
  );
}

export interface DrillStat {
  drill_code: string;
  attempts: number;
  correct: number;
  best_seconds: number | null;
  last_seconds: number | null;
  par_seconds: number;
  /** Fluent = answered correctly inside par at least once. */
  fluent: boolean;
}

export function getDrillStats(): DrillStat[] {
  const rows = query<{
    drill_code: string;
    attempts: number;
    correct: number;
    best_seconds: number | null;
  }>(
    `SELECT drill_code,
            COUNT(*) AS attempts,
            SUM(correct) AS correct,
            MIN(CASE WHEN correct = 1 THEN seconds END) AS best_seconds
       FROM desmos_drill_attempts
      GROUP BY drill_code`,
  );
  const byCode = new Map(rows.map((r) => [r.drill_code, r]));

  return DESMOS_DRILLS.map((d) => {
    const r = byCode.get(d.code);
    const last = queryOne<{ seconds: number }>(
      "SELECT seconds FROM desmos_drill_attempts WHERE drill_code = ? ORDER BY id DESC LIMIT 1",
      [d.code],
    );
    const best = r?.best_seconds ?? null;
    return {
      drill_code: d.code,
      attempts: r?.attempts ?? 0,
      correct: r?.correct ?? 0,
      best_seconds: best,
      last_seconds: last?.seconds ?? null,
      par_seconds: d.par_seconds,
      fluent: best != null && best <= d.par_seconds,
    };
  });
}

/** Share of drills answered correctly inside par at least once. */
export function desmosFluencyPercent(): number {
  const stats = getDrillStats();
  if (stats.length === 0) return 0;
  return Math.round((stats.filter((s) => s.fluent).length / stats.length) * 100);
}

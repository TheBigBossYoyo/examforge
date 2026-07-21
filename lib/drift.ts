/**
 * Schedule drift: has the plan stopped matching reality?
 *
 * A study plan generated once and never revisited becomes a guilt artefact —
 * it accumulates overdue tasks and stops describing what to do today. The
 * planner already regenerates on demand; this decides *when* that is warranted,
 * so a plan can re-fit itself around what actually happened.
 *
 * Pure, so the thresholds are testable without a database.
 */

export interface DriftTask {
  /** ISO date the task was scheduled for. */
  date: string;
  estMinutes: number;
  done: boolean;
}

export type DriftStatus = "behind" | "ahead" | "on_track";

export interface DriftAssessment {
  /** Minutes of work scheduled in the past and never completed. */
  backlogMinutes: number;
  /** Minutes of future work already completed. */
  aheadMinutes: number;
  /** Positive = behind, negative = ahead, expressed in study days. */
  netDays: number;
  status: DriftStatus;
  shouldReplan: boolean;
  reason: string;
}

/** Replan once drift exceeds this many study days in either direction. */
export const REPLAN_THRESHOLD_DAYS = 1.5;

/**
 * Assess drift against the plan.
 *
 * Backlog is counted from *past-dated incomplete* tasks rather than from a
 * completion percentage, because the latter flatters a plan you have simply
 * stopped opening: no attempts means no data, not perfect adherence.
 */
export function assessDrift(
  tasks: DriftTask[],
  todayIso: string,
  avgDailyMinutes: number,
): DriftAssessment {
  const today = todayIso.slice(0, 10);
  const perDay = Math.max(1, avgDailyMinutes);

  let backlogMinutes = 0;
  let aheadMinutes = 0;

  for (const t of tasks) {
    const date = t.date.slice(0, 10);
    const minutes = Math.max(0, t.estMinutes || 0);
    if (date < today && !t.done) backlogMinutes += minutes;
    else if (date > today && t.done) aheadMinutes += minutes;
  }

  const netMinutes = backlogMinutes - aheadMinutes;
  const netDays = netMinutes / perDay;

  let status: DriftStatus = "on_track";
  if (netDays >= REPLAN_THRESHOLD_DAYS) status = "behind";
  else if (netDays <= -REPLAN_THRESHOLD_DAYS) status = "ahead";

  const shouldReplan = status !== "on_track";

  let reason: string;
  if (status === "behind") {
    reason =
      `${Math.round(backlogMinutes)} minutes of scheduled work went undone — ` +
      `about ${netDays.toFixed(1)} study days behind. Replanning redistributes it rather than ` +
      `leaving a backlog you will never clear.`;
  } else if (status === "ahead") {
    reason =
      `${Math.round(aheadMinutes)} minutes of future work is already done — ` +
      `about ${Math.abs(netDays).toFixed(1)} study days ahead. Replanning pulls later work forward.`;
  } else if (backlogMinutes === 0 && aheadMinutes === 0) {
    reason = "Plan and reality agree.";
  } else {
    reason = `Within ${REPLAN_THRESHOLD_DAYS} study days of plan — no replan needed yet.`;
  }

  return { backlogMinutes, aheadMinutes, netDays, status, shouldReplan, reason };
}

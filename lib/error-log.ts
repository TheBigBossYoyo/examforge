/**
 * Error-log root causes and the "what should I drill next" decision.
 *
 * Two ideas here, both deliberately pure so they can be tested:
 *
 *  1. Root-cause triage. The previous behaviour guessed a cause from the
 *     confidence button alone and wrote it to the database as though it were
 *     fact. A guess and a judgement are different things, so this module only
 *     ever *suggests*, and the suggestion carries its reasoning; `triaged`
 *     records whether a human actually confirmed it.
 *
 *  2. Next best action. Ranking by raw mistake count sends you to whatever
 *     topic you have simply attempted most. What matters is density (share of
 *     attempts that went wrong) weighted by recency, since a gap from
 *     yesterday is live and one from six weeks ago may already be closed.
 */

/** The four causes that call for genuinely different responses. */
export const ROOT_CAUSES = ["concept_gap", "careless", "timing", "misread"] as const;
export type RootCause = (typeof ROOT_CAUSES)[number];

export const ROOT_CAUSE_LABELS: Record<RootCause, string> = {
  concept_gap: "Concept gap",
  careless: "Careless error",
  timing: "Timing pressure",
  misread: "Misread the question",
};

export const ROOT_CAUSE_ACTIONS: Record<RootCause, string> = {
  concept_gap: "Study the method, then drill the topic untimed before adding a clock.",
  careless: "The method is there. Drill accuracy under time, and check your working habits.",
  timing: "Practise the topic against a per-question budget; the knowledge is not the problem.",
  misread: "Slow the read. Underline what is actually being asked before solving.",
};

export interface TriageSignal {
  secondsSpent: number;
  /** Seconds this question was budgeted (section pace). */
  paceBudget: number;
  confidence?: "guessed" | "unsure" | "confident" | null;
  /** Did the student cross out choices before answering? */
  usedEliminator?: boolean;
}

export interface Suggestion {
  cause: RootCause;
  /** Why this was suggested, shown to the student so they can overrule it. */
  reason: string;
  /** 0..1. Low confidence means "we really are guessing". */
  confidence: number;
}

/**
 * Suggest a root cause from timing and confidence.
 *
 * Ordering matters: answering confidently and wrongly is the strongest signal
 * available (a genuine misconception rather than a slip), so it is checked
 * before the timing heuristics.
 */
export function suggestRootCause(signal: TriageSignal): Suggestion {
  const { secondsSpent, paceBudget, confidence } = signal;
  const budget = paceBudget > 0 ? paceBudget : 90;
  const ratio = secondsSpent / budget;

  if (confidence === "confident") {
    return {
      cause: "concept_gap",
      reason: "You were confident and still got it wrong — that usually means the method itself is off, not a slip.",
      confidence: 0.75,
    };
  }

  if (ratio >= 2) {
    return {
      cause: "timing",
      reason: `You spent ${Math.round(secondsSpent)}s against a ${Math.round(budget)}s budget. Running that far over is its own problem.`,
      confidence: 0.7,
    };
  }

  if (ratio <= 0.4 && confidence !== "guessed") {
    return {
      cause: "misread",
      reason: `Answered in ${Math.round(secondsSpent)}s against a ${Math.round(budget)}s budget — fast enough that the question was probably not fully read.`,
      confidence: 0.6,
    };
  }

  if (confidence === "guessed") {
    return {
      cause: "concept_gap",
      reason: "You marked this a guess, which points at missing content rather than a slip.",
      confidence: 0.65,
    };
  }

  return {
    cause: "careless",
    reason: "Normal pace and no strong signal either way — most often an execution slip.",
    confidence: 0.35,
  };
}

/* ------------------------------------------------------------------ *
 * Next best action
 * ------------------------------------------------------------------ */

export interface TopicSignal {
  topicId: number;
  area: string;
  subtopic: string;
  attempts: number;
  /** Unresolved mistakes, most recent first, as ISO dates. */
  mistakeDates: string[];
  /** 0..100 */
  mastery: number;
}

export interface Recommendation {
  topicId: number;
  area: string;
  subtopic: string;
  /** Higher is more urgent. */
  score: number;
  errorDensity: number;
  recencyWeight: number;
  reason: string;
}

/** A mistake's weight decays by half every 14 days. */
export function recencyWeight(dateIso: string, nowIso: string, halfLifeDays = 14): number {
  const then = new Date(`${dateIso.slice(0, 10)}T00:00:00`).getTime();
  const now = new Date(`${nowIso.slice(0, 10)}T00:00:00`).getTime();
  if (!Number.isFinite(then) || !Number.isFinite(now)) return 0;
  const days = Math.max(0, (now - then) / 86_400_000);
  return 0.5 ** (days / halfLifeDays);
}

/**
 * Rank topics by how much drilling them now would help.
 *
 * score = errorDensity × recencyWeight × confidenceInSignal
 *
 * Density rather than count, so a topic attempted 40 times with 8 errors does
 * not outrank one attempted 10 times with 6. Recency-weighted, so stale gaps
 * fade. And scaled by how much evidence exists, so a single bad question does
 * not send you drilling a topic you may be fine at.
 */
export function rankNextActions(
  topics: TopicSignal[],
  nowIso: string,
  limit = 5,
): Recommendation[] {
  const scored = topics.map((t): Recommendation => {
    const attempts = Math.max(1, t.attempts);
    const weights = t.mistakeDates.map((d) => recencyWeight(d, nowIso));
    const weighted = weights.reduce((s, w) => s + w, 0);

    const errorDensity = Math.min(1, t.mistakeDates.length / attempts);
    const recency = t.mistakeDates.length > 0 ? weighted / t.mistakeDates.length : 0;

    // Evidence scaling: one mistake out of one attempt is 100% density but
    // almost no information. Approaches 1 as attempts accumulate.
    const evidence = Math.min(1, t.attempts / 8);

    const score = errorDensity * recency * evidence;

    let reason: string;
    if (t.mistakeDates.length === 0) {
      reason = t.attempts === 0 ? "Never practised." : "No unresolved mistakes here.";
    } else if (recency > 0.8) {
      reason = `${t.mistakeDates.length} unresolved, most of them recent — this gap is live.`;
    } else if (recency < 0.35) {
      reason = `${t.mistakeDates.length} unresolved but mostly old; may already be closed.`;
    } else {
      reason = `${t.mistakeDates.length} unresolved out of ${t.attempts} attempts.`;
    }

    return {
      topicId: t.topicId,
      area: t.area,
      subtopic: t.subtopic,
      score,
      errorDensity,
      recencyWeight: recency,
      reason,
    };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.subtopic.localeCompare(b.subtopic))
    .slice(0, Math.max(0, limit));
}

/**
 * Topics never practised at all, which no error-based ranking can surface
 * because they have generated no errors yet. Coverage gaps and weakness gaps
 * are different problems and are reported separately.
 */
export function unpractisedTopics(topics: TopicSignal[], limit = 5): TopicSignal[] {
  return topics.filter((t) => t.attempts === 0).slice(0, Math.max(0, limit));
}

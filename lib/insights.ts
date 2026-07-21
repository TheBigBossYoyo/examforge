/**
 * Database layer feeding the pure decision logic in lib/error-log.ts, plus
 * pacing analytics that only became possible once attempts carried a module.
 */
import { execute, query, queryOne } from "./db";
import { getExamFormat, getSectionFormat } from "./exam-format";
import {
  rankNextActions,
  suggestRootCause,
  unpractisedTopics,
  type Recommendation,
  type RootCause,
  type TopicSignal,
} from "./error-log";
import { todayIso } from "./format";
import type { ExamName } from "./types";

/* ------------------------------------------------------------------ *
 * Next best action
 * ------------------------------------------------------------------ */

export function getTopicSignals(examId: number): TopicSignal[] {
  const topics = query<{
    topic_id: number;
    area: string;
    subtopic: string;
    attempts: number;
    mastery: number;
  }>(
    `SELECT t.id AS topic_id, t.area, t.subtopic,
            COALESCE(p.attempts_count, 0) AS attempts,
            COALESCE(p.mastery, 0) AS mastery
       FROM topics t
       LEFT JOIN progress p ON p.topic_id = t.id AND p.exam_id = t.exam_id
      WHERE t.exam_id = ?
      ORDER BY t.area, t.id`,
    [examId],
  );

  const mistakes = query<{ topic_id: number; created_at: string }>(
    `SELECT m.topic_id, m.created_at
       FROM mistakes m
       JOIN questions q ON q.id = m.question_id
      WHERE q.exam_id = ? AND m.resolved = 0 AND m.topic_id IS NOT NULL
      ORDER BY m.created_at DESC`,
    [examId],
  );

  const byTopic = new Map<number, string[]>();
  for (const m of mistakes) {
    const list = byTopic.get(m.topic_id);
    if (list) list.push(m.created_at);
    else byTopic.set(m.topic_id, [m.created_at]);
  }

  return topics.map((t) => ({
    topicId: t.topic_id,
    area: t.area,
    subtopic: t.subtopic,
    attempts: t.attempts,
    mastery: t.mastery,
    mistakeDates: byTopic.get(t.topic_id) ?? [],
  }));
}

export interface NextActions {
  drill: Recommendation[];
  /** Topics never attempted — invisible to error-based ranking. */
  uncovered: { topicId: number; area: string; subtopic: string }[];
}

export function getNextActions(examId: number, limit = 5): NextActions {
  const signals = getTopicSignals(examId);
  return {
    drill: rankNextActions(signals, todayIso(), limit),
    uncovered: unpractisedTopics(signals, limit).map((t) => ({
      topicId: t.topicId,
      area: t.area,
      subtopic: t.subtopic,
    })),
  };
}

/* ------------------------------------------------------------------ *
 * Root-cause triage
 * ------------------------------------------------------------------ */

export interface UntriagedMistake {
  id: number;
  question_id: number;
  prompt_md: string;
  area: string | null;
  subtopic: string | null;
  error_type: string;
  root_cause: string | null;
  seconds_spent: number;
  confidence: "guessed" | "unsure" | "confident" | null;
  created_at: string;
}

/** Mistakes the student has not yet given a reason for. */
export function getUntriagedMistakes(examId?: number, limit = 30): UntriagedMistake[] {
  const where = ["m.resolved = 0", "m.triaged = 0"];
  const params: unknown[] = [];
  if (examId) {
    where.push("q.exam_id = ?");
    params.push(examId);
  }
  params.push(Math.max(1, limit));

  return query<UntriagedMistake>(
    `SELECT m.id, m.question_id, q.prompt_md, t.area, t.subtopic,
            m.error_type, m.root_cause, m.created_at,
            COALESCE(r.seconds_spent, 0) AS seconds_spent,
            r.confidence
       FROM mistakes m
       JOIN questions q ON q.id = m.question_id
       LEFT JOIN topics t ON t.id = q.topic_id
       LEFT JOIN responses r ON r.id = m.response_id
      WHERE ${where.join(" AND ")}
      ORDER BY m.created_at DESC
      LIMIT ?`,
    params,
  );
}

/** Seconds budgeted per question for a section, from the exam format. */
export function paceBudgetFor(examName: ExamName, area: string | null): number {
  const section = area ? getSectionFormat(examName, area) : undefined;
  if (!section) {
    const first = getExamFormat(examName).sections[0];
    const m = first.modules[0];
    return (m.minutes * 60) / m.questionCount;
  }
  const m = section.modules[0];
  return (m.minutes * 60) / m.questionCount;
}

/** Suggest a cause for a mistake, without writing it as though confirmed. */
export function suggestForMistake(
  m: Pick<UntriagedMistake, "seconds_spent" | "confidence" | "area">,
  examName: ExamName,
) {
  return suggestRootCause({
    secondsSpent: m.seconds_spent,
    paceBudget: paceBudgetFor(examName, m.area),
    confidence: m.confidence,
  });
}

/** Record the student's judgement. This is the only path that sets triaged. */
export function triageMistake(mistakeId: number, rootCause: RootCause, note?: string): void {
  execute(
    `UPDATE mistakes SET root_cause = ?, triaged = 1${note !== undefined ? ", note_md = ?" : ""} WHERE id = ?`,
    note !== undefined ? [rootCause, note, mistakeId] : [rootCause, mistakeId],
  );
}

export interface RootCauseCount {
  root_cause: string;
  count: number;
  triaged: number;
}

/** Distribution of root causes, keeping confirmed and guessed separate. */
export function rootCauseBreakdown(examId: number): RootCauseCount[] {
  return query<RootCauseCount>(
    `SELECT COALESCE(m.root_cause, 'untriaged') AS root_cause,
            COUNT(*) AS count,
            SUM(m.triaged) AS triaged
       FROM mistakes m
       JOIN questions q ON q.id = m.question_id
      WHERE q.exam_id = ?
      GROUP BY COALESCE(m.root_cause, 'untriaged')
      ORDER BY count DESC`,
    [examId],
  );
}

/* ------------------------------------------------------------------ *
 * Pacing
 * ------------------------------------------------------------------ */

export interface QuestionPacing {
  area: string;
  avg_seconds: number;
  budget_seconds: number;
  over_budget_share: number; // 0..1 of questions that ran over
  accuracy_when_over: number;
  accuracy_when_under: number;
}

/**
 * Time per question against its budget, split by whether the question ran over.
 *
 * The accuracy split is the interesting part: if accuracy is similar either
 * side, spending the extra time is buying nothing and the fix is to move on
 * faster. If it collapses when over budget, the slow questions are the ones
 * you do not know — a content problem wearing a timing costume.
 */
export function questionPacing(examId: number, examName: ExamName): QuestionPacing[] {
  const rows = query<{
    area: string;
    avg_seconds: number;
    total: number;
    over: number;
    correct_over: number;
    correct_under: number;
  }>(
    `SELECT t.area,
            AVG(r.seconds_spent) AS avg_seconds,
            COUNT(*) AS total,
            0 AS over, 0 AS correct_over, 0 AS correct_under
       FROM responses r
       JOIN questions q ON q.id = r.question_id
       JOIN topics t ON t.id = q.topic_id
      WHERE q.exam_id = ? AND r.is_correct IS NOT NULL
      GROUP BY t.area`,
    [examId],
  );

  return rows.map((row) => {
    const budget = paceBudgetFor(examName, row.area);
    const split = queryOne<{
      over: number;
      correct_over: number;
      under: number;
      correct_under: number;
    }>(
      `SELECT
         SUM(CASE WHEN r.seconds_spent >  ? THEN 1 ELSE 0 END) AS over,
         SUM(CASE WHEN r.seconds_spent >  ? AND r.is_correct = 1 THEN 1 ELSE 0 END) AS correct_over,
         SUM(CASE WHEN r.seconds_spent <= ? THEN 1 ELSE 0 END) AS under,
         SUM(CASE WHEN r.seconds_spent <= ? AND r.is_correct = 1 THEN 1 ELSE 0 END) AS correct_under
       FROM responses r
       JOIN questions q ON q.id = r.question_id
       JOIN topics t ON t.id = q.topic_id
      WHERE q.exam_id = ? AND t.area = ? AND r.is_correct IS NOT NULL`,
      [budget, budget, budget, budget, examId, row.area],
    );

    const over = split?.over ?? 0;
    const under = split?.under ?? 0;
    return {
      area: row.area,
      avg_seconds: Math.round(row.avg_seconds),
      budget_seconds: Math.round(budget),
      over_budget_share: row.total > 0 ? over / row.total : 0,
      accuracy_when_over: over > 0 ? (split?.correct_over ?? 0) / over : 0,
      accuracy_when_under: under > 0 ? (split?.correct_under ?? 0) / under : 0,
    };
  });
}

export interface ModulePacing {
  session_id: number;
  section: string;
  module_number: number;
  module_difficulty: string | null;
  seconds_total: number;
  limit_seconds: number;
  raw_score: number;
  questions: number;
  started_at: string;
}

/** Time used per module against its real limit — only meaningful post-Phase 1. */
export function modulePacing(examId: number, examName: ExamName, limit = 20): ModulePacing[] {
  const rows = query<{
    session_id: number;
    section: string;
    module_number: number;
    module_difficulty: string | null;
    seconds_total: number;
    raw_score: number;
    questions: number;
    started_at: string;
  }>(
    `SELECT a.session_id, a.section, a.module_number, a.module_difficulty,
            COALESCE(a.seconds_total, 0) AS seconds_total,
            COALESCE(a.raw_score, 0) AS raw_score,
            (SELECT COUNT(*) FROM responses r WHERE r.attempt_id = a.id) AS questions,
            a.started_at
       FROM attempts a
      WHERE a.exam_id = ? AND a.session_id IS NOT NULL AND a.finished_at IS NOT NULL
      ORDER BY a.started_at DESC, a.module_number
      LIMIT ?`,
    [examId, Math.max(1, limit)],
  );

  return rows.map((r) => {
    const section = getSectionFormat(examName, r.section);
    const mod = section?.modules.find((m) => m.number === r.module_number) ?? section?.modules[0];
    return { ...r, limit_seconds: mod ? mod.minutes * 60 : 0 };
  });
}

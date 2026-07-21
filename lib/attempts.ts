// Server-side attempt lifecycle: marking, scoring, progress + mistake updates.
import { execute, queryOne, query, transaction } from "./db";
import { getExamById, getQuestion } from "./queries";
import {
  tmuaPaperBand,
  satSectionFromAccuracy,
  DEFAULT_SAT_MATH,
  DEFAULT_SAT_RW,
  type SatSectionConfig,
} from "./scoring";
import type { AttemptMode, Confidence } from "./types";

export interface SubmittedResponse {
  questionId: number;
  givenAnswer: string | null;
  secondsSpent: number;
  hintsUsed: number;
  confidence?: Confidence | null;
}

export interface SubmitAttemptInput {
  examId: number;
  paperId?: number | null;
  mode: AttemptMode;
  startedAtIso?: string;
  secondsTotal: number;
  responses: SubmittedResponse[];
  /** if true (default) auto-create mistake rows for wrong answers */
  autoLogMistakes?: boolean;
}

export interface SubmitAttemptResult {
  attemptId: number;
  rawScore: number;
  total: number;
  scaledScore: number | null;
  scaledLabel: string;
}

/** Normalise an answer string for tolerant comparison. */
function normAnswer(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[$\\]/g, "")
    .replace(/[.,](?=$)/, "");
}

export function isAnswerCorrect(given: string | null, correct: string): boolean {
  if (given == null) return false;
  const g = normAnswer(given);
  const c = normAnswer(correct);
  if (g === c) return true;
  // numeric tolerance
  const gn = Number(g.replace(/[^0-9.\-]/g, ""));
  const cn = Number(c.replace(/[^0-9.\-]/g, ""));
  if (!Number.isNaN(gn) && !Number.isNaN(cn) && g !== "" && c !== "") {
    return Math.abs(gn - cn) < 1e-6;
  }
  return false;
}

/** Default error_type heuristic from confidence + exam, for auto-logged mistakes. */
function defaultErrorType(examName: string, confidence: Confidence | null | undefined): string {
  if (examName === "TMUA") {
    if (confidence === "confident") return "conceptual_gap";
    if (confidence === "guessed") return "misread";
    return "algebra_mistake";
  }
  // SAT
  if (confidence === "confident") return "content_gap";
  if (confidence === "guessed") return "poor_elimination";
  return "misread";
}

function loadSatConfig(): { math: SatSectionConfig; rw: SatSectionConfig } {
  const parse = (key: string, fb: SatSectionConfig): SatSectionConfig => {
    const row = queryOne<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
    try {
      return row?.value ? (JSON.parse(row.value) as SatSectionConfig) : fb;
    } catch {
      return fb;
    }
  };
  return {
    math: parse("sat_math_config", DEFAULT_SAT_MATH),
    rw: parse("sat_rw_config", DEFAULT_SAT_RW),
  };
}

/** Recompute a topic's progress row from all responses to that topic. */
export function recomputeTopicProgress(examId: number, topicId: number): void {
  const row = queryOne<{ total: number; correct: number; secs: number }>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN r.is_correct = 1 THEN 1 ELSE 0 END) AS correct,
            COALESCE(SUM(r.seconds_spent),0) AS secs
     FROM responses r JOIN questions q ON q.id = r.question_id
     WHERE q.exam_id = ? AND q.topic_id = ? AND r.is_correct IS NOT NULL`,
    [examId, topicId],
  );
  const total = row?.total ?? 0;
  if (total === 0) return;
  const correct = row?.correct ?? 0;
  const accuracy = correct / total;
  const avgSeconds = (row?.secs ?? 0) / total;
  // Mastery: accuracy weighted by exposure (a few attempts shouldn't claim 100%).
  const exposure = Math.min(1, total / 8);
  const mastery = Math.round(accuracy * 100 * (0.55 + 0.45 * exposure));

  execute(
    `INSERT INTO progress (exam_id, topic_id, accuracy, avg_seconds, attempts_count, last_practiced, mastery)
     VALUES (?,?,?,?,?,datetime('now'),?)
     ON CONFLICT(exam_id, topic_id) DO UPDATE SET
       accuracy = excluded.accuracy,
       avg_seconds = excluded.avg_seconds,
       attempts_count = excluded.attempts_count,
       last_practiced = excluded.last_practiced,
       mastery = excluded.mastery`,
    [examId, topicId, accuracy, avgSeconds, total, mastery],
  );
}

export function submitAttempt(input: SubmitAttemptInput): SubmitAttemptResult {
  const exam = getExamById(input.examId);
  if (!exam) throw new Error("Unknown exam");
  const autoLog = input.autoLogMistakes !== false;

  return transaction(() => {
    const attemptId = execute(
      `INSERT INTO attempts (paper_id, exam_id, started_at, finished_at, mode, seconds_total)
       VALUES (?,?,?,datetime('now'),?,?)`,
      [
        input.paperId ?? null,
        input.examId,
        input.startedAtIso ?? new Date().toISOString(),
        input.mode,
        Math.round(input.secondsTotal),
      ],
    ).lastInsertRowid;

    const touchedTopics = new Set<number>();
    let correctCount = 0;

    for (const r of input.responses) {
      const q = getQuestion(r.questionId);
      if (!q) continue;
      const correct = r.givenAnswer != null ? isAnswerCorrect(r.givenAnswer, q.correct_answer) : null;
      if (correct) correctCount++;

      const responseId = execute(
        `INSERT INTO responses (attempt_id, question_id, given_answer, is_correct, seconds_spent, hints_used, confidence)
         VALUES (?,?,?,?,?,?,?)`,
        [
          attemptId,
          r.questionId,
          r.givenAnswer ?? null,
          correct === null ? null : correct ? 1 : 0,
          Math.round(r.secondsSpent || 0),
          r.hintsUsed || 0,
          r.confidence ?? null,
        ],
      ).lastInsertRowid;

      if (q.topic_id) touchedTopics.add(q.topic_id);

      // Auto-log a mistake row for wrong (or wrong-but-confident) answers.
      if (autoLog && correct === false) {
        execute(
          `INSERT INTO mistakes (response_id, question_id, topic_id, error_type, note_md, resolved)
           VALUES (?,?,?,?,?,0)`,
          [
            responseId,
            r.questionId,
            q.topic_id ?? null,
            defaultErrorType(exam.name, r.confidence),
            r.confidence === "confident"
              ? "Auto-logged: answered confidently but incorrectly — likely a genuine gap."
              : null,
          ],
        );
      }
    }

    for (const topicId of touchedTopics) recomputeTopicProgress(input.examId, topicId);

    // ---- Scoring ----
    const total = input.responses.length;
    let scaledScore: number | null = null;
    let scaledLabel = "—";

    if (exam.name === "TMUA") {
      // Scale raw to a /20-equivalent then band it.
      const rawOutOf20 = total > 0 ? Math.round((correctCount / total) * 20) : 0;
      const band = tmuaPaperBand(rawOutOf20);
      scaledScore = band;
      scaledLabel = `${band.toFixed(1)} / 9.0 (estimate)`;
    } else {
      const cfg = loadSatConfig();
      // Decide section by the questions' area (Math vs RW); default Math.
      const area = queryOne<{ area: string }>(
        `SELECT t.area AS area FROM responses r
         JOIN questions q ON q.id = r.question_id
         JOIN topics t ON t.id = q.topic_id
         WHERE r.attempt_id = ? GROUP BY t.area ORDER BY COUNT(*) DESC LIMIT 1`,
        [attemptId],
      )?.area;
      const acc = total > 0 ? correctCount / total : 0;
      const section = area === "RW" ? cfg.rw : cfg.math;
      const res = satSectionFromAccuracy(section, acc);
      scaledScore = res.scaled;
      scaledLabel = `${res.scaled} / 800 ${area === "RW" ? "(R&W)" : "(Math)"} estimate`;
    }

    execute("UPDATE attempts SET raw_score = ?, scaled_score = ? WHERE id = ?", [
      correctCount,
      scaledScore,
      attemptId,
    ]);

    return { attemptId, rawScore: correctCount, total, scaledScore, scaledLabel };
  });
}

/**
 * Record a self-marked official-paper score. We never store the copyrighted
 * questions — the student sits the official PDF, then enters their raw mark
 * (0..maxRaw) which we band into an estimate and log as an attempt.
 */
export interface ManualScoreInput {
  examId: number;
  paperId?: number | null;
  rawScore: number;
  maxRaw: number; // e.g. 20 for a TMUA paper
  secondsTotal?: number;
}

export function recordManualScore(input: ManualScoreInput): SubmitAttemptResult {
  const exam = getExamById(input.examId);
  if (!exam) throw new Error("Unknown exam");
  const raw = Math.max(0, Math.min(input.maxRaw, Math.round(input.rawScore)));

  let scaledScore: number | null = null;
  let scaledLabel = "—";
  if (exam.name === "TMUA") {
    const rawOutOf20 = Math.round((raw / input.maxRaw) * 20);
    const band = tmuaPaperBand(rawOutOf20);
    scaledScore = band;
    scaledLabel = `${band.toFixed(1)} / 9.0 (estimate)`;
  } else {
    const cfg = loadSatConfig();
    const acc = input.maxRaw > 0 ? raw / input.maxRaw : 0;
    const res = satSectionFromAccuracy(cfg.math, acc);
    scaledScore = res.scaled;
    scaledLabel = `${res.scaled} / 800 (estimate)`;
  }

  const attemptId = execute(
    `INSERT INTO attempts (paper_id, exam_id, started_at, finished_at, mode, raw_score, scaled_score, seconds_total)
     VALUES (?,?,datetime('now'),datetime('now'),'exam',?,?,?)`,
    [input.paperId ?? null, input.examId, raw, scaledScore, input.secondsTotal ?? null],
  ).lastInsertRowid as number;

  return { attemptId, rawScore: raw, total: input.maxRaw, scaledScore, scaledLabel };
}

export interface ReviewResponse {
  id: number;
  question_id: number;
  given_answer: string | null;
  is_correct: number | null;
  seconds_spent: number;
  hints_used: number;
  confidence: Confidence | null;
}

export function getAttemptResponses(attemptId: number): ReviewResponse[] {
  return query<ReviewResponse>(
    "SELECT id, question_id, given_answer, is_correct, seconds_spent, hints_used, confidence FROM responses WHERE attempt_id = ? ORDER BY id",
    [attemptId],
  );
}

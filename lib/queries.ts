// Server-only data access. Importing node:sqlite (via ./db) keeps this off the client.
import { query, queryOne, execute } from "./db";
import type {
  Exam,
  ExamName,
  Topic,
  Paper,
  Question,
  QuestionView,
  Resource,
  Mistake,
  Progress,
  Attempt,
  StudyPlanItem,
} from "./types";
import { toQuestionView } from "./types";
import {
  tmuaPaperBand,
  tmuaOverall,
  satSectionFromAccuracy,
  satTotal,
  DEFAULT_SAT_MATH,
  DEFAULT_SAT_RW,
  type SatSectionConfig,
} from "./scoring";

/* ----------------------------- Settings ----------------------------- */

export function getSettings(): Record<string, string> {
  const rows = query<{ key: string; value: string }>("SELECT key, value FROM settings");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function getSetting(key: string, fallback = ""): string {
  const row = queryOne<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value ?? fallback;
}

export function setSetting(key: string, value: string): void {
  execute(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

/* ------------------------------- Exams ------------------------------ */

export function getExams(): Exam[] {
  return query<Exam>("SELECT * FROM exams ORDER BY name DESC");
}

export function getExam(name: ExamName): Exam | undefined {
  return queryOne<Exam>("SELECT * FROM exams WHERE name = ?", [name]);
}

export function getExamById(id: number): Exam | undefined {
  return queryOne<Exam>("SELECT * FROM exams WHERE id = ?", [id]);
}

/** Effective exam date — settings override takes precedence over the row. */
export function effectiveExamDate(exam: Exam): string {
  const key = exam.name === "TMUA" ? "tmua_exam_date" : "sat_exam_date";
  return getSetting(key, exam.exam_date);
}

/* ------------------------------ Topics ------------------------------ */

export function getTopics(examId: number, area?: string): Topic[] {
  if (area) {
    return query<Topic>(
      "SELECT * FROM topics WHERE exam_id = ? AND area = ? ORDER BY id",
      [examId, area],
    );
  }
  return query<Topic>("SELECT * FROM topics WHERE exam_id = ? ORDER BY area, id", [examId]);
}

export function getTopic(id: number): Topic | undefined {
  return queryOne<Topic>("SELECT * FROM topics WHERE id = ?", [id]);
}

export function getAreas(examId: number): string[] {
  const rows = query<{ area: string }>(
    "SELECT DISTINCT area FROM topics WHERE exam_id = ? ORDER BY area",
    [examId],
  );
  return rows.map((r) => r.area);
}

/* ------------------------------ Papers ------------------------------ */

export function getPapers(examId: number): Paper[] {
  return query<Paper>(
    "SELECT * FROM papers WHERE exam_id = ? ORDER BY year DESC, title",
    [examId],
  );
}

export function getPaper(id: number): Paper | undefined {
  return queryOne<Paper>("SELECT * FROM papers WHERE id = ?", [id]);
}

/* ----------------------------- Questions ---------------------------- */

export interface QuestionFilter {
  examId?: number;
  topicId?: number;
  area?: string;
  difficulty?: string;
  desmosOnly?: boolean;
  limit?: number;
  randomize?: boolean;
}

export function getQuestions(filter: QuestionFilter = {}): QuestionView[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.examId) {
    where.push("q.exam_id = ?");
    params.push(filter.examId);
  }
  if (filter.topicId) {
    where.push("q.topic_id = ?");
    params.push(filter.topicId);
  }
  if (filter.area) {
    where.push("t.area = ?");
    params.push(filter.area);
  }
  if (filter.difficulty) {
    where.push("q.difficulty = ?");
    params.push(filter.difficulty);
  }
  if (filter.desmosOnly) {
    where.push("q.desmos_recommended = 1");
  }
  const order = filter.randomize ? "RANDOM()" : "q.id";
  const limit = filter.limit ? `LIMIT ${Math.max(1, Math.floor(filter.limit))}` : "";
  const sql = `
    SELECT q.*, t.area AS topic_area, t.subtopic AS topic_subtopic
    FROM questions q
    LEFT JOIN topics t ON t.id = q.topic_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY ${order}
    ${limit}`;
  const rows = query<Question & { topic_area?: string; topic_subtopic?: string }>(sql, params);
  return rows.map(toQuestionView);
}

export function getQuestion(id: number): QuestionView | undefined {
  const row = queryOne<Question & { topic_area?: string; topic_subtopic?: string }>(
    `SELECT q.*, t.area AS topic_area, t.subtopic AS topic_subtopic
     FROM questions q LEFT JOIN topics t ON t.id = q.topic_id WHERE q.id = ?`,
    [id],
  );
  return row ? toQuestionView(row) : undefined;
}

export function countQuestions(examId: number): number {
  const row = queryOne<{ n: number }>(
    "SELECT COUNT(*) AS n FROM questions WHERE exam_id = ?",
    [examId],
  );
  return row?.n ?? 0;
}

/* ----------------------------- Resources ---------------------------- */

export function getResources(examId?: number): Resource[] {
  if (examId) {
    return query<Resource>(
      "SELECT * FROM resources WHERE exam_id = ? ORDER BY relevance DESC, type, title",
      [examId],
    );
  }
  return query<Resource>("SELECT * FROM resources ORDER BY exam_id, relevance DESC, type");
}

/* ------------------------------ Progress ---------------------------- */

export interface TopicProgress extends Progress {
  area: string;
  subtopic: string;
}

export function getTopicProgress(examId: number): TopicProgress[] {
  return query<TopicProgress>(
    `SELECT p.*, t.area, t.subtopic
     FROM progress p JOIN topics t ON t.id = p.topic_id
     WHERE p.exam_id = ? ORDER BY t.area, t.id`,
    [examId],
  );
}

/** Map of topic_id -> progress, defaulting missing topics to mastery 0. */
export function getProgressMap(examId: number): Map<number, TopicProgress> {
  const rows = getTopicProgress(examId);
  return new Map(rows.map((r) => [r.topic_id, r]));
}

/* ------------------------------ Mistakes ---------------------------- */

export interface MistakeView extends Mistake {
  prompt_md: string;
  solution_md: string | null;
  correct_answer: string;
  area: string | null;
  subtopic: string | null;
  exam_id: number;
}

export function getMistakes(filter: {
  examId?: number;
  resolved?: boolean;
  topicId?: number;
  errorType?: string;
  limit?: number;
} = {}): MistakeView[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.examId) {
    where.push("q.exam_id = ?");
    params.push(filter.examId);
  }
  if (filter.resolved !== undefined) {
    where.push("m.resolved = ?");
    params.push(filter.resolved ? 1 : 0);
  }
  if (filter.topicId) {
    where.push("m.topic_id = ?");
    params.push(filter.topicId);
  }
  if (filter.errorType) {
    where.push("m.error_type = ?");
    params.push(filter.errorType);
  }
  const limit = filter.limit ? `LIMIT ${Math.max(1, Math.floor(filter.limit))}` : "";
  const sql = `
    SELECT m.*, q.prompt_md, q.solution_md, q.correct_answer, q.exam_id,
           t.area, t.subtopic
    FROM mistakes m
    JOIN questions q ON q.id = m.question_id
    LEFT JOIN topics t ON t.id = m.topic_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY m.created_at DESC
    ${limit}`;
  return query<MistakeView>(sql, params);
}

/* ------------------------------ Attempts ---------------------------- */

export function getRecentAttempts(examId: number, limit = 10): Attempt[] {
  return query<Attempt>(
    "SELECT * FROM attempts WHERE exam_id = ? AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT ?",
    [examId, limit],
  );
}

export function getAttempt(id: number): Attempt | undefined {
  return queryOne<Attempt>("SELECT * FROM attempts WHERE id = ?", [id]);
}

/* ------------------------- Accuracy / analytics --------------------- */

export interface OverallAccuracy {
  total: number;
  correct: number;
  accuracy: number; // 0..1
  avgSeconds: number;
}

export function getOverallAccuracy(examId: number, area?: string): OverallAccuracy {
  const params: unknown[] = [examId];
  let areaClause = "";
  if (area) {
    areaClause = "AND t.area = ?";
    params.push(area);
  }
  const row = queryOne<{ total: number; correct: number; secs: number }>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN r.is_correct = 1 THEN 1 ELSE 0 END) AS correct,
            COALESCE(SUM(r.seconds_spent), 0) AS secs
     FROM responses r
     JOIN questions q ON q.id = r.question_id
     LEFT JOIN topics t ON t.id = q.topic_id
     WHERE q.exam_id = ? ${areaClause} AND r.is_correct IS NOT NULL`,
    params,
  );
  const total = row?.total ?? 0;
  const correct = row?.correct ?? 0;
  return {
    total,
    correct,
    accuracy: total > 0 ? correct / total : 0,
    avgSeconds: total > 0 ? (row?.secs ?? 0) / total : 0,
  };
}

/* ------------------------- Dashboard projection --------------------- */

export interface ExamDashboard {
  exam: Exam;
  examDate: string;
  papersCompleted: number;
  avgScoreLabel: string;
  strongest: TopicProgress[];
  weakest: TopicProgress[];
  recentMistakes: MistakeView[];
  projectedLabel: string;
  projectedFraction: number; // 0..1 toward target (for the ring)
  streakDays: number;
  recommendation: Recommendation;
  prioritise?: string;
}

export interface Recommendation {
  title: string;
  detail: string;
  href: string;
  cta: string;
  type: string;
}

function getStreak(): number {
  // Count consecutive days (including today) with at least one finished attempt or response.
  const rows = query<{ d: string }>(
    `SELECT DISTINCT date(started_at) AS d FROM attempts
     UNION SELECT DISTINCT date(created_at) AS d FROM mistakes
     ORDER BY d DESC`,
  );
  const days = new Set(rows.map((r) => r.d));
  let streak = 0;
  const cursor = new Date();
  // allow today to be missing without breaking (grace), then count backwards
  for (let i = 0; i < 365; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    if (days.has(iso)) {
      streak++;
    } else if (i === 0) {
      // today not yet practised — don't break, check yesterday
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function satConfig(): { math: SatSectionConfig; rw: SatSectionConfig } {
  const parse = (key: string, fallback: SatSectionConfig): SatSectionConfig => {
    try {
      const raw = getSetting(key);
      return raw ? (JSON.parse(raw) as SatSectionConfig) : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    math: parse("sat_math_config", DEFAULT_SAT_MATH),
    rw: parse("sat_rw_config", DEFAULT_SAT_RW),
  };
}

function buildRecommendation(
  exam: Exam,
  weakest: TopicProgress[],
  unresolvedMistakes: number,
): Recommendation {
  const examPath = exam.name === "TMUA" ? "/tmua" : "/sat";
  if (unresolvedMistakes >= 3) {
    return {
      title: "Clear your mistake backlog",
      detail: `You have ${unresolvedMistakes} unresolved mistakes. Redo them to lock in the fixes.`,
      href: "/mistakes",
      cta: "Open mistake notebook",
      type: "review",
    };
  }
  if (weakest.length > 0 && weakest[0].mastery < 60) {
    const w = weakest[0];
    return {
      title: `Drill: ${w.subtopic}`,
      detail: `Your weakest area (${w.mastery}% mastery, ${w.area}). Targeted practice will move the needle most.`,
      href: `/practice?exam=${exam.name}&topic=${w.topic_id}`,
      cta: "Start a focused drill",
      type: "drill",
    };
  }
  if (exam.name === "SAT") {
    return {
      title: "Sharpen Desmos speed",
      detail: "Strong fundamentals — convert them to a 1600 with faster Desmos workflows.",
      href: "/sat/desmos",
      cta: "Open Desmos Mastery",
      type: "desmos",
    };
  }
  return {
    title: "Sit a timed past paper",
    detail: "Your topics are solid. Build exam stamina under real timing.",
    href: `${examPath}/papers`,
    cta: "Choose a paper",
    type: "mock",
  };
}

export function getExamDashboard(exam: Exam): ExamDashboard {
  const examDate = effectiveExamDate(exam);
  const progress = getTopicProgress(exam.id);
  const practised = progress.filter((p) => p.attempts_count > 0);
  const sorted = [...practised].sort((a, b) => b.mastery - a.mastery);
  const strongest = sorted.slice(0, 3);
  const weakest = [...practised].sort((a, b) => a.mastery - b.mastery).slice(0, 3);
  const recentMistakes = getMistakes({ examId: exam.id, limit: 5 });
  const unresolved = queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM mistakes m JOIN questions q ON q.id = m.question_id
     WHERE q.exam_id = ? AND m.resolved = 0`,
    [exam.id],
  );

  const papersCompleted =
    queryOne<{ n: number }>(
      "SELECT COUNT(*) AS n FROM attempts WHERE exam_id = ? AND mode = 'exam' AND finished_at IS NOT NULL",
      [exam.id],
    )?.n ?? 0;

  // Projection
  let projectedLabel = "—";
  let projectedFraction = 0;
  let avgScoreLabel = "—";
  let prioritise: string | undefined;

  const recent = getRecentAttempts(exam.id, 5).filter((a) => a.scaled_score != null);
  if (exam.name === "TMUA") {
    let band: number;
    if (recent.length > 0) {
      band = recent.reduce((s, a) => s + (a.scaled_score ?? 0), 0) / recent.length;
    } else {
      const acc = getOverallAccuracy(exam.id).accuracy;
      const rawEstimate = Math.round(acc * 20);
      band = tmuaOverall(tmuaPaperBand(rawEstimate), tmuaPaperBand(rawEstimate));
    }
    projectedLabel = band.toFixed(1);
    projectedFraction = band / 9.0;
    avgScoreLabel =
      recent.length > 0
        ? (recent.reduce((s, a) => s + (a.scaled_score ?? 0), 0) / recent.length).toFixed(1)
        : "—";
  } else {
    const cfg = satConfig();
    const mathAcc = getOverallAccuracy(exam.id, "Math").accuracy;
    const rwAcc = getOverallAccuracy(exam.id, "RW").accuracy;
    const anyData = getOverallAccuracy(exam.id).total > 0;
    if (anyData) {
      const mathRes = satSectionFromAccuracy(cfg.math, mathAcc || 0.5);
      const rwRes = satSectionFromAccuracy(cfg.rw, rwAcc || 0.5);
      const tot = satTotal(rwRes, mathRes);
      projectedLabel = String(tot.total);
      projectedFraction = tot.total / 1600;
      avgScoreLabel = String(tot.total);
      prioritise = tot.prioritise;
    }
  }

  const recommendation = buildRecommendation(exam, weakest, unresolved?.n ?? 0);

  return {
    exam,
    examDate,
    papersCompleted,
    avgScoreLabel,
    strongest,
    weakest,
    recentMistakes,
    projectedLabel,
    projectedFraction,
    streakDays: getStreak(),
    recommendation,
    prioritise,
  };
}

/* ----------------------------- Study plan --------------------------- */

export function getStudyPlan(examId: number, from?: string, to?: string): StudyPlanItem[] {
  const where = ["exam_id = ?"];
  const params: unknown[] = [examId];
  if (from) {
    where.push("date >= ?");
    params.push(from);
  }
  if (to) {
    where.push("date <= ?");
    params.push(to);
  }
  return query<StudyPlanItem>(
    `SELECT * FROM study_plan WHERE ${where.join(" AND ")} ORDER BY date, id`,
    params,
  );
}

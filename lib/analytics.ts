/**
 * Analytics helpers (build step 9 — section F4).
 *
 * All functions are server-side only (they use node:sqlite via lib/db).
 * No `any` types — every raw SQL row is typed at the callsite.
 */

import { query, queryOne } from "@/lib/db";
import {
  getTopicProgress,
  getSetting,
  type TopicProgress,
} from "@/lib/queries";
import {
  tmuaPaperBand,
  tmuaOverall,
  satSectionFromAccuracy,
  satTotal,
  type SatTotalResult,
} from "@/lib/scoring";
import { loadSatConfig, loadTmuaBandTable } from "@/lib/scoring-config";

/* ------------------------------------------------------------------ */
/* Shared types                                                          */
/* ------------------------------------------------------------------ */

export interface AccuracyByTopic {
  topic_id: number;
  area: string;
  subtopic: string;
  accuracy: number; // 0..1
  attempts_count: number;
  mastery: number; // 0..100
}

export interface AccuracyByDifficulty {
  difficulty: string;
  total: number;
  correct: number;
  accuracy: number; // 0..1
}

export interface TimeVsPace {
  area: string;
  avgSeconds: number;
  paceTarget: number; // seconds per question
  delta: number; // avgSeconds - paceTarget (positive = over pace)
  overPace: boolean;
}

export interface ImprovementPoint {
  date: string; // ISO date
  scaled_score: number;
  mode: string;
}

export type TmuaPrediction = {
  kind: "tmua";
  band: number; // 1.0–9.0
  label: string;
};

export type SatPrediction = {
  kind: "sat";
  math: number;
  rw: number;
  total: number;
  prioritise: SatTotalResult["prioritise"];
  label: string;
};

export type ScorePrediction = TmuaPrediction | SatPrediction;

export interface ConfidenceBucket {
  confidence: "guessed" | "unsure" | "confident";
  count: number;
  correct: number;
  accuracy: number; // 0..1
}

export interface ErrorTypeCount {
  error_type: string;
  count: number;
}

/* ------------------------------------------------------------------ */
/* 1. accuracyByTopic                                                    */
/* ------------------------------------------------------------------ */

export function accuracyByTopic(examId: number): AccuracyByTopic[] {
  const rows = getTopicProgress(examId);
  return rows.map((p: TopicProgress) => ({
    topic_id: p.topic_id,
    area: p.area,
    subtopic: p.subtopic,
    accuracy: p.accuracy,
    attempts_count: p.attempts_count,
    mastery: p.mastery,
  }));
}

/* ------------------------------------------------------------------ */
/* 2. accuracyByDifficulty                                              */
/* ------------------------------------------------------------------ */

interface DiffRow {
  difficulty: string;
  total: number;
  correct: number;
}

export function accuracyByDifficulty(examId: number): AccuracyByDifficulty[] {
  const rows = query<DiffRow>(
    `SELECT COALESCE(q.difficulty, 'unknown') AS difficulty,
            COUNT(*) AS total,
            SUM(CASE WHEN r.is_correct = 1 THEN 1 ELSE 0 END) AS correct
     FROM responses r
     JOIN questions q ON q.id = r.question_id
     WHERE q.exam_id = ? AND r.is_correct IS NOT NULL
     GROUP BY q.difficulty
     ORDER BY CASE q.difficulty
              WHEN 'easy' THEN 1
              WHEN 'med'  THEN 2
              WHEN 'hard' THEN 3
              WHEN '1600level' THEN 4
              WHEN 'real' THEN 5
              ELSE 6 END`,
    [examId],
  );
  return rows.map((r) => ({
    difficulty: r.difficulty,
    total: r.total,
    correct: r.correct,
    accuracy: r.total > 0 ? r.correct / r.total : 0,
  }));
}

/* ------------------------------------------------------------------ */
/* 3. timeVsPace                                                         */
/* ------------------------------------------------------------------ */

interface AreaTimeRow {
  area: string;
  avgSecs: number;
}

export function timeVsPace(examId: number, examName: "TMUA" | "SAT"): TimeVsPace[] {
  // Fetch per-area average seconds from responses
  const rows = query<AreaTimeRow>(
    `SELECT t.area,
            AVG(r.seconds_spent) AS avgSecs
     FROM responses r
     JOIN questions q  ON q.id  = r.question_id
     JOIN topics   t  ON t.id  = q.topic_id
     WHERE q.exam_id = ? AND r.is_correct IS NOT NULL
     GROUP BY t.area`,
    [examId],
  );

  // Determine pace targets (seconds/question)
  let paceByArea: Record<string, number>;
  if (examName === "TMUA") {
    const secs = Number(getSetting("tmua_pace_seconds", "225"));
    // TMUA has two papers with 20 Qs each; we use one universal target
    paceByArea = {};
    rows.forEach((r) => {
      paceByArea[r.area] = secs;
    });
  } else {
    const mathPace = Number(getSetting("sat_math_pace_seconds", "95"));
    const rwPace = Number(getSetting("sat_rw_pace_seconds", "71"));
    paceByArea = {};
    rows.forEach((r) => {
      paceByArea[r.area] = r.area.toLowerCase().includes("math") ? mathPace : rwPace;
    });
  }

  return rows.map((r) => {
    const target = paceByArea[r.area] ?? 90;
    const delta = r.avgSecs - target;
    return {
      area: r.area,
      avgSeconds: Math.round(r.avgSecs),
      paceTarget: target,
      delta: Math.round(delta),
      overPace: delta > 0,
    };
  });
}

/* ------------------------------------------------------------------ */
/* 4. improvementOverTime                                               */
/* ------------------------------------------------------------------ */

interface AttemptRow {
  date: string;
  scaled_score: number;
  mode: string;
}

export function improvementOverTime(examId: number): ImprovementPoint[] {
  const rows = query<AttemptRow>(
    `SELECT date(finished_at) AS date, scaled_score, mode
     FROM attempts
     WHERE exam_id = ? AND finished_at IS NOT NULL AND scaled_score IS NOT NULL
     ORDER BY finished_at ASC`,
    [examId],
  );
  return rows.map((r) => ({
    date: r.date,
    scaled_score: r.scaled_score,
    mode: r.mode,
  }));
}

/* ------------------------------------------------------------------ */
/* 5. scorePrediction                                                    */
/* ------------------------------------------------------------------ */

interface OverallRow {
  total: number;
  correct: number;
}

function overallAccRow(examId: number, area?: string): { total: number; correct: number } {
  const params: unknown[] = [examId];
  const areaClause = area ? "AND t.area = ?" : "";
  if (area) params.push(area);
  const row = queryOne<OverallRow>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN r.is_correct = 1 THEN 1 ELSE 0 END) AS correct
     FROM responses r
     JOIN questions q ON q.id = r.question_id
     LEFT JOIN topics t ON t.id = q.topic_id
     WHERE q.exam_id = ? ${areaClause} AND r.is_correct IS NOT NULL`,
    params,
  );
  return { total: row?.total ?? 0, correct: row?.correct ?? 0 };
}

export function scorePrediction(examId: number, examName: "TMUA" | "SAT"): ScorePrediction | null {
  if (examName === "TMUA") {
    const { total, correct } = overallAccRow(examId);
    if (total === 0) return null;
    const acc = correct / total;
    const rawEstimate = Math.round(acc * 20);
    const paperBand = tmuaPaperBand(rawEstimate, loadTmuaBandTable());
    const band = tmuaOverall(paperBand, paperBand);
    return {
      kind: "tmua",
      band,
      label: `${band.toFixed(1)} (ESTIMATE)`,
    };
  }

  // SAT
  const mathAcc = overallAccRow(examId, "Math");
  const rwAcc = overallAccRow(examId, "RW");
  const hasData = mathAcc.total + rwAcc.total > 0;
  if (!hasData) return null;

  const { math: mathCfg, rw: rwCfg } = loadSatConfig();

  const mathAccFrac = mathAcc.total > 0 ? mathAcc.correct / mathAcc.total : 0.5;
  const rwAccFrac = rwAcc.total > 0 ? rwAcc.correct / rwAcc.total : 0.5;

  const mathRes = satSectionFromAccuracy(mathCfg, mathAccFrac);
  const rwRes = satSectionFromAccuracy(rwCfg, rwAccFrac);
  const totResult = satTotal(rwRes, mathRes);

  return {
    kind: "sat",
    math: mathRes.scaled,
    rw: rwRes.scaled,
    total: totResult.total,
    prioritise: totResult.prioritise,
    label: `${totResult.total} (ESTIMATE)`,
  };
}

/* ------------------------------------------------------------------ */
/* 6. readinessPercent                                                   */
/*                                                                        */
/* Formula (documented):                                                  */
/*   R = masteryScore × coverageScore × 100                              */
/*                                                                        */
/*   masteryScore = weighted average of mastery across *practiced* topics */
/*     - weight = attempts_count (more practice → heavier weight)        */
/*     - mastery is already 0..100, convert to 0..1                      */
/*                                                                        */
/*   coverageScore = min(1, practicedTopics / totalTopics)               */
/*     - rewards breadth: if you've only touched 20% of topics, the      */
/*       overall readiness is capped accordingly                          */
/*                                                                        */
/*   This means R can only reach 100 if you have practiced ALL topics    */
/*   AND every practiced topic has 100% mastery.                         */
/* ------------------------------------------------------------------ */

interface TopicCountRow {
  n: number;
}

export function readinessPercent(examId: number): number {
  const progress = getTopicProgress(examId);
  const practised = progress.filter((p) => p.attempts_count > 0);

  const totalTopicsRow = queryOne<TopicCountRow>(
    "SELECT COUNT(*) AS n FROM topics WHERE exam_id = ?",
    [examId],
  );
  const totalTopics = totalTopicsRow?.n ?? 0;

  if (practised.length === 0 || totalTopics === 0) return 0;

  // Weighted average mastery (weight = attempts_count)
  const totalWeight = practised.reduce((s, p) => s + p.attempts_count, 0);
  const weightedMastery =
    practised.reduce((s, p) => s + (p.mastery / 100) * p.attempts_count, 0) / totalWeight;

  // Coverage: fraction of all topics that have been practiced at all
  const coverageScore = Math.min(1, practised.length / totalTopics);

  const readiness = weightedMastery * coverageScore * 100;
  return Math.round(Math.min(100, readiness));
}

/* ------------------------------------------------------------------ */
/* 7. confidenceCalibration                                              */
/* ------------------------------------------------------------------ */

interface ConfRow {
  confidence: string;
  total: number;
  correct: number;
}

export function confidenceCalibration(examId: number): ConfidenceBucket[] {
  const rows = query<ConfRow>(
    `SELECT r.confidence,
            COUNT(*) AS total,
            SUM(CASE WHEN r.is_correct = 1 THEN 1 ELSE 0 END) AS correct
     FROM responses r
     JOIN questions q ON q.id = r.question_id
     WHERE q.exam_id = ? AND r.confidence IS NOT NULL AND r.is_correct IS NOT NULL
     GROUP BY r.confidence`,
    [examId],
  );

  const ORDER: Array<"guessed" | "unsure" | "confident"> = ["guessed", "unsure", "confident"];
  const rowMap = new Map(rows.map((r) => [r.confidence, r]));

  return ORDER.map((conf) => {
    const r = rowMap.get(conf);
    const count = r?.total ?? 0;
    const correct = r?.correct ?? 0;
    return {
      confidence: conf,
      count,
      correct,
      accuracy: count > 0 ? correct / count : 0,
    };
  }).filter((b) => b.count > 0);
}

/* ------------------------------------------------------------------ */
/* 8. errorTypeBreakdown                                                 */
/* ------------------------------------------------------------------ */

export function errorTypeBreakdown(examId: number): ErrorTypeCount[] {
  return query<ErrorTypeCount>(
    `SELECT m.error_type,
            COUNT(*) AS count
     FROM mistakes m
     JOIN questions q ON q.id = m.question_id
     WHERE q.exam_id = ?
     GROUP BY m.error_type
     ORDER BY count DESC`,
    [examId],
  );
}

/* ------------------------------------------------------------------ */
/* Convenience: load all analytics for one exam in one call             */
/* ------------------------------------------------------------------ */

export interface ExamAnalytics {
  accuracyByTopic: AccuracyByTopic[];
  accuracyByDifficulty: AccuracyByDifficulty[];
  timeVsPace: TimeVsPace[];
  improvementOverTime: ImprovementPoint[];
  scorePrediction: ScorePrediction | null;
  readinessPercent: number;
  confidenceCalibration: ConfidenceBucket[];
  errorTypeBreakdown: ErrorTypeCount[];
  overallAccuracy: number; // 0..1
  avgSecondsPerQuestion: number;
}

interface TotalAccRow {
  total: number;
  correct: number;
  secs: number;
}

export function getExamAnalytics(examId: number, examName: "TMUA" | "SAT"): ExamAnalytics {
  const totRow = queryOne<TotalAccRow>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN r.is_correct = 1 THEN 1 ELSE 0 END) AS correct,
            COALESCE(SUM(r.seconds_spent), 0) AS secs
     FROM responses r
     JOIN questions q ON q.id = r.question_id
     WHERE q.exam_id = ? AND r.is_correct IS NOT NULL`,
    [examId],
  );
  const tot = totRow?.total ?? 0;
  const cor = totRow?.correct ?? 0;
  const sec = totRow?.secs ?? 0;

  return {
    accuracyByTopic: accuracyByTopic(examId),
    accuracyByDifficulty: accuracyByDifficulty(examId),
    timeVsPace: timeVsPace(examId, examName),
    improvementOverTime: improvementOverTime(examId),
    scorePrediction: scorePrediction(examId, examName),
    readinessPercent: readinessPercent(examId),
    confidenceCalibration: confidenceCalibration(examId),
    errorTypeBreakdown: errorTypeBreakdown(examId),
    overallAccuracy: tot > 0 ? cor / tot : 0,
    avgSecondsPerQuestion: tot > 0 ? sec / tot : 0,
  };
}

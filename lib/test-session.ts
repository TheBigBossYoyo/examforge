/**
 * Test session lifecycle — the server side of sitting a full exam section.
 *
 * A session owns one attempt per module. For an adaptive SAT section the
 * caller starts the session (module 1), submits it, and is handed module 2
 * with its difficulty already decided from module 1's result. For a TMUA
 * paper there is a single module and no routing.
 *
 * The routing decision and question selection are pure functions in
 * lib/routing.ts; this module is the database glue around them.
 */
import { execute, query, queryOne, transaction } from "./db";
import { getExamById, getQuestion } from "./queries";
import { recordResponses, type SubmittedResponse } from "./attempts";
import {
  getExamFormat,
  getSectionFormat,
  sectionQuestionCount,
  type SectionFormat,
} from "./exam-format";
import { routeModule2, selectQuestions, type PoolQuestion, type RouteDifficulty } from "./routing";
import { satSectionScore, tmuaPaperBand } from "./scoring";
import { loadSatConfig, loadTmuaBandTable } from "./scoring-config";
import type { AttemptMode, ExamName, QuestionView } from "./types";

export interface StartSectionInput {
  examId: number;
  section: string; // 'Math' | 'RW' | 'P1' | 'P2'
  mode: AttemptMode;
}

/**
 * A question as the browser is allowed to see it during a module.
 *
 * Deliberately omits correct_answer, solution_md, hints and faster_method:
 * marking happens server-side in recordResponses(), so the client never needs
 * them, and shipping them would put the answer key in devtools during an exam.
 */
export interface ExamQuestion {
  id: number;
  prompt_md: string;
  choices: string[] | null;
  difficulty: string | null;
  topic_area?: string;
  topic_subtopic?: string;
  desmos_recommended: number;
  desmos_state_json: string | null;
}

function toExamQuestion(q: QuestionView): ExamQuestion {
  return {
    id: q.id,
    prompt_md: q.prompt_md,
    choices: q.choices,
    difficulty: q.difficulty,
    topic_area: q.topic_area,
    topic_subtopic: q.topic_subtopic,
    desmos_recommended: q.desmos_recommended,
    desmos_state_json: q.desmos_state_json,
  };
}

export interface ModuleHandle {
  sessionId: number;
  attemptId: number;
  moduleNumber: number;
  /** Total modules in this section. */
  moduleCount: number;
  section: string;
  sectionLabel: string;
  /** 'easy' | 'hard' for a routed module 2; null for module 1 and TMUA. */
  moduleDifficulty: RouteDifficulty | null;
  questions: ExamQuestion[];
  timeLimitSec: number | null;
  allowCalculator: boolean;
  referenceSheet: boolean;
  /** Set when the bank could not fill the module; the caller should warn. */
  shortfall: number;
  usedFallback: boolean;
}

/* ------------------------------------------------------------------ *
 * Pools
 * ------------------------------------------------------------------ */

interface PoolRow extends PoolQuestion {
  id: number;
  difficulty: string | null;
  topic_id: number | null;
}

/** Every question available for a section, as a routing pool. */
function getSectionPool(examId: number, section: string): PoolRow[] {
  return query<PoolRow>(
    `SELECT q.id, q.difficulty, q.topic_id
       FROM questions q
       JOIN topics t ON t.id = q.topic_id
      WHERE q.exam_id = ? AND t.area = ?`,
    [examId, section],
  );
}

/** Question ids already served earlier in this session. */
function idsUsedInSession(sessionId: number): Set<number> {
  const rows = query<{ question_id: number }>(
    `SELECT r.question_id
       FROM responses r
       JOIN attempts a ON a.id = r.attempt_id
      WHERE a.session_id = ?`,
    [sessionId],
  );
  return new Set(rows.map((r) => r.question_id));
}

function loadQuestions(ids: number[]): QuestionView[] {
  const views: QuestionView[] = [];
  for (const id of ids) {
    const q = getQuestion(id);
    if (q) views.push(q);
  }
  return views;
}

/* ------------------------------------------------------------------ *
 * Starting a section
 * ------------------------------------------------------------------ */

export function startSection(input: StartSectionInput): ModuleHandle {
  const exam = getExamById(input.examId);
  if (!exam) throw new Error("Unknown exam");

  const format = getSectionFormat(exam.name as ExamName, input.section);
  if (!format) throw new Error(`Unknown section '${input.section}' for ${exam.name}`);

  const mod = format.modules[0];
  const pool = getSectionPool(input.examId, input.section);

  // Module 1 is a mixed-difficulty module; TMUA's single paper is likewise mixed.
  const picked = selectQuestions(pool, mod.questionCount, { target: "mixed" });

  return transaction(() => {
    const sessionId = execute(
      `INSERT INTO test_sessions (exam_id, section, kind, mode)
       VALUES (?,?,?,?)`,
      [
        input.examId,
        input.section,
        format.adaptive ? "adaptive_section" : "single_paper",
        input.mode,
      ],
    ).lastInsertRowid;

    const attemptId = execute(
      `INSERT INTO attempts (exam_id, mode, session_id, module_number, section)
       VALUES (?,?,?,?,?)`,
      [input.examId, input.mode, sessionId, mod.number, input.section],
    ).lastInsertRowid;

    return buildHandle({
      sessionId,
      attemptId,
      format,
      mod,
      moduleDifficulty: null,
      questions: loadQuestions(picked.selected.map((q) => q.id)),
      shortfall: picked.shortfall,
      usedFallback: picked.usedFallback,
      timed: input.mode !== "untimed",
    });
  });
}

function buildHandle(args: {
  sessionId: number;
  attemptId: number;
  format: SectionFormat;
  mod: { number: number; questionCount: number; minutes: number };
  moduleDifficulty: RouteDifficulty | null;
  questions: QuestionView[];
  shortfall: number;
  usedFallback: boolean;
  timed: boolean;
}): ModuleHandle {
  return {
    sessionId: args.sessionId,
    attemptId: args.attemptId,
    moduleNumber: args.mod.number,
    moduleCount: args.format.modules.length,
    section: args.format.code,
    sectionLabel: args.format.label,
    moduleDifficulty: args.moduleDifficulty,
    questions: args.questions.map(toExamQuestion),
    timeLimitSec: args.timed ? args.mod.minutes * 60 : null,
    allowCalculator: args.format.allowCalculator,
    referenceSheet: args.format.referenceSheet,
    shortfall: args.shortfall,
    usedFallback: args.usedFallback,
  };
}

/* ------------------------------------------------------------------ *
 * Submitting a module
 * ------------------------------------------------------------------ */

export interface SubmitModuleInput {
  sessionId: number;
  attemptId: number;
  secondsTotal: number;
  responses: SubmittedResponse[];
}

export interface SubmitModuleResult {
  /** The next module to sit, or null when the section is finished. */
  next: ModuleHandle | null;
  /** Set only when the section is finished. */
  sessionComplete: boolean;
  moduleRaw: number;
  moduleTotal: number;
  /** Which module 2 the student routed into (adaptive sections only). */
  routedTo: RouteDifficulty | null;
  scaledScore: number | null;
  scaledLabel: string;
}

export function submitModule(input: SubmitModuleInput): SubmitModuleResult {
  const session = queryOne<{
    id: number;
    exam_id: number;
    section: string;
    kind: string;
    mode: AttemptMode;
  }>("SELECT id, exam_id, section, kind, mode FROM test_sessions WHERE id = ?", [input.sessionId]);
  if (!session) throw new Error("Unknown test session");

  const exam = getExamById(session.exam_id);
  if (!exam) throw new Error("Unknown exam");

  const format = getSectionFormat(exam.name as ExamName, session.section);
  if (!format) throw new Error(`Unknown section '${session.section}'`);

  const attempt = queryOne<{ module_number: number }>(
    "SELECT module_number FROM attempts WHERE id = ? AND session_id = ?",
    [input.attemptId, input.sessionId],
  );
  if (!attempt) throw new Error("Attempt does not belong to this session");

  return transaction(() => {
    const marked = recordResponses(
      input.attemptId,
      exam.name,
      session.exam_id,
      input.responses,
      true,
    );

    execute(
      `UPDATE attempts
          SET finished_at = datetime('now'), raw_score = ?, seconds_total = ?
        WHERE id = ?`,
      [marked.correctCount, Math.round(input.secondsTotal), input.attemptId],
    );

    const isLastModule = attempt.module_number >= format.modules.length;

    if (!isLastModule) {
      const next = startNextModule({
        sessionId: input.sessionId,
        examId: session.exam_id,
        examName: exam.name as ExamName,
        format,
        completedModule: attempt.module_number,
        module1: { correct: marked.correctCount, total: marked.total },
        mode: session.mode,
      });
      return {
        next,
        sessionComplete: false,
        moduleRaw: marked.correctCount,
        moduleTotal: marked.total,
        routedTo: next.moduleDifficulty,
        scaledScore: null,
        scaledLabel: "Module 2 pending",
      };
    }

    const scored = scoreSession(input.sessionId, exam.name as ExamName, format);
    return {
      next: null,
      sessionComplete: true,
      moduleRaw: marked.correctCount,
      moduleTotal: marked.total,
      routedTo: scored.routedTo,
      scaledScore: scored.scaledScore,
      scaledLabel: scored.scaledLabel,
    };
  });
}

function startNextModule(args: {
  sessionId: number;
  examId: number;
  examName: ExamName;
  format: SectionFormat;
  completedModule: number;
  module1: { correct: number; total: number };
  mode: AttemptMode;
}): ModuleHandle {
  const nextMod = args.format.modules[args.completedModule]; // 0-based index = next module

  const routed: RouteDifficulty | null = args.format.adaptive
    ? routeModule2(args.module1, getExamFormat(args.examName).routeThreshold)
    : null;

  const pool = getSectionPool(args.examId, args.format.code);
  const picked = selectQuestions(pool, nextMod.questionCount, {
    target: routed ?? "mixed",
    exclude: idsUsedInSession(args.sessionId),
  });

  if (routed) {
    execute("UPDATE test_sessions SET routed_difficulty = ? WHERE id = ?", [routed, args.sessionId]);
  }

  const attemptId = execute(
    `INSERT INTO attempts (exam_id, mode, session_id, module_number, section, module_difficulty)
     VALUES (?,?,?,?,?,?)`,
    [args.examId, args.mode, args.sessionId, nextMod.number, args.format.code, routed],
  ).lastInsertRowid;

  return buildHandle({
    sessionId: args.sessionId,
    attemptId,
    format: args.format,
    mod: nextMod,
    moduleDifficulty: routed,
    questions: loadQuestions(picked.selected.map((q) => q.id)),
    shortfall: picked.shortfall,
    usedFallback: picked.usedFallback,
    timed: args.mode !== "untimed",
  });
}

/* ------------------------------------------------------------------ *
 * Scoring a finished session
 * ------------------------------------------------------------------ */

interface ScoredSession {
  routedTo: RouteDifficulty | null;
  scaledScore: number | null;
  scaledLabel: string;
}

function scoreSession(
  sessionId: number,
  examName: ExamName,
  format: SectionFormat,
): ScoredSession {
  const modules = query<{ module_number: number; raw_score: number; module_difficulty: string | null }>(
    `SELECT module_number, COALESCE(raw_score, 0) AS raw_score, module_difficulty
       FROM attempts WHERE session_id = ? ORDER BY module_number`,
    [sessionId],
  );

  const totalCorrect = modules.reduce((n, m) => n + m.raw_score, 0);
  const seconds = queryOne<{ s: number }>(
    "SELECT COALESCE(SUM(seconds_total),0) AS s FROM attempts WHERE session_id = ?",
    [sessionId],
  )?.s ?? 0;

  let scaledScore: number | null = null;
  let scaledLabel = "—";
  let routedTo: RouteDifficulty | null = null;

  if (examName === "TMUA") {
    const total = sectionQuestionCount(format);
    const rawOutOf20 = total > 0 ? Math.round((totalCorrect / total) * 20) : 0;
    const band = tmuaPaperBand(rawOutOf20, loadTmuaBandTable());
    scaledScore = band;
    scaledLabel = `${band.toFixed(1)} / 9.0 (estimate)`;
  } else {
    const cfg = loadSatConfig();
    const sectionCfg = format.code === "RW" ? cfg.rw : cfg.math;
    const m1 = modules.find((m) => m.module_number === 1)?.raw_score ?? 0;
    const m2 = modules.find((m) => m.module_number === 2)?.raw_score ?? 0;
    // This is the call that never happened before: real module-1/module-2 raw
    // scores driving the routing-aware conversion.
    const res = satSectionScore(sectionCfg, m1, m2);
    routedTo = res.routedHard ? "hard" : "easy";
    scaledScore = res.scaled;
    scaledLabel =
      `${res.scaled} / 800 (${format.label} estimate)` +
      (res.capped ? " — capped: module 1 did not reach the harder module 2" : "");
  }

  execute(
    `UPDATE test_sessions
        SET finished_at = datetime('now'), raw_score = ?, scaled_score = ?, seconds_total = ?
      WHERE id = ?`,
    [totalCorrect, scaledScore, seconds, sessionId],
  );

  return { routedTo, scaledScore, scaledLabel };
}

/* ------------------------------------------------------------------ *
 * Reading sessions back
 * ------------------------------------------------------------------ */

export interface SessionSummary {
  id: number;
  exam_id: number;
  section: string;
  kind: string;
  mode: string;
  started_at: string;
  finished_at: string | null;
  routed_difficulty: string | null;
  raw_score: number | null;
  scaled_score: number | null;
  seconds_total: number | null;
}

export function getSession(id: number): SessionSummary | undefined {
  return queryOne<SessionSummary>("SELECT * FROM test_sessions WHERE id = ?", [id]);
}

export function getRecentSessions(examId?: number, limit = 20): SessionSummary[] {
  if (examId) {
    return query<SessionSummary>(
      "SELECT * FROM test_sessions WHERE exam_id = ? ORDER BY started_at DESC LIMIT ?",
      [examId, limit],
    );
  }
  return query<SessionSummary>("SELECT * FROM test_sessions ORDER BY started_at DESC LIMIT ?", [
    limit,
  ]);
}

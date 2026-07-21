// Server-side helper that assembles a RunnerConfig for the PracticeRunner.
// This is the single place that turns "what to practise" into a typed config:
// it picks questions, derives pace/time limits from settings, and enforces the
// copyright/Desmos rules (Desmos on SAT Math ONLY, NEVER on TMUA).
import { getExam, getQuestions, getQuestion, getSetting, getPaper } from "./queries";
import type { RunnerConfig, RunnerQuestion } from "./runner";
import type { AttemptMode, ExamName, QuestionView } from "./types";

export interface LaunchOptions {
  exam: ExamName;
  mode: AttemptMode;
  topicId?: number;
  area?: string; // TMUA: "P1"|"P2" — SAT: "Math"|"RW"
  difficulty?: string;
  count?: number;
  paperId?: number | null;
  desmosOnly?: boolean;
  randomize?: boolean;
  /** Explicit question ids (e.g. redo-wrong) — overrides filter selection. */
  questionIds?: number[];
  title?: string;
  subtitle?: string;
}

export interface LaunchResult {
  ok: boolean;
  reason?: string;
  config?: RunnerConfig;
}

function toRunnerQuestion(q: QuestionView): RunnerQuestion {
  return {
    id: q.id,
    prompt_md: q.prompt_md,
    choices: q.choices,
    correct_answer: q.correct_answer,
    solution_md: q.solution_md,
    faster_method_md: q.faster_method_md,
    hint1_md: q.hint1_md,
    hint2_md: q.hint2_md,
    hint3_md: q.hint3_md,
    difficulty: q.difficulty,
    desmos_recommended: q.desmos_recommended,
    desmos_state_json: q.desmos_state_json,
    topic_area: q.topic_area,
    topic_subtopic: q.topic_subtopic,
  };
}

/** Pace (seconds per question) for the given exam/area, from editable settings. */
export function paceFor(exam: ExamName, area?: string): number {
  if (exam === "TMUA") return Number(getSetting("tmua_pace_seconds", "225")) || 225;
  if (area === "RW") return Number(getSetting("sat_rw_pace_seconds", "71")) || 71;
  return Number(getSetting("sat_math_pace_seconds", "95")) || 95;
}

const DEFAULT_COUNT: Record<AttemptMode, number> = {
  exam: 20,
  diagnostic: 12,
  untimed: 10,
  drill: 10,
  redo: 50,
};

export function buildRunnerConfig(opts: LaunchOptions): LaunchResult {
  const exam = getExam(opts.exam);
  if (!exam) return { ok: false, reason: `Exam ${opts.exam} not found. Run \`npm run seed\`.` };

  const wantCount = opts.count ?? DEFAULT_COUNT[opts.mode] ?? 10;

  // ---- Select questions ----
  let views: QuestionView[];
  if (opts.questionIds && opts.questionIds.length > 0) {
    views = opts.questionIds
      .map((id) => getQuestion(id))
      .filter((q): q is QuestionView => q != null && q.exam_id === exam.id);
  } else {
    views = getQuestions({
      examId: exam.id,
      topicId: opts.topicId,
      area: opts.area,
      difficulty: opts.difficulty,
      desmosOnly: opts.desmosOnly,
      limit: wantCount,
      randomize: opts.randomize ?? opts.mode !== "exam",
    });
  }

  if (views.length === 0) {
    return {
      ok: false,
      reason:
        "No questions match this selection yet. Your bank only holds original/imported questions " +
        "(copyright rules forbid storing official questions). Import some on the Admin page or pick another filter.",
    };
  }

  const questions = views.map(toRunnerQuestion);
  const paceSecondsPerQ = paceFor(opts.exam, opts.area);
  const strict = opts.mode === "exam";
  const timed = opts.mode === "exam" || opts.mode === "diagnostic";

  // Paper time limit (if a real paper) overrides the per-question estimate.
  let timeLimitSec: number | null = null;
  if (timed) {
    if (opts.paperId) {
      const paper = getPaper(opts.paperId);
      if (paper?.time_limit_min) timeLimitSec = paper.time_limit_min * 60;
    }
    if (timeLimitSec == null) timeLimitSec = Math.round(paceSecondsPerQ * questions.length);
  }

  // Desmos: SAT only, and never on the Reading & Writing area. NEVER on TMUA.
  const allowDesmos = opts.exam === "SAT" && opts.area !== "RW";

  const areaLabel = opts.area ? ` · ${opts.area}` : "";
  const modeLabel: Record<AttemptMode, string> = {
    exam: "Exam simulation",
    diagnostic: "Diagnostic",
    untimed: "Untimed learning",
    drill: "Topic drill",
    redo: "Redo mistakes",
  };

  const config: RunnerConfig = {
    examName: opts.exam,
    examId: exam.id,
    paperId: opts.paperId ?? null,
    mode: opts.mode,
    title: opts.title ?? `${opts.exam}${areaLabel} — ${modeLabel[opts.mode]}`,
    subtitle:
      opts.subtitle ??
      `${questions.length} question${questions.length === 1 ? "" : "s"} · ${
        timed ? "timed" : "untimed"
      }${allowDesmos ? " · Desmos available" : ""}`,
    questions,
    timeLimitSec,
    paceSecondsPerQ,
    allowDesmos,
    allowHints: !strict,
    strict,
  };

  return { ok: true, config };
}

/**
 * Canonical TypeScript types mirroring the SQLite schema (section C).
 * Booleans are stored as 0/1 integers in SQLite; we expose them as `number`
 * at the row level and convert at the model layer where helpful.
 */

export type ExamName = "TMUA" | "SAT";
export type SourceType = "official" | "adjacent";
export type Cost = "free" | "paid";
export type PaperKind = "paper" | "module" | "topic_set" | "mock";
export type Difficulty = "easy" | "med" | "hard" | "1600level" | "real";
export type QuestionOrigin = "user_import" | "ai_generated";
export type AttemptMode = "exam" | "untimed" | "redo" | "drill" | "diagnostic";
export type Confidence = "guessed" | "unsure" | "confident";
export type ResourceType =
  | "past_paper"
  | "spec"
  | "notes"
  | "theory"
  | "questionbank"
  | "video"
  | "tool"
  | "dates";
export type StudyTaskType = "drill" | "mock" | "theory" | "review" | "desmos";

export type ScheduleCategory =
  | "SAT"
  | "TMUA"
  | "Workout"
  | "Chess"
  | "Chess (Coach)"
  | "Personal Statement"
  | "free";

export const TMUA_ERROR_TYPES = [
  "conceptual_gap",
  "algebra_mistake",
  "misread",
  "time_pressure",
  "logic_reasoning_error",
  "careless_arithmetic",
  "poor_strategy",
] as const;

export const SAT_ERROR_TYPES = [
  "content_gap",
  "trap_answer",
  "misread",
  "timing_issue",
  "grammar_rule_unknown",
  "calculation_error",
  "poor_elimination",
  "desmos_could_have_helped",
] as const;

export type TmuaErrorType = (typeof TMUA_ERROR_TYPES)[number];
export type SatErrorType = (typeof SAT_ERROR_TYPES)[number];
export type ErrorType = TmuaErrorType | SatErrorType;

export interface Exam {
  id: number;
  name: ExamName;
  target_score: number;
  exam_date: string;
  scale_min: number;
  scale_max: number;
}

export interface Source {
  id: number;
  name: string;
  type: SourceType;
  exam_id: number;
  cost: Cost;
  url: string | null;
  has_solutions: number;
  license_note: string | null;
}

export interface Paper {
  id: number;
  source_id: number | null;
  exam_id: number;
  title: string;
  year: number | null;
  kind: PaperKind;
  time_limit_min: number | null;
  num_questions: number | null;
  difficulty: Difficulty | null;
  pdf_url: string | null;
  relevance_to_target: number | null;
  note: string | null;
}

export interface Topic {
  id: number;
  exam_id: number;
  area: string;
  subtopic: string;
  parent_id: number | null;
}

export interface Question {
  id: number;
  paper_id: number | null;
  exam_id: number;
  topic_id: number | null;
  prompt_md: string;
  choices_json: string | null;
  correct_answer: string;
  solution_md: string | null;
  difficulty: Difficulty | null;
  source_label: string | null;
  origin: QuestionOrigin;
  hint1_md: string | null;
  hint2_md: string | null;
  hint3_md: string | null;
  desmos_recommended: number;
  desmos_state_json: string | null;
  faster_method_md: string | null;
  created_at: string;
}

export interface Attempt {
  id: number;
  paper_id: number | null;
  exam_id: number;
  started_at: string;
  finished_at: string | null;
  mode: AttemptMode;
  raw_score: number | null;
  scaled_score: number | null;
  seconds_total: number | null;
}

export interface Response {
  id: number;
  attempt_id: number;
  question_id: number;
  given_answer: string | null;
  is_correct: number | null;
  seconds_spent: number;
  hints_used: number;
  confidence: Confidence | null;
}

export interface Mistake {
  id: number;
  response_id: number | null;
  question_id: number;
  topic_id: number | null;
  error_type: string;
  note_md: string | null;
  resolved: number;
  created_at: string;
}

export interface Resource {
  id: number;
  exam_id: number;
  source_id: number | null;
  title: string;
  url: string;
  topic_tags_json: string | null;
  difficulty: string | null;
  type: ResourceType;
  cost: Cost;
  has_solutions: number;
  relevance: number | null;
  license_note: string | null;
}

export interface StudyPlanItem {
  id: number;
  exam_id: number;
  date: string;
  task_md: string;
  topic_id: number | null;
  est_minutes: number | null;
  type: StudyTaskType;
  done: number;
  session_code: string | null;
  start_time: string | null;
}

/** A fixed weekly schedule block (section M). day_of_week: 0=Mon .. 6=Sun. */
export interface ScheduleBlock {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  category: ScheduleCategory;
  session_code: string | null;
  locked: number;
}

export interface Progress {
  id: number;
  exam_id: number;
  topic_id: number;
  accuracy: number;
  avg_seconds: number;
  attempts_count: number;
  last_practiced: string | null;
  mastery: number;
}

export interface SrsCard {
  id: number;
  exam_id: number;
  topic_id: number | null;
  question_id: number | null;
  ease: number;
  interval_days: number;
  due_date: string;
  reps: number;
}

export interface Setting {
  key: string;
  value: string | null;
}

/** A question with its parsed choices, ready for the UI. */
export interface QuestionView extends Omit<Question, "choices_json"> {
  choices: string[] | null;
  topic_area?: string;
  topic_subtopic?: string;
}

export function parseChoices(json: string | null): string[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
}

export function toQuestionView(q: Question & { topic_area?: string; topic_subtopic?: string }): QuestionView {
  const { choices_json, ...rest } = q;
  return { ...rest, choices: parseChoices(choices_json) };
}

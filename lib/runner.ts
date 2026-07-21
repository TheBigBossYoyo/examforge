/** Client-safe types shared between server pages and the PracticeRunner. */
import type { AttemptMode, Confidence } from "./types";

export interface RunnerQuestion {
  id: number;
  prompt_md: string;
  choices: string[] | null;
  correct_answer: string;
  solution_md: string | null;
  faster_method_md: string | null;
  hint1_md: string | null;
  hint2_md: string | null;
  hint3_md: string | null;
  difficulty: string | null;
  desmos_recommended: number;
  desmos_state_json: string | null;
  topic_area?: string;
  topic_subtopic?: string;
}

export interface RunnerConfig {
  examName: "TMUA" | "SAT";
  examId: number;
  paperId?: number | null;
  mode: AttemptMode;
  title: string;
  subtitle?: string;
  questions: RunnerQuestion[];
  timeLimitSec: number | null; // null = untimed (counts up)
  paceSecondsPerQ: number;
  allowDesmos: boolean; // SAT math only — NEVER for TMUA
  allowHints: boolean; // untimed/learning mode reveals hints during attempt
  strict: boolean; // exam simulation: no solution/hint reveal until submit
}

export interface RunnerAnswerState {
  given: string | null;
  confidence: Confidence | null;
  hintsUsed: number;
  secondsSpent: number;
  flagged: boolean;
}

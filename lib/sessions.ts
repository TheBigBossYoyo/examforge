/**
 * Session catalogue (section M).
 *
 * The fixed weekly schedule (schedule_blocks) decides WHEN to study and the broad
 * subject. This catalogue decides WHAT goes inside each SAT (2h) / TMUA (3h) block:
 * every session is a list of slots whose `minutes` sum EXACTLY to the block length,
 * and each slot declares a `focus` telling the planner how to choose the topic
 * (weakness heatmap -> SRS due cards -> unresolved mistakes -> mixed/mock).
 *
 * Pure data + pure functions only — no database imports — so it is safe to import
 * from the planner, API routes, or client components.
 */
import type { ExamName, StudyTaskType } from "./types";

/** How the planner selects the concrete focus of a slot. */
export type SlotFocus =
  | "weakest" // lowest-mastery topic in `area`
  | "rotation" // rotate across the area's topics week to week
  | "srs" // pull SRS due cards
  | "mistakes" // unresolved mistake notebook items
  | "mixed" // mixed-difficulty set, no single topic
  | "desmos" // a Desmos Mastery lesson
  | "mock"; // timed paper / module, no single topic

export interface SessionSlot {
  type: StudyTaskType;
  minutes: number;
  focus: SlotFocus;
  /** Restrict topic selection to this area ("Math" | "RW" | "P1" | "P2"). */
  area?: string;
  /** Human-readable description of what to do, used to build task_md. */
  label: string;
}

export interface SessionDef {
  code: string;
  exam: ExamName;
  category: "SAT" | "TMUA";
  title: string;
  purpose: string;
  blockMinutes: number;
  slots: SessionSlot[];
}

/* ----------------------------- SAT catalogue (2h) ----------------------------- */

const SAT_SESSIONS: SessionDef[] = [
  {
    code: "SAT_MATH_LEARN",
    exam: "SAT",
    category: "SAT",
    title: "SAT Math — Learn",
    purpose:
      "Short theory on the weakest Math domain, then targeted drills easy → hard → 1600-level. Log every mistake + confidence tag.",
    blockMinutes: 120,
    slots: [
      { type: "theory", minutes: 20, focus: "weakest", area: "Math", label: "Theory on the weakest Math domain (15–20 min)." },
      { type: "drill", minutes: 50, focus: "weakest", area: "Math", label: "Targeted drills on that domain, easy → hard." },
      { type: "drill", minutes: 50, focus: "rotation", area: "Math", label: "Push to 1600-level on the same domain; log mistakes + confidence." },
    ],
  },
  {
    code: "SAT_RW",
    exam: "SAT",
    category: "SAT",
    title: "SAT Reading & Writing",
    purpose:
      "15-min rule review (Standard English Conventions), then skill drills rotating Transitions, Rhetorical Synthesis, Command of Evidence, Words-in-Context.",
    blockMinutes: 120,
    slots: [
      { type: "theory", minutes: 15, focus: "weakest", area: "RW", label: "Rule review: punctuation/boundaries, then verbs, agreement, modifiers, pronouns." },
      { type: "drill", minutes: 55, focus: "weakest", area: "RW", label: "Skill drills on the weakest R&W area." },
      { type: "drill", minutes: 50, focus: "rotation", area: "RW", label: "Rotate in Transitions / Rhetorical Synthesis / Command of Evidence / Words-in-Context." },
    ],
  },
  {
    code: "SAT_MATH_DESMOS",
    exam: "SAT",
    category: "SAT",
    title: "SAT Math — Desmos",
    purpose:
      "One Desmos Mastery lesson, then Advanced Math + Problem-Solving & Data Analysis drills done WITH the Desmos workflow.",
    blockMinutes: 120,
    slots: [
      { type: "desmos", minutes: 30, focus: "desmos", area: "Math", label: "One Desmos Mastery lesson (intersection, vertex, regression, sliders)." },
      { type: "drill", minutes: 50, focus: "weakest", area: "Math", label: "Advanced Math drills using the Desmos workflow; tag desmos_recommended." },
      { type: "drill", minutes: 40, focus: "rotation", area: "Math", label: "Problem-Solving & Data Analysis drills, Desmos-first." },
    ],
  },
  {
    code: "SAT_TIMED",
    exam: "SAT",
    category: "SAT",
    title: "SAT Timed",
    purpose: "Timed practice under Bluebook-style timing + pace indicators: one adaptive Math module and one R&W module.",
    blockMinutes: 120,
    slots: [
      { type: "mock", minutes: 65, focus: "mock", area: "Math", label: "Timed adaptive Math module under Bluebook pacing." },
      { type: "mock", minutes: 55, focus: "mock", area: "RW", label: "Timed R&W module under Bluebook pacing." },
    ],
  },
  {
    code: "SAT_MOCK",
    exam: "SAT",
    category: "SAT",
    title: "SAT Full Mock (bi-weekly)",
    purpose:
      "Bi-weekly full-length-style mock inside the Thursday block: one timed Math module + one timed R&W module; result routes into My Practice review.",
    blockMinutes: 120,
    slots: [
      { type: "mock", minutes: 70, focus: "mock", area: "Math", label: "Full-length-style timed Math module (estimate)." },
      { type: "mock", minutes: 50, focus: "mock", area: "RW", label: "Full-length-style timed R&W module (estimate)." },
    ],
  },
  {
    code: "SAT_REVIEW",
    exam: "SAT",
    category: "SAT",
    title: "SAT Review",
    purpose:
      "Error-correction sprint: work the week's mistake notebook (unresolved first), redo wrong questions, run SRS due cards, record the corrected/faster method.",
    blockMinutes: 120,
    slots: [
      { type: "review", minutes: 40, focus: "mistakes", label: "Work the mistake notebook — unresolved first; redo wrong questions." },
      { type: "review", minutes: 40, focus: "srs", label: "Run today's SRS due cards." },
      { type: "review", minutes: 40, focus: "weakest", area: "Math", label: "Re-solve and record the corrected/faster method (Desmos where it applies)." },
    ],
  },
];

/* ---------------------------- TMUA catalogue (3h) ----------------------------- */

const TMUA_SESSIONS: SessionDef[] = [
  {
    code: "TMUA_P1_LEARN",
    exam: "TMUA",
    category: "TMUA",
    title: "TMUA Paper 1 — Learn",
    purpose:
      "~45 min theory + worked examples on the weakest P1 topic, then mixed-difficulty exercises including MAT Question 1 MCQs and AEA pure pulls.",
    blockMinutes: 180,
    slots: [
      { type: "theory", minutes: 45, focus: "weakest", area: "P1", label: "Theory + worked examples on the weakest P1 topic." },
      { type: "drill", minutes: 70, focus: "weakest", area: "P1", label: "Mixed-difficulty P1 exercises incl. MAT Question 1 MCQs." },
      { type: "drill", minutes: 65, focus: "rotation", area: "P1", label: "AEA pure pulls; log mistakes + confidence." },
    ],
  },
  {
    code: "TMUA_P2_REASONING",
    exam: "TMUA",
    category: "TMUA",
    title: "TMUA Paper 2 — Reasoning",
    purpose:
      "Logic & proof theory (necessary vs sufficient, converse/contrapositive, counterexamples, flawed proofs, quantifier negation) + reasoning drills.",
    blockMinutes: 180,
    slots: [
      { type: "theory", minutes: 45, focus: "weakest", area: "P2", label: "Notes on Logic and Proof: necessary vs sufficient, converse/contrapositive, quantifier negation." },
      { type: "drill", minutes: 70, focus: "weakest", area: "P2", label: "Reasoning drills — counterexamples and spotting flawed proofs." },
      { type: "drill", minutes: 65, focus: "rotation", area: "P2", label: "Supplement with UKMT SMC reasoning items and STEP foundation logic." },
    ],
  },
  {
    code: "TMUA_TIMED_PAPER",
    exam: "TMUA",
    category: "TMUA",
    title: "TMUA Timed Paper",
    purpose:
      "A full official TMUA past paper under strict 75-min timing + pace indicator (3:45/Q), immediate self-mark, then classify and drill the gaps.",
    blockMinutes: 180,
    slots: [
      { type: "mock", minutes: 75, focus: "mock", label: "Full past paper under strict 75-min timing + pace indicator (estimate)." },
      { type: "review", minutes: 45, focus: "mistakes", label: "Immediate self-mark + 1.0–9.0 estimate; classify every mistake." },
      { type: "drill", minutes: 60, focus: "weakest", label: "Targeted drilling on the weakest topics exposed by the paper." },
    ],
  },
  {
    code: "TMUA_FULL_MOCK",
    exam: "TMUA",
    category: "TMUA",
    title: "TMUA Full Mock (fortnightly)",
    purpose:
      "Every 2nd week: a FULL both-paper mock (2h30) under strict timing, then immediate self-mark + 1.0–9.0 estimate (target 9.0 = top tail).",
    blockMinutes: 180,
    slots: [
      { type: "mock", minutes: 150, focus: "mock", label: "FULL both-paper mock (2h30) under strict timing (estimate)." },
      { type: "review", minutes: 30, focus: "mistakes", label: "Immediate self-mark + 1.0–9.0 estimate; flag repeated weak topics." },
    ],
  },
  {
    code: "TMUA_CORRECT_CONSOLIDATE",
    exam: "TMUA",
    category: "TMUA",
    title: "TMUA Correct & Consolidate",
    purpose:
      "Classify every mistake (topic + error_type), redo wrong questions, write the fix in note_md, run SRS due cards, finish with ~20 min speed drills.",
    blockMinutes: 180,
    slots: [
      { type: "review", minutes: 60, focus: "mistakes", label: "Classify every mistake (topic + error_type); redo wrong questions and write the fix." },
      { type: "review", minutes: 60, focus: "srs", label: "Run SRS due cards for repeatedly-missed topics." },
      { type: "drill", minutes: 40, focus: "weakest", label: "Targeted reinforcement on the most-missed topics." },
      { type: "drill", minutes: 20, focus: "mixed", label: "~20 min speed drills aimed at time-pressure errors." },
    ],
  },
];

/* -------------------------------- Taper (per exam) ----------------------------- */
// Final ~10 days before each exam: full mocks + light targeted review only, no new content.

const TAPER_SESSIONS: SessionDef[] = [
  {
    code: "SAT_TAPER",
    exam: "SAT",
    category: "SAT",
    title: "SAT Taper",
    purpose: "Final-stretch: a timed mock then light targeted review only — no new content.",
    blockMinutes: 120,
    slots: [
      { type: "mock", minutes: 80, focus: "mock", label: "Timed full-length-style mock (estimate)." },
      { type: "review", minutes: 40, focus: "mistakes", label: "Light targeted review of flagged mistakes — no new theory." },
    ],
  },
  {
    code: "TMUA_TAPER",
    exam: "TMUA",
    category: "TMUA",
    title: "TMUA Taper",
    purpose: "Final-stretch: a full both-paper mock then light review only — no new content.",
    blockMinutes: 180,
    slots: [
      { type: "mock", minutes: 120, focus: "mock", label: "Full both-paper mock under strict timing (estimate)." },
      { type: "review", minutes: 60, focus: "mistakes", label: "Light targeted review of flagged mistakes — no new theory." },
    ],
  },
];

const ALL_SESSIONS: SessionDef[] = [...SAT_SESSIONS, ...TMUA_SESSIONS, ...TAPER_SESSIONS];

const SESSION_BY_CODE: Record<string, SessionDef> = Object.fromEntries(
  ALL_SESSIONS.map((s) => [s.code, s]),
);

/** Look up a session definition by its (already-resolved) code. */
export function getSessionDef(code: string): SessionDef | undefined {
  return SESSION_BY_CODE[code];
}

/** The default seeded session_code each weekday's SAT / TMUA block carries. */
export const SCHEDULE_DEFAULT_SESSION: Record<string, string> = {
  // day_of_week (0=Mon..3=Thu) + category -> seeded session code
  "0:SAT": "SAT_MATH_LEARN",
  "1:SAT": "SAT_RW",
  "2:SAT": "SAT_MATH_DESMOS",
  "3:SAT": "SAT_TEST_OR_REVIEW", // meta — resolved per week parity
  "0:TMUA": "TMUA_P1_LEARN",
  "1:TMUA": "TMUA_P2_REASONING",
  "2:TMUA": "TMUA_TIMED_PAPER", // meta — fortnightly full mock
  "3:TMUA": "TMUA_CORRECT_CONSOLIDATE",
};

/**
 * Resolve a seeded (possibly meta) session code into a concrete catalogue code
 * using fortnightly week parity:
 *  - Thursday SAT  : even week -> SAT_REVIEW, odd week -> SAT_MOCK (bi-weekly full mock)
 *  - Wednesday TMUA: even week -> TMUA_FULL_MOCK, odd week -> TMUA_TIMED_PAPER
 */
export function resolveSessionCode(seededCode: string, weekIndex: number): string {
  if (seededCode === "SAT_TEST_OR_REVIEW") {
    return weekIndex % 2 === 0 ? "SAT_REVIEW" : "SAT_MOCK";
  }
  if (seededCode === "TMUA_TIMED_PAPER") {
    return weekIndex % 2 === 0 ? "TMUA_FULL_MOCK" : "TMUA_TIMED_PAPER";
  }
  return seededCode;
}

/** Taper session code for an exam's category. */
export function taperSessionCode(category: "SAT" | "TMUA"): string {
  return category === "SAT" ? "SAT_TAPER" : "TMUA_TAPER";
}

/**
 * Exam structure as data, not as branching.
 *
 * Timing, module layout, calculator rules and answer-choice shape were
 * previously scattered across scoring, launch, analytics and the runner as
 * `examName === "TMUA"` checks. Adding a third exam track meant finding every
 * one of them. They are declared here instead, and the engine reads the format.
 *
 * Nothing in this module touches the database — it describes the exams as they
 * are actually administered. Editable per-user values (pace, target score,
 * scoring curves) stay in `settings`.
 */
import type { ExamName } from "./types";

export type DifficultyBand = "easy" | "med" | "hard" | "1600level" | "real";

/** Ordering used when a difficulty-targeted pool has to be topped up. */
export const DIFFICULTY_RANK: Record<string, number> = {
  easy: 0,
  med: 1,
  hard: 2,
  "1600level": 3,
  real: 1, // official-paper items sit mid-scale; they carry no calibrated band
};

export interface ModuleFormat {
  /** 1-based module number within the section. */
  number: number;
  questionCount: number;
  minutes: number;
}

export interface SectionFormat {
  /** Stable code stored in test_sessions.section and attempts.section. */
  code: string;
  label: string;
  /** True when module 2's difficulty depends on module 1 performance. */
  adaptive: boolean;
  modules: ModuleFormat[];
  /** Desmos/any calculator permitted for the whole section. */
  allowCalculator: boolean;
  /** Number of answer choices, or null when free response is also possible. */
  choiceCount: number | null;
  /** Reference sheet available on screen (SAT Math only). */
  referenceSheet: boolean;
}

export interface ExamFormat {
  name: ExamName;
  sections: SectionFormat[];
  /**
   * Fraction of module 1 that must be correct to route into the harder
   * module 2. Only meaningful when a section is adaptive.
   */
  routeThreshold: number;
}

/**
 * Digital SAT. Two sections, each two adaptive modules.
 * Reading & Writing: 27 questions / 32 minutes per module.
 * Math:              22 questions / 35 minutes per module.
 * The calculator (Desmos) is built into Math for the entire section; there is
 * no separate no-calculator module in the digital format.
 */
export const SAT_FORMAT: ExamFormat = {
  name: "SAT",
  routeThreshold: 0.7,
  sections: [
    {
      code: "RW",
      label: "Reading & Writing",
      adaptive: true,
      modules: [
        { number: 1, questionCount: 27, minutes: 32 },
        { number: 2, questionCount: 27, minutes: 32 },
      ],
      allowCalculator: false,
      choiceCount: 4,
      referenceSheet: false,
    },
    {
      code: "Math",
      label: "Math",
      adaptive: true,
      modules: [
        { number: 1, questionCount: 22, minutes: 35 },
        { number: 2, questionCount: 22, minutes: 35 },
      ],
      allowCalculator: true,
      // Math mixes multiple choice with student-produced responses, so the
      // choice count is not fixed at the section level.
      choiceCount: null,
      referenceSheet: true,
    },
  ],
};

/**
 * TMUA. Two separate papers, each sat as one untinterrupted block, no adaptive
 * routing and no calculator of any kind.
 *
 * NOTE: choiceCount is set to 4 to match the current question bank. Real TMUA
 * items present more options than that; this needs checking against the
 * official specification before the bank is regenerated in Phase 2.
 */
export const TMUA_FORMAT: ExamFormat = {
  name: "TMUA",
  routeThreshold: 0, // unused: no section is adaptive
  sections: [
    {
      code: "P1",
      label: "Paper 1 — Applications of Mathematical Knowledge",
      adaptive: false,
      modules: [{ number: 1, questionCount: 20, minutes: 75 }],
      allowCalculator: false,
      choiceCount: 4,
      referenceSheet: false,
    },
    {
      code: "P2",
      label: "Paper 2 — Mathematical Reasoning",
      adaptive: false,
      modules: [{ number: 1, questionCount: 20, minutes: 75 }],
      allowCalculator: false,
      choiceCount: 4,
      referenceSheet: false,
    },
  ],
};

const FORMATS: Record<ExamName, ExamFormat> = {
  SAT: SAT_FORMAT,
  TMUA: TMUA_FORMAT,
};

export function getExamFormat(exam: ExamName): ExamFormat {
  return FORMATS[exam];
}

export function getSectionFormat(exam: ExamName, sectionCode: string): SectionFormat | undefined {
  return getExamFormat(exam).sections.find((s) => s.code === sectionCode);
}

/** Total questions across every module of a section. */
export function sectionQuestionCount(section: SectionFormat): number {
  return section.modules.reduce((n, m) => n + m.questionCount, 0);
}

/** Total minutes across every module of a section. */
export function sectionMinutes(section: SectionFormat): number {
  return section.modules.reduce((n, m) => n + m.minutes, 0);
}

/**
 * Is a calculator permitted here? The single place that answers this.
 * Previously expressed as `opts.exam === "SAT" && opts.area !== "RW"` in
 * lib/launch.ts, which is the same rule spelled differently.
 */
export function calculatorAllowed(exam: ExamName, sectionCode: string): boolean {
  return getSectionFormat(exam, sectionCode)?.allowCalculator ?? false;
}

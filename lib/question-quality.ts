/**
 * Quality gate for generated questions.
 *
 * An LLM will happily produce a question whose answer key is not among its own
 * choices, whose four options contain the same value twice, or whose "solution"
 * is one sentence of hand-waving. Those items are worse than no item at all:
 * they train the wrong reflex and corrupt the difficulty statistics that the
 * adaptive router depends on.
 *
 * Every check here is pure and unit-tested. The generator runs candidates
 * through `validateQuestion` and reports rejections by reason rather than
 * silently dropping them.
 */
import { normalizeText, parseNumeric } from "./answer";
import type { ImportQuestion } from "./importer";

export type RejectionCode =
  | "missing_prompt"
  | "prompt_too_short"
  | "missing_answer"
  | "bad_choice_count"
  | "duplicate_choices"
  | "key_not_in_choices"
  | "spr_answer_not_numeric"
  | "spr_not_allowed_here"
  | "missing_solution"
  | "solution_too_short"
  | "unbalanced_latex"
  | "desmos_without_method"
  | "desmos_on_non_calculator"
  | "duplicate_of_existing";

export interface ValidationIssue {
  code: RejectionCode;
  detail: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

/** Sections where a student-produced (free-response) answer is legitimate. */
function allowsFreeResponse(exam: string, area: string): boolean {
  // Only digital SAT Math has student-produced responses. TMUA is entirely
  // multiple choice, and so is SAT Reading & Writing.
  return exam === "SAT" && area === "Math";
}

/** Sections where a calculator exists at all. */
function allowsCalculator(exam: string, area: string): boolean {
  return exam === "SAT" && area === "Math";
}

/**
 * `$` must pair up, or KaTeX renders raw markup into the question. Escaped
 * `\$` is a literal dollar sign and does not count toward the pairing.
 */
export function hasBalancedLatex(text: string): boolean {
  const stripped = text.replace(/\\\$/g, "");
  // $$...$$ blocks first, then remaining single $.
  const blocks = (stripped.match(/\$\$/g) ?? []).length;
  if (blocks % 2 !== 0) return false;
  const singles = (stripped.replace(/\$\$/g, "").match(/\$/g) ?? []).length;
  return singles % 2 === 0;
}

export function validateQuestion(q: ImportQuestion): ValidationResult {
  const issues: ValidationIssue[] = [];
  const add = (code: RejectionCode, detail: string) => issues.push({ code, detail });

  const prompt = (q.prompt_md ?? "").trim();
  const answer = (q.correct_answer ?? "").trim();

  if (!prompt) add("missing_prompt", "prompt_md is empty");
  else if (prompt.length < 15) add("prompt_too_short", `prompt is ${prompt.length} chars`);

  if (!answer) add("missing_answer", "correct_answer is empty");

  const choices = q.choices ?? null;

  if (choices && choices.length > 0) {
    if (choices.length < 3 || choices.length > 5) {
      add("bad_choice_count", `${choices.length} choices (expected 3-5)`);
    }
    const normalised = choices.map((c) => normalizeText(c));
    if (new Set(normalised).size !== normalised.length) {
      add("duplicate_choices", `choices contain a repeat: ${JSON.stringify(choices)}`);
    }
    if (answer && !normalised.includes(normalizeText(answer))) {
      add("key_not_in_choices", `key ${JSON.stringify(answer)} is not one of the options`);
    }
  } else {
    // Free response.
    if (!allowsFreeResponse(q.exam, q.area)) {
      add("spr_not_allowed_here", `${q.exam}/${q.area} is multiple choice only`);
    }
    if (answer && parseNumeric(answer) == null) {
      add("spr_answer_not_numeric", `free-response answer ${JSON.stringify(answer)} is not a number`);
    }
  }

  const solution = (q.solution_md ?? "").trim();
  if (!solution) add("missing_solution", "solution_md is empty");
  else if (solution.length < 25) add("solution_too_short", `solution is ${solution.length} chars`);

  for (const [field, text] of [
    ["prompt_md", prompt],
    ["solution_md", solution],
    ["passage_md", q.passage_md ?? ""],
  ] as const) {
    if (text && !hasBalancedLatex(text)) {
      add("unbalanced_latex", `${field} has an odd number of $ delimiters`);
    }
  }

  if (q.desmos_recommended) {
    if (!allowsCalculator(q.exam, q.area)) {
      add("desmos_on_non_calculator", `${q.exam}/${q.area} has no calculator`);
    }
    if (!(q.faster_method_md ?? "").trim()) {
      add("desmos_without_method", "desmos_recommended is set but faster_method_md is empty");
    }
  }

  return { ok: issues.length === 0, issues };
}

/* ------------------------------------------------------------------ *
 * Duplicate detection
 * ------------------------------------------------------------------ */

/** Content words of a prompt, for overlap comparison. */
function tokenise(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

/** Jaccard overlap of two prompts, 0..1. */
export function promptSimilarity(a: string, b: string): number {
  const ta = tokenise(a);
  const tb = tokenise(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const w of ta) if (tb.has(w)) shared++;
  return shared / (ta.size + tb.size - shared);
}

/**
 * Is this prompt a near-duplicate of one already in the bank?
 *
 * Generation runs topic by topic, and models reliably re-emit the same handful
 * of canonical problems ("If 3x + 5 = 20..."), so without this the bank fills
 * with restatements of one question and the difficulty spread collapses.
 */
export function isDuplicate(
  prompt: string,
  existing: string[],
  threshold = 0.75,
): { duplicate: boolean; match?: string; similarity: number } {
  let best = 0;
  let match: string | undefined;
  const normalisedNew = normalizeText(prompt);

  for (const other of existing) {
    if (normalizeText(other) === normalisedNew) {
      return { duplicate: true, match: other, similarity: 1 };
    }
    const sim = promptSimilarity(prompt, other);
    if (sim > best) {
      best = sim;
      match = other;
    }
  }
  return { duplicate: best >= threshold, match, similarity: best };
}

/* ------------------------------------------------------------------ *
 * Reporting
 * ------------------------------------------------------------------ */

export interface QualityReport {
  accepted: ImportQuestion[];
  rejected: { question: ImportQuestion; issues: ValidationIssue[] }[];
  byCode: Record<string, number>;
}

/**
 * The text that actually identifies a question.
 *
 * Must include the passage. Reading & Writing stems are boilerplate — every
 * transitions item asks "which choice completes the text with the most logical
 * transition?" — so comparing stems alone marks an entire topic as duplicates
 * of each other. The passage is what makes an RW item distinct.
 */
export function identityText(q: Pick<ImportQuestion, "prompt_md" | "passage_md">): string {
  return [q.passage_md ?? "", q.prompt_md ?? ""].filter(Boolean).join(" ").trim();
}

/**
 * Validate a batch, filtering duplicates both against the existing bank and
 * within the batch itself.
 */
export function screenBatch(
  candidates: ImportQuestion[],
  existingPrompts: string[] = [],
): QualityReport {
  const accepted: ImportQuestion[] = [];
  const rejected: QualityReport["rejected"] = [];
  const byCode: Record<string, number> = {};
  const seen = [...existingPrompts];

  for (const q of candidates) {
    const result = validateQuestion(q);
    const issues = [...result.issues];

    const identity = identityText(q);

    if (issues.length === 0) {
      const dup = isDuplicate(identity, seen);
      if (dup.duplicate) {
        issues.push({
          code: "duplicate_of_existing",
          detail: `${(dup.similarity * 100).toFixed(0)}% overlap with an existing question`,
        });
      }
    }

    if (issues.length === 0) {
      accepted.push(q);
      seen.push(identity);
    } else {
      rejected.push({ question: q, issues });
      for (const i of issues) byCode[i.code] = (byCode[i.code] ?? 0) + 1;
    }
  }

  return { accepted, rejected, byCode };
}

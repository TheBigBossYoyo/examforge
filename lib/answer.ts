/**
 * Answer normalisation and marking.
 *
 * Two distinct jobs, deliberately kept separate:
 *
 *  1. Multiple choice — the stored `correct_answer` is the full choice string
 *     (often LaTeX, e.g. `$\tfrac{25}{3}$`), and the submitted answer is the
 *     choice the student clicked. A normalised string comparison settles it.
 *
 *  2. Student-produced responses (SAT SPR / free response) — the student types
 *     a value. Here `1/2`, `0.5` and `.5` are all the same answer, and the
 *     previous implementation marked two of them wrong.
 *
 * The old marker stripped every non-digit before parsing, so "1/2" became the
 * number 12 and `$\tfrac{25}{3}$` became 253. Both silently scored as wrong.
 */

/* ------------------------------------------------------------------ *
 * Text normalisation
 * ------------------------------------------------------------------ */

/** LaTeX wrappers and delimiters that carry no mathematical meaning here. */
function stripLatexChrome(s: string): string {
  return s
    .replace(/\\left|\\right/g, "")
    .replace(/\\[,;:!> ]/g, "") // spacing macros: \, \; \: \! \>
    .replace(/\\displaystyle/g, "")
    .replace(/^\s*\$+|\$+\s*$/g, "") // $...$ and $$...$$
    .replace(/^\s*\\\(|\\\)\s*$/g, "") // \( ... \)
    .replace(/^\s*\\\[|\\\]\s*$/g, "") // \[ ... \]
    .replace(/[{}]/g, " ");
}

/**
 * Normalise for equality comparison of *text* answers (multiple choice).
 * Case- and whitespace-insensitive, LaTeX-delimiter-insensitive.
 */
export function normalizeText(s: string | null | undefined): string {
  if (s == null) return "";
  return stripLatexChrome(String(s))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,;]+$/, ""); // trailing sentence punctuation only
}

/* ------------------------------------------------------------------ *
 * Numeric parsing
 * ------------------------------------------------------------------ */

/** Parse a plain decimal/integer token: "2.5", "-3", ".5", "1,234". */
function parseDecimal(raw: string): number | null {
  const s = raw.replace(/,(?=\d{3}\b)/g, ""); // thousands separators only
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a numeric answer, accepting the forms a student can actually type or
 * that the bank can actually store.
 *
 * Accepted:  "5"  "-3"  ".5"  "2.50"  "1/2"  "-3/4"  "1,234"
 *            "$5$"  "\frac{1}{2}"  "\tfrac{25}{3}"  "\dfrac{-1}{2}"
 *            "50%"  "$40"   (symbol ignored — SPR tells students to omit them)
 *
 * Rejected (returns null):
 *   "2 1/2"  — a mixed number. The digital SAT's answer field does not accept
 *              a space, and the College Board rule is that mixed numbers must
 *              be entered as 2.5 or 5/2. Parsing it as 2.5 would teach a habit
 *              that loses marks on test day, so it is treated as unparseable
 *              and falls through to a (failing) text comparison.
 *   anything with a variable, radical or symbolic constant — SPR answers are
 *              always plain numbers.
 */
export function parseNumeric(input: string | null | undefined): number | null {
  if (input == null) return null;

  let s = stripLatexChrome(String(input)).trim();
  if (s === "") return null;

  // Currency / percent are noise around a number, not operators.
  s = s.replace(/[$£€]/g, "").replace(/%/g, "").trim();
  // Unicode minus / en-dash used as a minus sign.
  s = s.replace(/[−–]/g, "-");

  // \frac{a}{b} / \tfrac / \dfrac — braces already became spaces above.
  const fracMacro = s.match(/^\\[tdc]?frac\s+([+-]?[\d.,]+)\s+([+-]?[\d.,]+)\s*$/i);
  if (fracMacro) {
    const num = parseDecimal(fracMacro[1]);
    const den = parseDecimal(fracMacro[2]);
    if (num == null || den == null || den === 0) return null;
    return num / den;
  }

  // Reject anything still carrying letters or a backslash: variables, radicals,
  // \pi, unit labels. A bare number never survives with these attached.
  if (/[a-z\\]/i.test(s)) return null;

  // Simple fraction a/b (no spaces — a space means a mixed number, see above).
  const frac = s.match(/^([+-]?[\d.,]+)\/([+-]?[\d.,]+)$/);
  if (frac) {
    const num = parseDecimal(frac[1]);
    const den = parseDecimal(frac[2]);
    if (num == null || den == null || den === 0) return null;
    return num / den;
  }

  return parseDecimal(s);
}

/* ------------------------------------------------------------------ *
 * Numeric equivalence
 * ------------------------------------------------------------------ */

function roundToSigDigits(x: number, sig: number): number {
  if (x === 0) return 0;
  const mag = Math.ceil(Math.log10(Math.abs(x)));
  const factor = 10 ** (sig - mag);
  return Math.round(x * factor) / factor;
}

function truncToSigDigits(x: number, sig: number): number {
  if (x === 0) return 0;
  const mag = Math.ceil(Math.log10(Math.abs(x)));
  const factor = 10 ** (sig - mag);
  return Math.trunc(x * factor) / factor;
}

const EPS = 1e-9;

/**
 * Are two numeric answers the same answer?
 *
 * Exact match aside, this implements the digital SAT's repeating-decimal rule:
 * a value may be entered rounded OR truncated, so 2/3 may be given as .6666 or
 * .6667. The official instruction is to fill the answer field (4 significant
 * digits); we accept 3 or more so a practice attempt of .667 is not marked
 * wrong. That is deliberately one notch more lenient than the real test — the
 * alternative is telling a student they got it wrong when they understood it.
 */
export function numericallyEquivalent(given: number, correct: number): boolean {
  if (!Number.isFinite(given) || !Number.isFinite(correct)) return false;

  const scale = Math.max(1, Math.abs(correct));
  if (Math.abs(given - correct) <= EPS * scale) return true;

  for (let sig = 3; sig <= 6; sig++) {
    if (Math.abs(given - roundToSigDigits(correct, sig)) <= EPS * scale) return true;
    if (Math.abs(given - truncToSigDigits(correct, sig)) <= EPS * scale) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * Marking
 * ------------------------------------------------------------------ */

/**
 * Mark a submitted answer against the stored correct answer.
 *
 * An unanswered question (null / empty) is never correct — it is not the same
 * as a wrong answer, but that distinction is carried by `is_correct = NULL` at
 * the response layer, not here.
 */
export function isAnswerCorrect(given: string | null | undefined, correct: string): boolean {
  if (given == null) return false;
  if (String(given).trim() === "") return false;

  // 1. Text equality — settles multiple choice, including LaTeX choices.
  const g = normalizeText(given);
  const c = normalizeText(correct);
  if (g !== "" && g === c) return true;

  // 2. Numeric equivalence — settles typed/free-response answers.
  const gn = parseNumeric(given);
  const cn = parseNumeric(correct);
  if (gn != null && cn != null) return numericallyEquivalent(gn, cn);

  return false;
}

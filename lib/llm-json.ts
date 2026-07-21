/**
 * Recovering JSON from a language model's reply.
 *
 * The failure mode that matters here is LaTeX. A model asked for maths content
 * in JSON will emit `"$\frac{1}{2}$"`, which is *invalid* JSON — `\f` is the
 * formfeed escape, so the string terminates early and the parse dies with a
 * message pointing at some unrelated `$`. Almost every generation batch hits
 * this, so a generator without this repair produces nothing at all.
 *
 * Everything here is deliberately conservative: repairs are applied only where
 * the raw text is already not valid JSON.
 */

/** Backslash escapes JSON actually defines. */
const VALID_JSON_ESCAPES = new Set(["\"", "\\", "/", "b", "f", "n", "r", "t", "u"]);

const isLetter = (c: string | undefined): boolean => c !== undefined && /[a-zA-Z]/.test(c);

/**
 * Double any backslash that is really the start of a LaTeX command, so
 * `\frac`, `\sqrt`, `\theta` survive parsing.
 *
 * The subtle part: the dangerous cases are the ones JSON accepts. `\f`, `\b`,
 * `\n`, `\t` and `\r` are all legal JSON escapes, so `"$\frac{1}{2}$"` parses
 * *successfully* into a formfeed followed by "rac" — no error, silently
 * corrupted maths. The same swallows `\times` (tab), `\neq` (newline),
 * `\beta` (backspace) and `\rightarrow` (carriage return), which between them
 * cover most of the LaTeX a maths item writer emits.
 *
 * Heuristic: a backslash followed by TWO letters is a LaTeX command, not an
 * escape. A genuine JSON `\n` is followed by a space, a quote, or another
 * escape — not by two more letters.
 *
 * Tradeoff: prose written as "...end.\nNote that..." would be read as a LaTeX
 * command and kept literal. That is the right trade for maths-heavy content,
 * where `\note` is far rarer than `\frac`.
 */
export function escapeLatexBackslashes(text: string): string {
  let out = "";
  let inString = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"' && (i === 0 || text[i - 1] !== "\\")) {
      inString = !inString;
      out += ch;
      continue;
    }

    if (ch === "\\" && inString) {
      const next = text[i + 1];

      if (next === "\\") {
        // Already an escaped backslash — copy both, do not touch.
        out += "\\\\";
        i++;
        continue;
      }

      // Looks like a LaTeX command (\frac, \times, \neq, \beta ...) even when
      // the leading letter happens to be a legal JSON escape character.
      if (isLetter(next) && isLetter(text[i + 2])) {
        out += "\\\\";
        continue;
      }

      if (next !== undefined && VALID_JSON_ESCAPES.has(next)) {
        out += ch;
        continue;
      }

      // Lone backslash starting something JSON does not know: escape it.
      out += "\\\\";
      continue;
    }

    out += ch;
  }

  return out;
}

/** Remove trailing commas before a closing bracket or brace. */
export function stripTrailingCommas(text: string): string {
  return text.replace(/,(\s*[}\]])/g, "$1");
}

/** Pull the outermost JSON array out of a reply that may be fenced or chatty. */
export function extractArrayText(raw: string): string {
  let text = raw.trim();

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  if (!text.startsWith("[")) {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start !== -1 && end > start) text = text.slice(start, end + 1);
  }
  return text;
}

export interface ParseOutcome {
  items: unknown[];
  /** Which repairs were needed, for reporting. */
  repairs: string[];
}

/**
 * Parse a model reply into an array, repairing only as much as needed.
 *
 * Throws with the original parse error if even the repaired text will not
 * parse — silently returning [] would hide a broken prompt.
 */
export function parseModelArray(raw: string): ParseOutcome {
  const repairs: string[] = [];
  const text = extractArrayText(raw);

  const attempt = (candidate: string): unknown[] | null => {
    try {
      const parsed = JSON.parse(candidate);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  // The LaTeX repair runs BEFORE the first parse attempt, not as a fallback
  // after one fails. `"$\frac{x}{2}$"` is *valid* JSON — it just means
  // something entirely different from what the model intended — so waiting for
  // a parse error would let the corrupted version through untouched.
  const escaped = escapeLatexBackslashes(text);
  if (escaped !== text) repairs.push("escaped-latex-backslashes");

  let items = attempt(escaped);
  if (items) return { items, repairs };

  const noCommas = stripTrailingCommas(escaped);
  if (noCommas !== escaped) {
    items = attempt(noCommas);
    if (items) {
      repairs.push("stripped-trailing-commas");
      return { items, repairs };
    }
  }

  // Surface the real error from the most-repaired candidate.
  JSON.parse(noCommas);
  throw new Error("Model did not return a JSON array");
}

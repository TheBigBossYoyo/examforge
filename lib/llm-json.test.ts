import { describe, expect, it } from "vitest";
import {
  escapeLatexBackslashes,
  extractArrayText,
  parseModelArray,
  stripTrailingCommas,
} from "./llm-json";

describe("escapeLatexBackslashes", () => {
  it("rescues LaTeX that JSON would silently mis-parse", () => {
    // The dangerous case: this IS valid JSON. \f is the formfeed escape, so it
    // parses without error into "$" + formfeed + "rac{1}{2}$" — corrupted maths
    // with nothing to alert you.
    const broken = '["$\\frac{1}{2}$"]';
    expect(JSON.parse(broken)[0]).toBe("$\frac{1}{2}$"); // formfeed, not \frac
    expect(JSON.parse(escapeLatexBackslashes(broken))[0]).toBe("$\\frac{1}{2}$");
  });

  it("rescues the other LaTeX commands JSON swallows", () => {
    for (const [cmd, expected] of [
      ['["$a \\times b$"]', "$a \\times b$"], // \t = tab
      ['["$x \\neq y$"]', "$x \\neq y$"], // \n = newline
      ['["$\\beta$"]', "$\\beta$"], // \b = backspace
      ['["$\\rightarrow$"]', "$\\rightarrow$"], // \r = carriage return
    ] as const) {
      expect(JSON.parse(escapeLatexBackslashes(cmd))[0]).toBe(expected);
    }
  });

  it("leaves already-escaped backslashes alone", () => {
    const fine = '["$\\\\frac{1}{2}$"]';
    expect(JSON.parse(escapeLatexBackslashes(fine))[0]).toBe(JSON.parse(fine)[0]);
  });

  it("preserves a real newline escape followed by a space", () => {
    const withNewline = '["line one\\n line two"]';
    expect(JSON.parse(escapeLatexBackslashes(withNewline))[0]).toBe("line one\n line two");
  });

  it("preserves a newline escape at the end of a string", () => {
    expect(JSON.parse(escapeLatexBackslashes('["trailing\\n"]'))[0]).toBe("trailing\n");
  });

  it("preserves escaped quotes", () => {
    const withQuote = '["he said \\"hi\\""]';
    expect(JSON.parse(escapeLatexBackslashes(withQuote))[0]).toBe('he said "hi"');
  });

  it("does not touch backslashes outside strings", () => {
    expect(escapeLatexBackslashes("[1, 2, 3]")).toBe("[1, 2, 3]");
  });
});

describe("stripTrailingCommas", () => {
  it("removes a trailing comma in an array and an object", () => {
    expect(stripTrailingCommas('[1, 2, ]')).toBe("[1, 2 ]");
    expect(stripTrailingCommas('{"a": 1, }')).toBe('{"a": 1 }');
  });
});

describe("extractArrayText", () => {
  it("unwraps a fenced block", () => {
    expect(extractArrayText('```json\n[1,2]\n```')).toBe("[1,2]");
    expect(extractArrayText('```\n[1,2]\n```')).toBe("[1,2]");
  });

  it("slices an array out of surrounding prose", () => {
    expect(extractArrayText('Here you go:\n[1,2]\nHope that helps!')).toBe("[1,2]");
  });

  it("passes clean input through", () => {
    expect(extractArrayText("[1,2]")).toBe("[1,2]");
  });
});

describe("parseModelArray", () => {
  it("parses clean JSON with no repairs", () => {
    const out = parseModelArray('[{"a":1}]');
    expect(out.items).toEqual([{ a: 1 }]);
    expect(out.repairs).toEqual([]);
  });

  it("recovers a realistic LaTeX-bearing question batch", () => {
    // This is the shape that was actually failing against Gemini.
    const raw = `\`\`\`json
[
  {
    "prompt_md": "If $\\frac{x}{2} + 3 = 7$, what is $x$?",
    "choices": ["$8$", "$4$", "$\\sqrt{16}$", "$2$"],
    "correct_answer": "$8$",
    "solution_md": "Subtract 3 to get $\\frac{x}{2} = 4$, so $x = 8$."
  }
]
\`\`\``;
    const out = parseModelArray(raw);
    expect(out.items).toHaveLength(1);
    expect(out.repairs).toContain("escaped-latex-backslashes");
    const q = out.items[0] as Record<string, string>;
    expect(q.prompt_md).toBe("If $\\frac{x}{2} + 3 = 7$, what is $x$?");
    expect(q.correct_answer).toBe("$8$");
  });

  it("recovers LaTeX plus a trailing comma", () => {
    const raw = '[{"p":"$\\alpha$"},]';
    const out = parseModelArray(raw);
    expect(out.items).toHaveLength(1);
    expect(out.repairs).toContain("stripped-trailing-commas");
  });

  it("throws rather than silently returning nothing", () => {
    expect(() => parseModelArray("this is not json at all")).toThrow();
  });
});

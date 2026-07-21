import katex from "katex";

/**
 * Lightweight Markdown + KaTeX renderer (server-safe).
 *
 * Supports: inline `$...$` and block `$$...$$` math, **bold**, *italic*,
 * `code`, headings (#, ##, ###), unordered (-, *) and ordered lists,
 * paragraphs and line breaks. Deliberately small — no external markdown
 * dependency, no client JS. Used for prompts, solutions, hints and theory.
 */

function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      output: "html",
    });
  } catch {
    return escapeHtml(tex);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Inline formatting on a text run that contains NO math. */
function inlineFormat(text: string): string {
  let t = escapeHtml(text);
  // inline code
  t = t.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-surface-muted text-content text-[0.9em]">$1</code>');
  // bold then italic
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  // links [text](url)
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-tmua underline underline-offset-2">$1</a>',
  );
  return t;
}

/** Replace $...$ / $$...$$ with rendered KaTeX, formatting the rest inline. */
function renderInlineWithMath(line: string): string {
  let out = "";
  let i = 0;
  while (i < line.length) {
    if (line[i] === "$") {
      const isBlock = line[i + 1] === "$";
      const delim = isBlock ? "$$" : "$";
      const end = line.indexOf(delim, i + delim.length);
      if (end !== -1) {
        const tex = line.slice(i + delim.length, end);
        out += renderMath(tex, isBlock);
        i = end + delim.length;
        continue;
      }
    }
    // accumulate non-math run up to next '$'
    const next = line.indexOf("$", i);
    const run = next === -1 ? line.slice(i) : line.slice(i, next);
    out += inlineFormat(run);
    i = next === -1 ? line.length : next;
    if (next !== -1 && run.length === 0) {
      // stray '$' with no closing — emit literally to avoid infinite loop
      out += "$";
      i = next + 1;
    }
  }
  return out;
}

function toHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      closeList();
      continue;
    }
    // block math on its own line
    if (line.trim().startsWith("$$") && line.trim().endsWith("$$") && line.trim().length > 4) {
      closeList();
      const tex = line.trim().slice(2, -2);
      html.push(`<div class="my-2 text-center">${renderMath(tex, true)}</div>`);
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length;
      const sizes = ["text-xl font-bold", "text-lg font-semibold", "text-base font-semibold"];
      html.push(`<h${level} class="${sizes[level - 1]} mt-3 mb-1">${renderInlineWithMath(heading[2])}</h${level}>`);
      continue;
    }
    const ul = /^[-*]\s+(.*)$/.exec(line);
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ul) {
      if (listType !== "ul") {
        closeList();
        html.push('<ul class="list-disc pl-5 space-y-0.5 my-1">');
        listType = "ul";
      }
      html.push(`<li>${renderInlineWithMath(ul[1])}</li>`);
      continue;
    }
    if (ol) {
      if (listType !== "ol") {
        closeList();
        html.push('<ol class="list-decimal pl-5 space-y-0.5 my-1">');
        listType = "ol";
      }
      html.push(`<li>${renderInlineWithMath(ol[1])}</li>`);
      continue;
    }
    closeList();
    html.push(`<p class="my-1 leading-relaxed">${renderInlineWithMath(line)}</p>`);
  }
  closeList();
  return html.join("\n");
}

export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  if (!children) return null;
  return (
    <div
      className={`prose-katex text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: toHtml(children) }}
    />
  );
}

/** Inline-only variant (single line, no paragraph wrapping). */
export function InlineMarkdown({ children, className = "" }: { children: string; className?: string }) {
  if (!children) return null;
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: renderInlineWithMath(children) }}
    />
  );
}

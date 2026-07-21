"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Markdown } from "@/components/Markdown";
import { ReferenceSheet } from "@/components/exam/ReferenceSheet";
import { formatClock } from "@/lib/format";
import type {
  ExamQuestion,
  ModuleHandle,
  SubmittedAnnotation,
  SubmitModuleResult,
} from "@/lib/test-session";

const DesmosCalculator = dynamic(
  () => import("@/components/Desmos").then((m) => m.DesmosCalculator),
  { ssr: false, loading: () => <div className="p-4 text-sm text-ink-400">Loading Desmos…</div> },
);

/** Five minutes left is when the real test surfaces its warning. */
const WARNING_SECONDS = 5 * 60;

interface AnswerState {
  given: string | null;
  flagged: boolean;
  eliminated: number[];
  secondsSpent: number;
  /** Quoted strings the student highlighted, re-applied on revisit. */
  highlights: string[];
  note: string;
}

function blankAnswer(): AnswerState {
  return { given: null, flagged: false, eliminated: [], secondsSpent: 0, highlights: [], note: "" };
}

type Phase = "testing" | "review" | "transition" | "done";

/* ------------------------------------------------------------------ *
 * Highlighting
 * ------------------------------------------------------------------ */

/**
 * Wrap the current selection in <mark>. Uses the live DOM range so it works
 * over KaTeX-rendered markdown, where offset-based reconstruction would not.
 * surroundContents throws when a range straddles element boundaries, so the
 * fallback wraps each intersecting text node separately.
 */
function highlightSelection(container: HTMLElement | null): string | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (!container || !container.contains(range.commonAncestorContainer)) return null;

  const text = sel.toString().trim();
  if (!text) return null;

  const wrap = (node: Node) => {
    const mark = document.createElement("mark");
    mark.className = "bg-amber-200/70 rounded-sm";
    node.parentNode?.replaceChild(mark, node);
    mark.appendChild(node);
  };

  try {
    const mark = document.createElement("mark");
    mark.className = "bg-amber-200/70 rounded-sm";
    range.surroundContents(mark);
  } catch {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const touched: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (range.intersectsNode(node) && node.textContent?.trim()) touched.push(node);
    }
    for (const node of touched) wrap(node);
  }

  sel.removeAllRanges();
  return text;
}

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */

export function ExamRunner({
  initial,
  examName,
}: {
  initial: ModuleHandle;
  examName: "SAT" | "TMUA";
}) {
  const router = useRouter();

  const [handle, setHandle] = useState<ModuleHandle>(initial);
  const [phase, setPhase] = useState<Phase>("testing");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>(() => initial.questions.map(blankAnswer));
  const [elapsed, setElapsed] = useState(0);
  const [timerHidden, setTimerHidden] = useState(false);
  const [eliminatorOn, setEliminatorOn] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [showDesmos, setShowDesmos] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SubmitModuleResult | null>(null);

  const promptRef = useRef<HTMLDivElement>(null);
  const passageRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(0);
  currentRef.current = current;
  const lastTick = useRef(Date.now());

  const q: ExamQuestion | undefined = handle.questions[current];
  const a = answers[current] ?? blankAnswer();
  const remaining = handle.timeLimitSec != null ? handle.timeLimitSec - elapsed : null;
  const isRW = handle.section === "RW";

  /* ---------------- timer ---------------- */
  useEffect(() => {
    if (phase !== "testing") return;
    lastTick.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = Math.round((now - lastTick.current) / 1000);
      if (dt <= 0) return;
      lastTick.current = now;
      setElapsed((e) => e + dt);
      setAnswers((prev) => {
        const next = [...prev];
        const i = currentRef.current;
        if (next[i]) next[i] = { ...next[i], secondsSpent: next[i].secondsSpent + dt };
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const update = useCallback((patch: Partial<AnswerState>) => {
    setAnswers((prev) => {
      const next = [...prev];
      const i = currentRef.current;
      next[i] = { ...(next[i] ?? blankAnswer()), ...patch };
      return next;
    });
  }, []);

  /* ---------------- submission ---------------- */
  const submitCurrentModule = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/session/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: handle.sessionId,
          attemptId: handle.attemptId,
          secondsTotal: elapsed,
          responses: handle.questions.map((qq, i) => ({
            questionId: qq.id,
            givenAnswer: answers[i]?.given ?? null,
            secondsSpent: answers[i]?.secondsSpent ?? 0,
            hintsUsed: 0,
            flagged: answers[i]?.flagged ?? false,
            eliminated: answers[i]?.eliminated ?? [],
          })),
          // Highlights and notes persist so they are still there at review.
          annotations: handle.questions.flatMap<SubmittedAnnotation>((qq, i) => {
            const ans = answers[i];
            if (!ans) return [];
            const rows: SubmittedAnnotation[] = ans.highlights.map((quotedText) => ({
              questionId: qq.id,
              kind: "highlight",
              quotedText,
            }));
            if (ans.note.trim()) {
              rows.push({ questionId: qq.id, kind: "note", noteMd: ans.note.trim() });
            }
            return rows;
          }),
        }),
      });
      const data = (await res.json()) as SubmitModuleResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Submit failed");

      setOutcome(data);
      if (data.next) {
        setPhase("transition");
      } else {
        setPhase("done");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
      setPhase("review");
    } finally {
      setSubmitting(false);
    }
  }, [submitting, handle, elapsed, answers]);

  // Time expiry submits the module, exactly as the real test does.
  useEffect(() => {
    if (phase === "testing" && remaining != null && remaining <= 0) {
      void submitCurrentModule();
    }
  }, [phase, remaining, submitCurrentModule]);

  const beginNextModule = useCallback(() => {
    const next = outcome?.next;
    if (!next) return;
    setHandle(next);
    setAnswers(next.questions.map(blankAnswer));
    setCurrent(0);
    setElapsed(0);
    setOutcome(null);
    setShowDesmos(false);
    setEliminatorOn(false);
    setPhase("testing");
  }, [outcome]);

  /* ---------------- keyboard ---------------- */
  useEffect(() => {
    if (phase !== "testing") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "ArrowRight") setCurrent((c) => Math.min(handle.questions.length - 1, c + 1));
      else if (e.key === "ArrowLeft") setCurrent((c) => Math.max(0, c - 1));
      else if (e.key.toLowerCase() === "m") update({ flagged: !a.flagged });
      else if (/^[a-d]$/i.test(e.key) && q?.choices) {
        const idx = e.key.toLowerCase().charCodeAt(0) - 97;
        if (idx < q.choices.length) update({ given: q.choices[idx] });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handle.questions.length, a.flagged, q, update]);

  /* ---------------- re-apply highlights on revisit ---------------- */
  useEffect(() => {
    if (!promptRef.current || a.highlights.length === 0) return;
    const container = promptRef.current;
    for (const text of a.highlights) {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const idx = node.textContent?.indexOf(text) ?? -1;
        if (idx >= 0 && node.parentElement?.tagName !== "MARK") {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + text.length);
          const mark = document.createElement("mark");
          mark.className = "bg-amber-200/70 rounded-sm";
          try {
            range.surroundContents(mark);
          } catch {
            /* skip if it cannot be wrapped cleanly */
          }
          break;
        }
      }
    }
  }, [current, a.highlights]);

  const answeredCount = answers.filter((x) => x.given != null && x.given !== "").length;
  const warning = remaining != null && remaining <= WARNING_SECONDS && remaining > 0;

  const toggleEliminated = (idx: number) => {
    const set = new Set(a.eliminated);
    if (set.has(idx)) set.delete(idx);
    else set.add(idx);
    update({ eliminated: [...set] });
  };

  const accent = examName === "TMUA" ? "tmua" : "sat";

  /* ================= transition between modules ================= */
  if (phase === "transition" && outcome?.next) {
    const next = outcome.next;
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-ink-400">
          Module {next.moduleNumber} of {next.moduleCount}
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900">
          {next.sectionLabel}
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-500">
          You answered <strong>{outcome.moduleRaw}</strong> of {outcome.moduleTotal} correctly in
          module {next.moduleNumber - 1}.
          {next.moduleDifficulty && (
            <>
              {" "}
              Based on that you have been routed into the{" "}
              <strong>{next.moduleDifficulty === "hard" ? "harder" : "standard"}</strong> second
              module — exactly as the real adaptive test does.
            </>
          )}
        </p>
        <p className="mt-2 text-sm text-ink-400">
          {next.questions.length} questions ·{" "}
          {next.timeLimitSec ? `${Math.round(next.timeLimitSec / 60)} minutes` : "untimed"}
        </p>
        {next.shortfall > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Only {next.questions.length} questions were available for this module (wanted{" "}
            {next.questions.length + next.shortfall}). The bank needs more{" "}
            {next.moduleDifficulty} items.
          </p>
        )}
        <button onClick={beginNextModule} className={`btn-${accent} mt-8 px-8 py-3`}>
          Begin module {next.moduleNumber} →
        </button>
      </div>
    );
  }

  /* ================= finished ================= */
  if (phase === "done" && outcome) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-ink-400">
          Section complete
        </div>
        <div className="mt-4 text-6xl font-extrabold tracking-tight text-ink-900">
          {outcome.scaledScore ?? "—"}
        </div>
        <p className="mt-2 text-[15px] font-medium text-ink-500">{outcome.scaledLabel}</p>
        {outcome.routedTo && (
          <p className="mt-3 text-sm text-ink-400">
            Routed into the {outcome.routedTo === "hard" ? "harder" : "standard"} module 2.
          </p>
        )}
        <p className="mt-6 max-w-sm text-xs leading-relaxed text-ink-400">
          Every score here is a norm-referenced <strong>estimate</strong>. Real conversions vary per
          sitting; the tables are editable in Settings.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button onClick={() => router.push("/analytics")} className={`btn-${accent}`}>
            See analytics
          </button>
          <button onClick={() => router.push("/mistakes")} className="btn-outline">
            Review mistakes
          </button>
        </div>
      </div>
    );
  }

  /* ================= review screen ================= */
  if (phase === "review") {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
          Check Your Work
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          {handle.sectionLabel} · Module {handle.moduleNumber} of {handle.moduleCount} — on test
          day you cannot return to a module once it is submitted.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        )}

        <div className="mt-6 rounded-2xl border border-ink-200 p-5">
          <div className="mb-4 flex flex-wrap gap-4 text-xs text-ink-500">
            <span>{answeredCount} answered</span>
            <span>{handle.questions.length - answeredCount} unanswered</span>
            <span>{answers.filter((x) => x.flagged).length} marked for review</span>
          </div>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
            {handle.questions.map((_, i) => {
              const ans = answers[i];
              const done = ans?.given != null && ans.given !== "";
              return (
                <button
                  key={i}
                  onClick={() => {
                    setCurrent(i);
                    setPhase("testing");
                  }}
                  className={`relative h-10 rounded-lg border text-sm font-bold transition-colors ${
                    done
                      ? "border-ink-900 bg-ink-900 text-white"
                      : "border-dashed border-ink-300 bg-white text-ink-400"
                  }`}
                  aria-label={`Question ${i + 1}${done ? ", answered" : ", unanswered"}`}
                >
                  {i + 1}
                  {ans?.flagged && (
                    <span className="absolute -right-1 -top-1 text-amber-500" aria-hidden>
                      ★
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={() => setPhase("testing")} className="btn-outline">
            ← Back to questions
          </button>
          <button
            onClick={submitCurrentModule}
            disabled={submitting}
            className={`btn-${accent} px-6`}
          >
            {submitting
              ? "Submitting…"
              : handle.moduleNumber < handle.moduleCount
                ? "Submit module"
                : "Finish section"}
          </button>
        </div>
      </div>
    );
  }

  /* ================= testing ================= */
  if (!q) return null;

  const questionPane = (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded bg-ink-900 text-sm font-bold text-white">
          {current + 1}
        </span>
        <button
          onClick={() => update({ flagged: !a.flagged })}
          className={`text-xs font-semibold ${a.flagged ? "text-amber-600" : "text-ink-400"}`}
          aria-pressed={a.flagged}
        >
          {a.flagged ? "★ Marked for Review" : "☆ Mark for Review"}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              // A selection can land in either pane; try the passage first
              // since that is what gets highlighted most on Reading & Writing.
              const text =
                highlightSelection(passageRef.current) ?? highlightSelection(promptRef.current);
              if (text) update({ highlights: [...a.highlights, text] });
            }}
            className="text-xs text-ink-400 hover:text-ink-700"
            title="Highlight the selected text"
          >
            ✏️ Highlight
          </button>
          <button
            onClick={() => setShowNotes((s) => !s)}
            className={`text-xs ${showNotes ? "text-ink-900" : "text-ink-400"} hover:text-ink-700`}
          >
            🗒 Notes
          </button>
          {q.choices && (
            <button
              onClick={() => setEliminatorOn((s) => !s)}
              className={`rounded px-2 py-0.5 text-xs font-bold ${
                eliminatorOn ? "bg-ink-900 text-white" : "text-ink-400 hover:text-ink-700"
              }`}
              aria-pressed={eliminatorOn}
              title="Answer eliminator"
            >
              ABC⁄
            </button>
          )}
        </div>
      </div>

      <div ref={promptRef} className="select-text">
        <Markdown className="text-[15px] leading-relaxed">{q.prompt_md}</Markdown>
      </div>

      {showNotes && (
        <textarea
          className="input min-h-[80px]"
          placeholder="Notes for this question…"
          value={a.note}
          onChange={(e) => update({ note: e.target.value })}
        />
      )}

      <div className="space-y-2">
        {q.choices ? (
          q.choices.map((choice, idx) => {
            const selected = a.given === choice;
            const struck = a.eliminated.includes(idx);
            return (
              <div key={idx} className="flex items-center gap-2">
                <button
                  onClick={() => !struck && update({ given: choice })}
                  disabled={struck}
                  className={`flex flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    selected
                      ? "border-ink-900 bg-ink-50 ring-1 ring-ink-900"
                      : "border-ink-200 hover:bg-ink-50"
                  } ${struck ? "opacity-40" : ""}`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                      selected ? "border-ink-900 bg-ink-900 text-white" : "border-ink-300 text-ink-500"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className={struck ? "line-through" : ""}>
                    <Markdown>{choice}</Markdown>
                  </span>
                </button>
                {eliminatorOn && (
                  <button
                    onClick={() => toggleEliminated(idx)}
                    className="w-8 shrink-0 text-xs font-bold text-ink-400 hover:text-ink-900"
                    aria-label={`${struck ? "Restore" : "Eliminate"} choice ${String.fromCharCode(65 + idx)}`}
                  >
                    {struck ? "↩" : `${String.fromCharCode(65 + idx)}⁄`}
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div>
            <input
              className="input max-w-xs"
              placeholder="Enter your answer"
              value={a.given ?? ""}
              onChange={(e) => update({ given: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-ink-400">
              Fractions and decimals both accepted. No %, $ or commas.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col">
      {/* ---- top bar ---- */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 pb-3">
        <div>
          <div className="text-sm font-bold text-ink-900">{handle.sectionLabel}</div>
          <div className="text-xs text-ink-400">
            Module {handle.moduleNumber} of {handle.moduleCount}
            {handle.moduleDifficulty && ` · ${handle.moduleDifficulty} route`}
          </div>
        </div>

        <div className="text-center">
          {timerHidden ? (
            <div className="h-7" />
          ) : (
            <div
              className={`tabular-nums text-2xl font-bold ${warning ? "text-rose-600" : "text-ink-900"}`}
              role="timer"
              aria-live="off"
            >
              {remaining != null ? formatClock(remaining) : formatClock(elapsed)}
            </div>
          )}
          <button
            onClick={() => setTimerHidden((h) => !h)}
            className="text-[11px] font-semibold text-ink-400 hover:text-ink-700"
          >
            {timerHidden ? "Show timer" : "Hide"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {handle.referenceSheet && (
            <button onClick={() => setShowReference(true)} className="btn-outline text-xs">
              Reference
            </button>
          )}
          {handle.allowCalculator && (
            <button
              onClick={() => setShowDesmos((s) => !s)}
              className={showDesmos ? `btn-${accent} text-xs` : "btn-outline text-xs"}
            >
              Calculator
            </button>
          )}
        </div>
      </header>

      {warning && (
        <div className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-center text-xs font-semibold text-amber-800">
          5 minutes remaining in this module
        </div>
      )}

      {handle.shortfall > 0 && current === 0 && (
        <div className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          This module is {handle.shortfall} question{handle.shortfall === 1 ? "" : "s"} short of the
          real exam length — the bank does not have enough items yet. Scores will read low.
        </div>
      )}

      {/* ---- body ---- */}
      <main className="flex-1 py-5">
        {isRW ? (
          // Reading & Writing puts the passage on the left, question on the right.
          <div className="grid gap-6 lg:grid-cols-2 lg:divide-x lg:divide-ink-200">
            <div className="lg:pr-6">
              {q.passage_md ? (
                <div ref={passageRef} className="select-text">
                  <Markdown className="text-[15px] leading-relaxed">{q.passage_md}</Markdown>
                </div>
              ) : (
                <p className="text-xs text-ink-400">
                  This question carries no separate passage — its stimulus is part of the question
                  text on the right.
                </p>
              )}
            </div>
            <div className="lg:pl-6">{questionPane}</div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            <div>{questionPane}</div>
            {showDesmos && handle.allowCalculator && (
              <div className="lg:w-[420px]">
                <div className="sticky top-4">
                  <DesmosCalculator state={q.desmos_state_json} height={420} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ---- bottom bar ---- */}
      <footer className="flex items-center justify-between gap-3 border-t border-ink-200 pt-3">
        <div className="text-xs font-semibold text-ink-400">
          {answeredCount}/{handle.questions.length} answered
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNavigator((s) => !s)}
            className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-bold text-white"
            aria-expanded={showNavigator}
          >
            Question {current + 1} of {handle.questions.length} ▲
          </button>
          {showNavigator && (
            <div className="absolute bottom-12 left-1/2 z-30 w-[300px] -translate-x-1/2 rounded-2xl border border-ink-200 bg-white p-4 shadow-lift">
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-ink-400">
                Go to question
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {handle.questions.map((_, i) => {
                  const ans = answers[i];
                  const done = ans?.given != null && ans.given !== "";
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrent(i);
                        setShowNavigator(false);
                      }}
                      className={`relative h-8 rounded text-xs font-bold ${
                        i === current
                          ? "bg-ink-900 text-white"
                          : done
                            ? "bg-ink-200 text-ink-800"
                            : "border border-dashed border-ink-300 text-ink-400"
                      }`}
                    >
                      {i + 1}
                      {ans?.flagged && (
                        <span className="absolute -right-0.5 -top-1 text-amber-500" aria-hidden>
                          ★
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  setShowNavigator(false);
                  setPhase("review");
                }}
                className="btn-outline mt-3 w-full text-xs"
              >
                Go to review page
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="btn-outline"
          >
            Back
          </button>
          {current < handle.questions.length - 1 ? (
            <button onClick={() => setCurrent((c) => c + 1)} className={`btn-${accent}`}>
              Next
            </button>
          ) : (
            <button onClick={() => setPhase("review")} className={`btn-${accent}`}>
              Review
            </button>
          )}
        </div>
      </footer>

      {showReference && <ReferenceSheet onClose={() => setShowReference(false)} />}
    </div>
  );
}

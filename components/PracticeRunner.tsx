"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Markdown } from "@/components/Markdown";
import { formatClock } from "@/lib/format";
import type { RunnerConfig, RunnerAnswerState } from "@/lib/runner";
import type { Confidence } from "@/lib/types";

const DesmosCalculator = dynamic(
  () => import("@/components/Desmos").then((m) => m.DesmosCalculator),
  { ssr: false, loading: () => <div className="p-4 text-sm text-content-subtle">Loading Desmos…</div> },
);

const CONFIDENCE_OPTS: { value: Confidence; label: string; tone: string }[] = [
  { value: "guessed", label: "Guessed", tone: "bg-rose-100 text-rose-700 ring-rose-300" },
  { value: "unsure", label: "Unsure", tone: "bg-amber-100 text-amber-700 ring-amber-300" },
  { value: "confident", label: "Confident", tone: "bg-emerald-100 text-emerald-700 ring-emerald-300" },
];

export function PracticeRunner({ config }: { config: RunnerConfig }) {
  const router = useRouter();
  const { questions, examName } = config;
  const accent = examName === "TMUA" ? "tmua" : "sat";

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<RunnerAnswerState[]>(() =>
    questions.map(() => ({ given: null, confidence: null, hintsUsed: 0, secondsSpent: 0, flagged: false })),
  );
  const [elapsed, setElapsed] = useState(0);
  const [showDesmos, setShowDesmos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>(() => questions.map(() => false));
  const startedAt = useRef(new Date().toISOString());
  const lastTick = useRef(Date.now());
  const currentRef = useRef(0);
  currentRef.current = current;

  // Global timer — also attributes per-second time to the active question.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const dt = Math.round((now - lastTick.current) / 1000);
      lastTick.current = now;
      if (dt <= 0) return;
      setElapsed((e) => e + dt);
      setAnswers((prev) => {
        const next = [...prev];
        const i = currentRef.current;
        next[i] = { ...next[i], secondsSpent: next[i].secondsSpent + dt };
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const q = questions[current];
  const a = answers[current];
  const remaining = config.timeLimitSec != null ? config.timeLimitSec - elapsed : null;
  const answeredCount = answers.filter((x) => x.given != null && x.given !== "").length;

  // Pace: where should you be by now vs where you are.
  const expectedIndex = Math.floor(elapsed / config.paceSecondsPerQ);
  const paceDelta = current - expectedIndex; // positive = ahead
  const onPace = paceDelta >= -1;

  const update = useCallback((patch: Partial<RunnerAnswerState>) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentRef.current] = { ...next[currentRef.current], ...patch };
      return next;
    });
  }, []);

  const revealHint = (tier: number) => {
    if (config.strict) return;
    update({ hintsUsed: Math.max(a.hintsUsed, tier) });
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: config.examId,
          paperId: config.paperId ?? null,
          mode: config.mode,
          startedAtIso: startedAt.current,
          secondsTotal: elapsed,
          responses: questions.map((qq, i) => ({
            questionId: qq.id,
            givenAnswer: answers[i].given,
            secondsSpent: answers[i].secondsSpent,
            hintsUsed: answers[i].hintsUsed,
            confidence: answers[i].confidence,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Submit failed");
      const data = (await res.json()) as { attemptId: number };
      router.push(`/review/${data.attemptId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Submit failed");
      setSubmitting(false);
    }
  }, [submitting, config, elapsed, questions, answers, router]);

  // Auto-submit when timer runs out.
  useEffect(() => {
    if (remaining != null && remaining <= 0 && !submitting) {
      void handleSubmit();
    }
  }, [remaining, submitting, handleSubmit]);

  const canReveal = !config.strict && (config.allowHints || revealed[current]);
  const showSolution = revealed[current] && !config.strict;
  const desmosAllowed = config.allowDesmos && examName === "SAT";

  return (
    <div className="space-y-4">
      {/* Top bar: timer + pace */}
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
        <div>
          <div className="text-sm font-semibold text-content">{config.title}</div>
          <div className="text-xs text-content-subtle">{config.subtitle}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className={`tabular-nums text-xl font-bold ${remaining != null && remaining < 60 ? "text-rose-600" : "text-content"}`}>
              {remaining != null ? formatClock(remaining) : formatClock(elapsed)}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-content-subtle">
              {remaining != null ? "remaining" : "elapsed"}
            </div>
          </div>
          <div className="text-center">
            <div className={`text-sm font-bold ${onPace ? "text-emerald-600" : "text-rose-600"}`}>
              {onPace ? "On pace" : `${Math.abs(paceDelta)} behind`}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-content-subtle">
              ~{Math.round(config.paceSecondsPerQ)}s/Q
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`btn-${accent}`}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        {/* Question column */}
        <div className="space-y-4">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-content-subtle">
                <span className="font-semibold text-content-muted">Q{current + 1}</span>
                <span>of {questions.length}</span>
                {q.topic_subtopic && (
                  <span className="badge bg-surface-muted text-content-muted">{q.topic_subtopic}</span>
                )}
                {q.difficulty && <span className="badge bg-surface-muted text-content-muted">{q.difficulty}</span>}
              </div>
              <button
                onClick={() => update({ flagged: !a.flagged })}
                className={`text-xs ${a.flagged ? "text-amber-600 font-semibold" : "text-content-subtle"}`}
              >
                {a.flagged ? "★ Flagged" : "☆ Flag"}
              </button>
            </div>

            <Markdown className="text-[15px]">{q.prompt_md}</Markdown>

            {desmosAllowed && q.desmos_recommended === 1 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-sat/10 px-3 py-2 text-sm text-sat-dark">
                <span>📈 Desmos can help here.</span>
                <button onClick={() => setShowDesmos(true)} className="font-semibold underline">
                  Open calculator
                </button>
              </div>
            )}

            {/* Answer input */}
            <div className="mt-4 space-y-2">
              {q.choices ? (
                q.choices.map((choice, idx) => {
                  const selected = a.given === choice;
                  return (
                    <button
                      key={idx}
                      onClick={() => update({ given: choice })}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                        selected
                          ? accent === "tmua"
                            ? "border-tmua bg-tmua/5 ring-1 ring-tmua"
                            : "border-sat bg-sat/5 ring-1 ring-sat"
                          : "border-line hover:bg-surface-muted"
                      }`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selected ? (accent === "tmua" ? "bg-tmua text-white" : "bg-sat text-white") : "bg-surface-muted text-content-muted"}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <Markdown>{choice}</Markdown>
                    </button>
                  );
                })
              ) : (
                <input
                  className="input"
                  placeholder="Type your answer…"
                  value={a.given ?? ""}
                  onChange={(e) => update({ given: e.target.value })}
                />
              )}
            </div>

            {/* Confidence */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs font-medium text-content-subtle">Confidence:</span>
              {CONFIDENCE_OPTS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update({ confidence: opt.value })}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                    a.confidence === opt.value ? opt.tone : "bg-surface text-content-subtle ring-line"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hints (learning mode) */}
          {canReveal && (
            <div className="card space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-content-subtle">
                Hints {config.strict ? "" : "(nudge → method → key step)"}
              </div>
              {[q.hint1_md, q.hint2_md, q.hint3_md].map((hint, i) =>
                hint ? (
                  a.hintsUsed > i ? (
                    <div key={i} className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
                      <Markdown>{hint}</Markdown>
                    </div>
                  ) : (
                    <button
                      key={i}
                      onClick={() => revealHint(i + 1)}
                      className="btn-ghost text-xs"
                      disabled={a.hintsUsed < i}
                    >
                      Reveal hint {i + 1}
                    </button>
                  )
                ) : null,
              )}
              {!showSolution ? (
                <button onClick={() => setRevealed((r) => r.map((v, idx) => (idx === current ? true : v)))} className="btn-outline text-xs">
                  Show full solution
                </button>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                  <div className="text-xs font-semibold text-emerald-700">Solution</div>
                  <Markdown className="text-sm">{q.solution_md ?? "_No solution provided._"}</Markdown>
                  {q.faster_method_md && (
                    <div className="mt-2 rounded bg-sat/10 px-2 py-1 text-sm text-sat-dark">
                      <strong>Faster method:</strong> <Markdown>{q.faster_method_md}</Markdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {desmosAllowed && showDesmos && (
            <div className="card">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-sat-dark">Desmos calculator</span>
                <button onClick={() => setShowDesmos(false)} className="text-xs text-content-subtle">
                  Close
                </button>
              </div>
              <DesmosCalculator state={q.desmos_state_json} height={360} />
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="btn-outline"
            >
              ← Previous
            </button>
            {desmosAllowed && (
              <button onClick={() => setShowDesmos((s) => !s)} className="btn-ghost text-xs">
                {showDesmos ? "Hide" : "📈 Desmos"}
              </button>
            )}
            {current < questions.length - 1 ? (
              <button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))} className={`btn-${accent}`}>
                Next →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className={`btn-${accent}`}>
                Finish & submit
              </button>
            )}
          </div>
        </div>

        {/* Navigator */}
        <div className="card h-fit lg:sticky lg:top-20">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-subtle">
            Navigator · {answeredCount}/{questions.length}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((_, i) => {
              const ans = answers[i];
              const done = ans.given != null && ans.given !== "";
              return (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`relative h-9 rounded-lg text-xs font-semibold transition-colors ${
                    i === current
                      ? "bg-content text-white"
                      : done
                        ? accent === "tmua"
                          ? "bg-tmua/15 text-tmua-dark"
                          : "bg-sat/15 text-sat-dark"
                        : "bg-surface-muted text-content-subtle"
                  }`}
                >
                  {i + 1}
                  {ans.flagged && <span className="absolute -right-0.5 -top-0.5 text-amber-500">★</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-3 space-y-1 text-[11px] text-content-subtle">
            <div>● answered ○ unanswered ★ flagged</div>
            {config.mode === "exam" && <div className="text-amber-600">Exam mode — solutions hidden until submit.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

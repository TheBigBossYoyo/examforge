"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Markdown } from "@/components/Markdown";
import type { DesmosDrill } from "@/lib/desmos-drills";

const DesmosCalculator = dynamic(
  () => import("@/components/Desmos").then((m) => m.DesmosCalculator),
  { ssr: false, loading: () => <div className="p-4 text-sm text-content-subtle">Loading Desmos…</div> },
);

/** The drill payload the client is allowed to see — no answer, no method. */
export type DrillClient = Omit<DesmosDrill, "correct_answer" | "method_md" | "tradeoff_md">;

interface Result {
  correct: boolean;
  seconds: number;
  parSeconds: number;
  beatPar: boolean;
  correctAnswer: string;
  method_md: string;
  tradeoff_md: string;
}

export function DesmosDrillRunner({ drills }: { drills: DrillClient[] }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number>(0);

  const drill = drills[index];

  // Tenth-of-a-second resolution: par times are 12-40s, so whole seconds
  // would make "beat par" feel arbitrary at the boundary.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed((Date.now() - startedAt.current) / 1000);
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    startedAt.current = Date.now();
    setElapsed(0);
    setRunning(true);
    setResult(null);
    setAnswer("");
    setError(null);
  }, []);

  const submit = useCallback(async () => {
    if (!running || submitting) return;
    const seconds = (Date.now() - startedAt.current) / 1000;
    setRunning(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/desmos-drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drillCode: drill.code, answer, seconds }),
      });
      const data = (await res.json()) as Result & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not record drill");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record drill");
      setRunning(true); // let them try again rather than losing the attempt
    } finally {
      setSubmitting(false);
    }
  }, [running, submitting, drill, answer]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % drills.length);
    setResult(null);
    setAnswer("");
    setElapsed(0);
    setRunning(false);
    setError(null);
  }, [drills.length]);

  if (!drill) return null;

  const overPar = elapsed > drill.par_seconds;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_460px]">
      {/* ---- drill ---- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-content-subtle">
              Drill {index + 1} of {drills.length} · {drill.skill}
            </div>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-content">
              {drill.title}
            </h2>
          </div>
          <div className="text-right">
            <div
              className={`tabular-nums text-2xl font-bold ${
                !running && !result ? "text-content-subtle" : overPar ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {elapsed.toFixed(1)}s
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-content-subtle">
              par {drill.par_seconds}s
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line p-5">
          <Markdown className="text-[15px]">{drill.prompt_md}</Markdown>

          {!running && !result && (
            <button onClick={start} className="btn-sat mt-4">
              Start drill — clock runs
            </button>
          )}

          {running && (
            <div className="mt-4 flex gap-2">
              <input
                className="input max-w-[200px]"
                placeholder="Your answer"
                value={answer}
                autoFocus
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submit();
                }}
              />
              <button onClick={submit} disabled={submitting} className="btn-sat">
                {submitting ? "…" : "Submit"}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          )}
        </div>

        {result && (
          <div
            className={`rounded-2xl border p-5 ${
              result.correct
                ? result.beatPar
                  ? "border-emerald-200 bg-emerald-50/50"
                  : "border-amber-200 bg-amber-50/50"
                : "border-rose-200 bg-rose-50/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight">
                {result.correct
                  ? result.beatPar
                    ? "Correct — inside par"
                    : "Correct — but slow"
                  : "Not correct"}
              </span>
              <span className="text-sm text-content-muted">
                {result.seconds.toFixed(1)}s vs {result.parSeconds}s par
              </span>
            </div>

            {!result.correct && (
              <p className="mt-1 text-sm text-content-muted">
                Answer: <strong>{result.correctAnswer}</strong>
              </p>
            )}
            {result.correct && !result.beatPar && (
              <p className="mt-1 text-sm text-content-muted">
                Right answer, but {(result.seconds - result.parSeconds).toFixed(1)}s over. On test
                day that time comes out of a later question.
              </p>
            )}

            <div className="mt-3 border-t border-line/60 pt-3">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-content-subtle">
                The fast method
              </div>
              <Markdown className="mt-1 text-sm">{result.method_md}</Markdown>
            </div>

            <div className="mt-3 border-t border-line/60 pt-3">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-content-subtle">
                Versus doing it by hand
              </div>
              <Markdown className="mt-1 text-sm">{result.tradeoff_md}</Markdown>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={start} className="btn-outline text-sm">
                Retry this drill
              </button>
              <button onClick={next} className="btn-sat text-sm">
                Next drill →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- calculator ---- */}
      <div>
        <div className="sticky top-4">
          <div className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-content-subtle">
            Desmos — same calculator as the test
          </div>
          <DesmosCalculator state={drill.desmos_state_json ?? null} height={460} />
        </div>
      </div>
    </div>
  );
}

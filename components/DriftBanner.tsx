"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface DriftView {
  examId: number;
  examName: string;
  status: "behind" | "ahead" | "on_track";
  reason: string;
  backlogMinutes: number;
  netDays: number;
}

/**
 * Surfaces schedule drift and offers to re-fit the plan.
 *
 * Deliberately NOT automatic. Silently rewriting the plan out from under
 * someone who opens the page is worse than showing them the drift and letting
 * them decide — especially when "behind" is often a deliberate choice.
 */
export function DriftBanner({ drift }: { drift: DriftView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (drift.status === "on_track") return null;

  const behind = drift.status === "behind";

  const replan = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "replan", examId: drift.examId, force: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Replan failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replan failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${
        behind
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-emerald-500/30 bg-emerald-500/5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-content">
            {drift.examName} — {behind ? "behind schedule" : "ahead of schedule"} by{" "}
            {Math.abs(drift.netDays).toFixed(1)} study day
            {Math.abs(drift.netDays) === 1 ? "" : "s"}
          </div>
          <p className="mt-1 text-sm text-content-muted">{drift.reason}</p>
          {behind && (
            <p className="mt-1 text-xs text-content-subtle">
              Replanning rewrites future days only — completed work is never undone.
            </p>
          )}
        </div>
        <button onClick={replan} disabled={busy} className="btn-outline shrink-0">
          {busy ? "Replanning…" : "Re-fit the plan"}
        </button>
      </div>
      {error && (
        <div className="mt-2 rounded-lg bg-rose-500/10 px-3 py-1.5 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
    </div>
  );
}

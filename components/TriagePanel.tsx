"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { ROOT_CAUSES, ROOT_CAUSE_ACTIONS, ROOT_CAUSE_LABELS, type RootCause } from "@/lib/error-log";

export interface TriageItem {
  id: number;
  prompt_md: string;
  area: string | null;
  subtopic: string | null;
  seconds_spent: number;
  budget_seconds: number;
  confidence: string | null;
  suggestion: { cause: RootCause; reason: string; confidence: number };
}

/**
 * Root-cause triage.
 *
 * The system's suggestion is shown as a suggestion — pre-selected but clearly
 * labelled and freely overridable. Recording a guess as though it were the
 * student's own judgement is how an error log stops being trustworthy.
 */
export function TriagePanel({ items }: { items: TriageItem[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const item = items[index];

  const submit = async (cause: RootCause) => {
    if (!item || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mistakeId: item.id, rootCause: cause }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save");
      setDone((d) => d + 1);
      if (index < items.length - 1) setIndex((i) => i + 1);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!item) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 text-sm text-emerald-800">
        {done > 0
          ? `All caught up — ${done} mistake${done === 1 ? "" : "s"} triaged.`
          : "Nothing to triage. Every logged mistake already has a confirmed reason."}
      </div>
    );
  }

  const over = item.seconds_spent > item.budget_seconds;

  return (
    <div className="rounded-2xl border border-line p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-content-subtle">
          Triage {index + 1} of {items.length}
          {item.subtopic ? ` · ${item.subtopic}` : ""}
        </div>
        <div className={`text-xs font-semibold ${over ? "text-rose-600" : "text-content-subtle"}`}>
          {Math.round(item.seconds_spent)}s / {Math.round(item.budget_seconds)}s budget
        </div>
      </div>

      <div className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-surface-muted/60 p-3">
        <Markdown className="text-sm">{item.prompt_md}</Markdown>
      </div>

      <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-sky-700">
          Suggested — not recorded until you confirm
        </div>
        <p className="mt-1 text-sm text-content-muted">{item.suggestion.reason}</p>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-content-subtle">
          Why did you miss it?
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROOT_CAUSES.map((cause) => {
            const suggested = cause === item.suggestion.cause;
            return (
              <button
                key={cause}
                onClick={() => submit(cause)}
                disabled={saving}
                className={`rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                  suggested
                    ? "border-ink-900 bg-surface-muted ring-1 ring-ink-900"
                    : "border-line hover:bg-surface-muted"
                }`}
              >
                <div className="text-sm font-bold text-content">
                  {ROOT_CAUSE_LABELS[cause]}
                  {suggested && (
                    <span className="ml-1.5 text-[10px] font-extrabold uppercase tracking-widest text-sky-600">
                      suggested
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs leading-snug text-content-muted">
                  {ROOT_CAUSE_ACTIONS[cause]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-content-subtle">
        <span>{done} triaged this session</span>
        {index < items.length - 1 && (
          <button onClick={() => setIndex((i) => i + 1)} className="hover:text-content-muted">
            Skip →
          </button>
        )}
      </div>
    </div>
  );
}

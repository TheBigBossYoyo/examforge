"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { Badge } from "@/components/ui";

export interface ReviewCard {
  card_id: number;
  kind: string;
  front_md: string;
  back_md: string;
  hint_md: string | null;
  exam_name: string;
  reps: number;
}

const GRADES: { grade: 0 | 1 | 2 | 3; label: string; hint: string; tone: string }[] = [
  { grade: 0, label: "Again", hint: "No idea", tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  { grade: 1, label: "Hard", hint: "Got it, slowly", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { grade: 2, label: "Good", hint: "Recalled it", tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  { grade: 3, label: "Easy", hint: "Instant", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
];

export function FlashcardReview({ cards }: { cards: ReviewCard[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const card = cards[index];

  const grade = useCallback(
    async (g: 0 | 1 | 2 | 3) => {
      if (!card || saving) return;
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/srs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card.card_id, grade: g }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Could not save");
        setDone((d) => d + 1);
        setRevealed(false);
        if (index < cards.length - 1) setIndex((i) => i + 1);
        else router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      } finally {
        setSaving(false);
      }
    },
    [card, saving, index, cards.length, router],
  );

  // Space reveals, 1-4 grade. Keeps a long review session on the keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && /^[1-4]$/.test(e.key)) {
        void grade((Number(e.key) - 1) as 0 | 1 | 2 | 3);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, grade]);

  if (!card) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <div className="text-lg font-bold text-content">
          {done > 0 ? `Done — ${done} card${done === 1 ? "" : "s"} reviewed.` : "Nothing due today."}
        </div>
        <p className="mt-1 text-sm text-content-muted">
          Spaced repetition means an empty queue is the goal, not a failure. Come back tomorrow.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-content-subtle">
        <span>
          Card {index + 1} of {cards.length}
        </span>
        <div className="flex items-center gap-2">
          <Badge tone={card.exam_name === "TMUA" ? "tmua" : "sat"}>{card.exam_name}</Badge>
          <Badge tone="ink">{card.kind}</Badge>
          {card.reps === 0 && <Badge tone="blue">new</Badge>}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface-raised p-8 text-center shadow-sm">
        <Markdown className="text-lg font-semibold text-content">{card.front_md}</Markdown>

        {!revealed ? (
          <>
            {card.hint_md && (
              <p className="mt-3 text-xs text-content-subtle">{card.hint_md}</p>
            )}
            <button onClick={() => setRevealed(true)} className="btn-outline mt-6">
              Show answer <span className="text-content-subtle">(space)</span>
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto my-5 h-px w-16 bg-line" />
            <Markdown className="text-[15px] text-content">{card.back_md}</Markdown>
            {card.hint_md && <p className="mt-3 text-xs text-content-subtle">{card.hint_md}</p>}

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GRADES.map((g, i) => (
                <button
                  key={g.grade}
                  onClick={() => grade(g.grade)}
                  disabled={saving}
                  className={`rounded-xl px-3 py-2.5 text-sm font-bold transition-opacity disabled:opacity-50 ${g.tone}`}
                >
                  {g.label}
                  <span className="block text-[10px] font-medium opacity-70">
                    {g.hint} · {i + 1}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <p className="mt-3 text-center text-xs text-content-subtle">{done} reviewed this session</p>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { Badge, Card, EmptyState, Bar } from "@/components/ui";
import type { DueCard } from "@/lib/srs";
import type { Exam } from "@/lib/types";

type Grade = 0 | 1 | 2 | 3;

async function postSrs(body: { action: "grade" | "seed"; cardId?: number; grade?: Grade; examId?: number }) {
  const res = await fetch("/api/srs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export function ReviewQueue({ dueCards, exams }: { dueCards: DueCard[]; exams: Exam[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [busy, setBusy] = useState(false);

  const examMap = useMemo(() => new Map(exams.map((exam) => [exam.id, exam])), [exams]);
  const remaining = dueCards.slice(index);
  const current = remaining[0];

  const grade = async (value: Grade) => {
    if (!current) return;
    setBusy(true);
    const ok = await postSrs({ action: "grade", cardId: current.id, grade: value });
    setBusy(false);
    if (!ok) return;
    setShowAnswer(false);
    if (remaining.length <= 1) {
      router.refresh();
      return;
    }
    setIndex((v) => v + 1);
  };

  const seed = async (examId: number) => {
    setBusy(true);
    const ok = await postSrs({ action: "seed", examId });
    setBusy(false);
    if (ok) router.refresh();
  };

  if (!current) {
    return (
      <EmptyState
        icon="🧠"
        title="No due review cards"
        description="Build a queue from weak topics to start spaced repetition today."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {exams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => seed(exam.id)}
                disabled={busy}
                className={exam.name === "TMUA" ? "btn-tmua" : "btn-sat"}
              >
                Build {exam.name} review queue
              </button>
            ))}
          </div>
        }
      />
    );
  }

  const exam = examMap.get(current.exam_id);
  const tone = exam?.name === "SAT" ? "sat" : "tmua";
  const progress = dueCards.length ? index / dueCards.length : 0;

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={tone}>{exam?.name ?? "Review"}</Badge>
            {current.subtopic && <Badge tone="ink">{current.subtopic}</Badge>}
          </div>
          <h2 className="mt-1 text-lg font-semibold text-ink-900">Due now</h2>
          <p className="mt-1 text-sm text-ink-500">Again = reset, Hard = short interval, Good = standard interval, Easy = longer interval.</p>
        </div>
        <div className="text-right text-sm text-ink-500">
          <div>{index + 1} / {dueCards.length}</div>
          <div>{dueCards.length - index - 1} left after this</div>
        </div>
      </div>

      <Bar value={progress} color={exam?.name === "SAT" ? "bg-sat" : "bg-tmua"} />

      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-ink-400">
          {current.area && <span>{current.area}</span>}
          {current.due_date && <span>Due {current.due_date}</span>}
        </div>
        <Markdown className="text-sm">{current.prompt_md ?? `Review the key idea behind **${current.subtopic ?? "this topic"}**.`}</Markdown>
      </div>

      {!showAnswer ? (
        <button onClick={() => setShowAnswer(true)} className="btn-outline w-full" disabled={busy}>
          Reveal answer
        </button>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Correct answer</div>
            <div className="mt-1 font-semibold text-emerald-900">{current.correct_answer ?? "Use your topic notes and solve it fully."}</div>
            {current.solution_md && <Markdown className="mt-3 text-sm">{current.solution_md}</Markdown>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => grade(0)} disabled={busy} className="btn-outline border-rose-200 text-rose-700">
              Again
            </button>
            <button onClick={() => grade(1)} disabled={busy} className="btn-outline border-amber-200 text-amber-700">
              Hard
            </button>
            <button onClick={() => grade(2)} disabled={busy} className="btn-outline border-sky-200 text-sky-700">
              Good
            </button>
            <button onClick={() => grade(3)} disabled={busy} className="btn-outline border-emerald-200 text-emerald-700">
              Easy
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

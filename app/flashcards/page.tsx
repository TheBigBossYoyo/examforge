import { getDeckStats, getDueFlashcards } from "@/lib/flashcards";
import { FlashcardReview, type ReviewCard } from "@/components/FlashcardReview";
import { Bar, Card, SectionHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function FlashcardsPage() {
  const due = getDueFlashcards(undefined, 30);
  const stats = getDeckStats();

  const cards: ReviewCard[] = due.map((c) => ({
    card_id: c.card_id,
    kind: c.kind,
    front_md: c.front_md,
    back_md: c.back_md,
    hint_md: c.hint_md,
    exam_name: c.exam_name,
    reps: c.reps,
  }));

  const totalCards = stats.reduce((s, d) => s + d.total, 0);
  const totalLearned = stats.reduce((s, d) => s + d.learned, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader
        title="Formulas & vocabulary"
        subtitle="Spaced repetition for the things that must be instant on test day — including the formulas the SAT reference sheet does NOT give you."
        right={
          <div className="text-right">
            <div className="text-3xl font-extrabold tracking-tight text-content">{due.length}</div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-content-subtle">
              due today
            </div>
          </div>
        }
      />

      {totalCards === 0 ? (
        <Card>
          <p className="text-sm text-content-muted">
            The deck is empty. Run <code className="rounded bg-surface-muted px-1">npm run seed</code>{" "}
            to load the shipped formulas and vocabulary.
          </p>
        </Card>
      ) : (
        <>
          <FlashcardReview cards={cards} />

          <Card className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-content-subtle">
                Deck progress
              </span>
              <span className="text-xs text-content-muted">
                {totalLearned}/{totalCards} learned
              </span>
            </div>
            <Bar value={totalCards > 0 ? totalLearned / totalCards : 0} />
            <p className="mt-2 text-xs text-content-subtle">
              A card counts as learned once spaced repetition has pushed its interval past a week.
            </p>

            <div className="mt-4 space-y-2">
              {stats.map((d) => (
                <div
                  key={`${d.exam_name}-${d.kind}`}
                  className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-content">
                    {d.exam_name} · {d.kind}
                  </span>
                  <span className="text-content-muted">
                    {d.learned}/{d.total} learned
                    {d.due > 0 && <span className="ml-2 text-amber-600">{d.due} due</span>}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

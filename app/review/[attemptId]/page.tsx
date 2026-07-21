import Link from "next/link";
import { notFound } from "next/navigation";
import { getAttempt, getExamById, getQuestion } from "@/lib/queries";
import { getAttemptResponses } from "@/lib/attempts";
import { paceFor } from "@/lib/launch";
import { Card, Badge, StatCard, ProgressRing, LinkButton, SectionHeader } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { formatClock, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

const CONF_TONE: Record<string, "green" | "amber" | "rose"> = {
  confident: "green",
  unsure: "amber",
  guessed: "rose",
};

export default function ReviewPage({ params }: { params: { attemptId: string } }) {
  const attemptId = Number(params.attemptId);
  if (!Number.isFinite(attemptId)) notFound();

  const attempt = getAttempt(attemptId);
  if (!attempt) notFound();

  const exam = getExamById(attempt.exam_id);
  if (!exam) notFound();

  const tone = exam.name === "TMUA" ? "tmua" : "sat";
  const responses = getAttemptResponses(attemptId);
  const total = responses.length;
  const correct = responses.filter((r) => r.is_correct === 1).length;
  const accuracy = total > 0 ? correct / total : 0;

  // Score label
  let scoreLabel = "—";
  let scoreSub = "";
  if (attempt.scaled_score != null) {
    if (exam.name === "TMUA") {
      scoreLabel = attempt.scaled_score.toFixed(1);
      scoreSub = "/ 9.0 (estimate)";
    } else {
      scoreLabel = String(attempt.scaled_score);
      scoreSub = "/ 800 (estimate)";
    }
  }

  const wrongIds: number[] = [];
  const rows = responses.map((r) => {
    const q = getQuestion(r.question_id);
    const pace = q ? paceFor(exam.name, q.topic_area) : 0;
    const overPace = r.seconds_spent > pace * 1.25;
    if (r.is_correct === 0) wrongIds.push(r.question_id);
    return { r, q, pace, overPace };
  });

  // Confidence calibration: confident-but-wrong is the costly quadrant.
  const confidentWrong = rows.filter(
    (x) => x.r.confidence === "confident" && x.r.is_correct === 0,
  ).length;
  const guessedRight = rows.filter(
    (x) => x.r.confidence === "guessed" && x.r.is_correct === 1,
  ).length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Attempt review"
        subtitle={`${exam.name} · ${attempt.mode} · ${formatClock(attempt.seconds_total ?? 0)} total`}
        right={
          <div className="flex gap-2">
            {wrongIds.length > 0 && (
              <LinkButton
                href={`/practice?exam=${exam.name}&mode=redo&ids=${wrongIds.join(",")}&title=${encodeURIComponent("Redo wrong answers")}`}
                variant={tone}
              >
                ↻ Redo {wrongIds.length} wrong
              </LinkButton>
            )}
            <LinkButton href="/mistakes" variant="outline">
              Mistake notebook
            </LinkButton>
          </div>
        }
      />

      {/* Summary */}
      <Card className="flex flex-col items-center gap-6 sm:flex-row">
        <ProgressRing
          value={accuracy}
          color={tone === "tmua" ? "#6d5dfc" : "#0ea5a4"}
          size={128}
          label={<span className={tone === "tmua" ? "text-tmua-dark" : "text-sat-dark"}>{scoreLabel}</span>}
          sublabel={scoreSub}
        />
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Correct" value={`${correct}/${total}`} tone={tone} />
          <StatCard label="Accuracy" value={pct(accuracy)} />
          <StatCard label="Confident · wrong" value={confidentWrong} hint="genuine gaps" />
          <StatCard label="Guessed · right" value={guessedRight} hint="luck — review these" />
        </div>
      </Card>

      {/* Per-question breakdown */}
      <div className="space-y-3">
        {rows.map(({ r, q, pace, overPace }, i) => {
          const ok = r.is_correct === 1;
          if (!q) {
            return (
              <Card key={r.id}>
                <p className="text-sm text-content-subtle">Question #{r.question_id} no longer in bank.</p>
              </Card>
            );
          }
          return (
            <Card key={r.id} className={ok ? "" : "ring-1 ring-rose-200"}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-content-muted">Q{i + 1}</span>
                <Badge tone={ok ? "green" : "rose"}>{ok ? "Correct" : "Incorrect"}</Badge>
                {q.topic_subtopic && <Badge tone="ink">{q.topic_subtopic}</Badge>}
                {q.difficulty && <Badge tone="ink">{q.difficulty}</Badge>}
                {r.confidence && <Badge tone={CONF_TONE[r.confidence]}>{r.confidence}</Badge>}
                <span className={`ml-auto text-xs ${overPace ? "text-rose-600 font-medium" : "text-content-subtle"}`}>
                  {formatClock(r.seconds_spent)} {overPace ? `(slow · ~${pace}s pace)` : `/ ~${pace}s`}
                </span>
              </div>

              <Markdown className="text-[15px]">{q.prompt_md}</Markdown>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className={`rounded-lg px-3 py-2 text-sm ${ok ? "bg-emerald-50" : "bg-rose-50"}`}>
                  <span className="text-xs font-medium uppercase tracking-wide text-content-subtle">Your answer</span>
                  <div className={`font-medium ${ok ? "text-emerald-700" : "text-rose-700"}`}>
                    {r.given_answer ?? <span className="italic text-content-subtle">blank</span>}
                  </div>
                </div>
                {!ok && (
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                    <span className="text-xs font-medium uppercase tracking-wide text-content-subtle">Correct answer</span>
                    <div className="font-medium text-emerald-700">{q.correct_answer}</div>
                  </div>
                )}
              </div>

              {q.solution_md && (
                <details className="mt-3 group" open={!ok}>
                  <summary className="cursor-pointer text-sm font-semibold text-content-muted hover:text-content">
                    Solution
                  </summary>
                  <div className="mt-2 rounded-lg border border-line bg-surface-muted/60 px-3 py-2">
                    <Markdown className="text-sm">{q.solution_md}</Markdown>
                    {q.faster_method_md && (
                      <div className="mt-2 rounded bg-sat/10 px-2 py-1 text-sm text-sat-dark">
                        <strong>Faster method:</strong> <Markdown className="inline text-sm">{q.faster_method_md}</Markdown>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Link href="/" className="text-sm text-content-subtle hover:text-content-muted">
          ← Dashboard
        </Link>
        <Link href={`/analytics`} className="text-sm text-content-subtle hover:text-content-muted">
          See analytics →
        </Link>
      </div>
    </div>
  );
}

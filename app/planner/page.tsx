import { Markdown } from "@/components/Markdown";
import { PlannerBoard } from "@/components/PlannerBoard";
import { ReviewQueue } from "@/components/ReviewQueue";
import { Badge, Card, EmptyState, LinkButton, ProgressRing, SectionHeader, StatCard, Bar } from "@/components/ui";
import { effectiveExamDate, getExams } from "@/lib/queries";
import { countDue, getDueCards } from "@/lib/srs";
import { formatDate } from "@/lib/format";
import { getAgenda, getDrift, getPhaseInfo } from "@/lib/planner";
import { DriftBanner, type DriftView } from "@/components/DriftBanner";

export const dynamic = "force-dynamic";

export default function PlannerPage() {
  const exams = getExams();

  if (exams.length === 0) {
    return (
      <Card>
        <h1 className="text-lg font-semibold text-content">Database not seeded</h1>
        <p className="mt-2 text-sm text-content-muted">
          Run <code className="rounded bg-surface-muted px-1.5 py-0.5">npm run seed</code> to initialise exams,
          topics, and question data before generating a plan.
        </p>
      </Card>
    );
  }

  const agenda = getAgenda(undefined, 28);
  const phase = getPhaseInfo();
  const drifts: DriftView[] = exams.map((exam) => {
    const d = getDrift(exam.id);
    return {
      examId: exam.id,
      examName: exam.name,
      status: d.status,
      reason: d.reason,
      backlogMinutes: d.backlogMinutes,
      netDays: d.netDays,
    };
  });
  const dueCards = getDueCards(undefined, 24);
  const dueCount = countDue();
  const completed = agenda.filter((item) => item.done === 1).length;
  const completion = agenda.length ? completed / agenda.length : 0;

  return (
    <div className="space-y-6">
      {drifts.map((d) => (
        <DriftBanner key={d.examId} drift={d} />
      ))}
      <SectionHeader
        title="Study planner + spaced repetition"
        subtitle="Daily agenda first, due-card review beside it. Every workload number here is an estimate."
        right={
          <div className="flex flex-wrap gap-2">
            {exams.map((exam) => (
              <Badge key={exam.id} tone={exam.name === "TMUA" ? "tmua" : "sat"}>
                {exam.name} · {formatDate(effectiveExamDate(exam))}
              </Badge>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
        <Card className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <ProgressRing
                value={completion}
                color="#6d5dfc"
                size={104}
                label={`${Math.round(completion * 100)}%`}
                sublabel="done"
              />
              <div>
                <h2 className="text-lg font-semibold text-content">Forward plan</h2>
                <p className="mt-1 text-sm text-content-muted">Generated work is grouped by date and weighted toward weak topics.</p>
              </div>
            </div>
            <LinkButton href="/practice" variant="outline">
              Open practice hub
            </LinkButton>
          </div>
          <Bar value={completion} color="bg-tmua" />
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Upcoming tasks" value={agenda.length} hint="Today + next 28 days" />
            <StatCard label="Completed" value={completed} hint="Checked off in this agenda" />
            <StatCard label="Due cards" value={dueCount} hint="Ready for SM-2 review" tone="sat" />
          </div>
          {agenda.length === 0 && (
            <EmptyState
              icon="🗓"
              title="No plan generated yet"
              description="Use the exam buttons below to generate a targeted agenda from now until the exam date."
            />
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-content">Review queue snapshot</h2>
              <p className="mt-1 text-sm text-content-muted">Again / Hard / Good / Easy feed the SM-2 schedule.</p>
            </div>
            <Badge tone={dueCount > 0 ? "green" : "ink"}>{dueCount} due</Badge>
          </div>
          <Markdown className="text-sm">
            {"**SM-2 estimate** — review intervals adapt after every grade. Use the live queue below to reschedule cards."}
          </Markdown>
          <Bar value={Math.min(1, dueCount / 12)} color="bg-sat" />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr,0.95fr]">
        <PlannerBoard agenda={agenda} exams={exams} phase={phase} />
        <div className="space-y-4">
          <ReviewQueue dueCards={dueCards} exams={exams} />
        </div>
      </div>
    </div>
  );
}

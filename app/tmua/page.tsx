import Link from "next/link";
import { getExam, getExamDashboard, getTopics, getProgressMap } from "@/lib/queries";
import { Card, SectionHeader, ProgressRing, StatCard, Badge, LinkButton, EmptyState } from "@/components/ui";
import { Countdown } from "@/components/Countdown";
import { masteryColor } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function TmuaHubPage() {
  const tmua = getExam("TMUA");
  
  if (!tmua) {
    return (
      <Card>
        <h1 className="text-lg font-semibold">Database not seeded</h1>
        <p className="mt-2 text-sm text-content-muted">
          Run <code className="rounded bg-surface-muted px-1.5 py-0.5">npm run seed</code> to initialise.
        </p>
      </Card>
    );
  }

  const dash = getExamDashboard(tmua);
  const topics = getTopics(tmua.id);
  const progress = getProgressMap(tmua.id);

  const p1Topics = topics.filter(t => t.area === "P1");
  const p2Topics = topics.filter(t => t.area === "P2");

  const weakest = dash.weakest[0];
  const drillWeakestHref = weakest 
    ? `/practice?exam=TMUA&topic=${weakest.topic_id}&mode=drill` 
    : `/practice?exam=TMUA&mode=drill`;

  return (
    <div className="space-y-8">
      <SectionHeader 
        title="TMUA Hub" 
        subtitle="Target 9.0" 
        right={<Badge tone="tmua">{dash.projectedLabel} Projected</Badge>} 
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 flex flex-col justify-center items-center py-8">
          <ProgressRing 
            value={dash.projectedFraction} 
            size={160} 
            color="#6d5dfc" 
            label={<span className="text-tmua-dark">{dash.projectedLabel}</span>} 
            sublabel="/ 9.0 Estimate"
          />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <LinkButton href="/practice?exam=TMUA&mode=exam" variant="tmua">Start Full Simulation</LinkButton>
            <LinkButton href="/practice?exam=TMUA&mode=untimed" variant="outline">Untimed Practice</LinkButton>
            <LinkButton href={drillWeakestHref} variant="outline">Drill Weakest Area</LinkButton>
          </div>
        </Card>

        <div className="space-y-4">
          <StatCard label="Exam Date" value={<Countdown date={dash.examDate} tone="tmua" />} tone="tmua" />
          <StatCard label="Papers Completed" value={dash.papersCompleted} tone="tmua" />
          <StatCard label="Avg Score" value={dash.avgScoreLabel} tone="tmua" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-content">Paper 1 Topics</h2>
            <Link href="/tmua/practice" className="text-xs text-tmua-dark hover:underline">View all</Link>
          </div>
          <ul className="space-y-2">
            {p1Topics.slice(0, 5).map(t => {
              const p = progress.get(t.id);
              const mastery = p?.mastery ?? 0;
              return (
                <li key={t.id} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${masteryColor(mastery)}`} />
                  <span className="flex-1 truncate text-sm text-content-muted">{t.subtopic}</span>
                  <span className="text-xs text-content-subtle w-8 text-right">{mastery}%</span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-content">Paper 2 Topics</h2>
            <Link href="/tmua/practice" className="text-xs text-tmua-dark hover:underline">View all</Link>
          </div>
          <ul className="space-y-2">
            {p2Topics.slice(0, 5).map(t => {
              const p = progress.get(t.id);
              const mastery = p?.mastery ?? 0;
              return (
                <li key={t.id} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${masteryColor(mastery)}`} />
                  <span className="flex-1 truncate text-sm text-content-muted">{t.subtopic}</span>
                  <span className="text-xs text-content-subtle w-8 text-right">{mastery}%</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card hover className="flex flex-col items-center justify-center p-6 text-center">
          <span className="text-2xl mb-2">📄</span>
          <Link href="/tmua/papers" className="font-medium text-content after:absolute after:inset-0">Past Papers</Link>
        </Card>
        <Card hover className="flex flex-col items-center justify-center p-6 text-center">
          <span className="text-2xl mb-2">🎯</span>
          <Link href="/tmua/practice" className="font-medium text-content after:absolute after:inset-0">Topic Practice</Link>
        </Card>
        <Card hover className="flex flex-col items-center justify-center p-6 text-center">
          <span className="text-2xl mb-2">📖</span>
          <Link href="/tmua/theory" className="font-medium text-content after:absolute after:inset-0">Theory Notes</Link>
        </Card>
        <Card hover className="flex flex-col items-center justify-center p-6 text-center">
          <span className="text-2xl mb-2">📓</span>
          <Link href="/mistakes?exam=TMUA" className="font-medium text-content after:absolute after:inset-0">Mistakes</Link>
        </Card>
      </div>
    </div>
  );
}

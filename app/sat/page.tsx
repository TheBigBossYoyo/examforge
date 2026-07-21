import Link from "next/link";
import { getExam, getExamDashboard, getTopics, getProgressMap, getOverallAccuracy } from "@/lib/queries";
import { Card, SectionHeader, ProgressRing, StatCard, Badge, LinkButton } from "@/components/ui";
import { Countdown } from "@/components/Countdown";
import { pct, masteryColor } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function SatHubPage() {
  const sat = getExam("SAT");
  
  if (!sat) {
    return (
      <Card>
        <h1 className="text-lg font-semibold">Database not seeded</h1>
      </Card>
    );
  }

  const dash = getExamDashboard(sat);
  const topics = getTopics(sat.id);
  const progress = getProgressMap(sat.id);

  const mathAcc = getOverallAccuracy(sat.id, "Math");
  const rwAcc = getOverallAccuracy(sat.id, "RW");

  const mathTopics = topics.filter(t => t.area === "Math");
  const rwTopics = topics.filter(t => t.area === "RW");

  return (
    <div className="space-y-8">
      <SectionHeader 
        title="SAT Hub" 
        subtitle="Target 1600" 
        right={<Badge tone="sat">{dash.projectedLabel} Projected</Badge>} 
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 flex flex-col justify-center items-center py-8">
          <ProgressRing 
            value={dash.projectedFraction} 
            size={160} 
            color="#0ea5a4" 
            label={<span className="text-sat-dark">{dash.projectedLabel}</span>} 
            sublabel="/ 1600 Estimate"
          />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <LinkButton href="/sat/math" variant="sat">Math Drills</LinkButton>
            <LinkButton href="/sat/reading" variant="outline">Reading Drills</LinkButton>
            <LinkButton href="/sat/writing" variant="outline">Writing Drills</LinkButton>
          </div>
        </Card>

        <div className="space-y-4">
          <StatCard label="Exam Date" value={<Countdown date={dash.examDate} tone="sat" />} tone="sat" />
          <StatCard label="Math Accuracy" value={pct(mathAcc.accuracy, 1)} tone="sat" />
          <StatCard label="RW Accuracy" value={pct(rwAcc.accuracy, 1)} tone="sat" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink-900">Math Topics</h2>
            <Link href="/sat/math" className="text-xs text-sat-dark hover:underline">View all</Link>
          </div>
          <ul className="space-y-2">
            {mathTopics.slice(0, 5).map(t => {
              const p = progress.get(t.id);
              const mastery = p?.mastery ?? 0;
              return (
                <li key={t.id} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${masteryColor(mastery)}`} />
                  <span className="flex-1 truncate text-sm text-ink-700">{t.subtopic}</span>
                  <span className="text-xs text-ink-400 w-8 text-right">{mastery}%</span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink-900">Reading & Writing Topics</h2>
            <div className="flex gap-2 text-xs">
              <Link href="/sat/reading" className="text-sat-dark hover:underline">Reading</Link>
              <span className="text-ink-300">|</span>
              <Link href="/sat/writing" className="text-sat-dark hover:underline">Writing</Link>
            </div>
          </div>
          <ul className="space-y-2">
            {rwTopics.slice(0, 5).map(t => {
              const p = progress.get(t.id);
              const mastery = p?.mastery ?? 0;
              return (
                <li key={t.id} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${masteryColor(mastery)}`} />
                  <span className="flex-1 truncate text-sm text-ink-700">{t.subtopic}</span>
                  <span className="text-xs text-ink-400 w-8 text-right">{mastery}%</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card hover className="flex flex-col items-center justify-center p-6 text-center">
          <span className="text-2xl mb-2">📈</span>
          <Link href="/sat/desmos" className="font-medium text-ink-800 after:absolute after:inset-0">Desmos Training</Link>
        </Card>
        <Card hover className="flex flex-col items-center justify-center p-6 text-center">
          <span className="text-2xl mb-2">📚</span>
          <Link href="/sat/theory" className="font-medium text-ink-800 after:absolute after:inset-0">Grammar Rules</Link>
        </Card>
        <Card hover className="flex flex-col items-center justify-center p-6 text-center">
          <span className="text-2xl mb-2">📓</span>
          <Link href="/mistakes?exam=SAT" className="font-medium text-ink-800 after:absolute after:inset-0">Mistakes</Link>
        </Card>
        <Card hover className="flex flex-col items-center justify-center p-6 text-center">
          <span className="text-2xl mb-2">🔗</span>
          <Link href="/resources?exam=SAT" className="font-medium text-ink-800 after:absolute after:inset-0">Resources</Link>
        </Card>
      </div>
    </div>
  );
}

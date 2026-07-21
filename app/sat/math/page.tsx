import { getExam, getTopics, getProgressMap } from "@/lib/queries";
import { Card, SectionHeader, LinkButton } from "@/components/ui";
import { masteryColor, masteryTextColor } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function SatMathPage() {
  const sat = getExam("SAT");
  
  if (!sat) {
    return (
      <Card>
        <h1 className="text-lg font-semibold">Database not seeded</h1>
      </Card>
    );
  }

  const topics = getTopics(sat.id, "Math");
  const progress = getProgressMap(sat.id);

  return (
    <div className="space-y-8">
      <SectionHeader 
        title="SAT Math" 
        subtitle="Drill algebraic foundations and advanced concepts" 
      />

      <Card className="bg-sky-50 border-sky-200">
        <h2 className="font-semibold text-sky-900">📈 Desmos is available on every SAT Math question.</h2>
        <p className="mt-1 text-sm text-sky-800">
          Learn to rely on Desmos for graphing, solving equations, and checking answers rapidly.
        </p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <LinkButton href="/practice?exam=SAT&area=Math&mode=exam&count=22" variant="sat">
          Full Math Module Simulation (22 Qs)
        </LinkButton>
        <LinkButton href="/practice?exam=SAT&area=Math&mode=drill&count=15" variant="outline">
          Mixed Math Drill
        </LinkButton>
        <LinkButton href="/practice?exam=SAT&area=Math&mode=drill&desmos=1" variant="outline">
          Desmos-recommended Only
        </LinkButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {topics.map(t => {
          const p = progress.get(t.id);
          const mastery = p?.mastery ?? 0;
          return (
            <Card key={t.id} hover className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className={`h-4 w-4 rounded-full ${masteryColor(mastery)} shrink-0`} />
                <div>
                  <div className="font-medium text-content">{t.subtopic}</div>
                  <div className={`text-sm font-semibold ${masteryTextColor(mastery)}`}>{mastery}% mastery</div>
                </div>
              </div>
              <LinkButton href={`/practice?exam=SAT&topic=${t.id}&area=Math&mode=drill`} variant="ghost">
                Drill
              </LinkButton>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

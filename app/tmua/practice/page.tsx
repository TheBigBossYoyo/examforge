import { getExam, getTopics, getProgressMap } from "@/lib/queries";
import { Card, SectionHeader, LinkButton } from "@/components/ui";
import { masteryColor, masteryTextColor } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function TmuaPracticePage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const tmua = getExam("TMUA");
  
  if (!tmua) {
    return (
      <Card>
        <h1 className="text-lg font-semibold">Database not seeded</h1>
      </Card>
    );
  }

  const topics = getTopics(tmua.id);
  const progress = getProgressMap(tmua.id);

  const p1Topics = topics.filter(t => t.area === "P1");
  const p2Topics = topics.filter(t => t.area === "P2");

  return (
    <div className="space-y-8">
      <SectionHeader 
        title="TMUA Topic Practice" 
        subtitle="Drill specific topics to build mastery" 
        right={<LinkButton href="/practice?exam=TMUA&mode=untimed" variant="tmua">Mixed Untimed</LinkButton>}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-content">Paper 1</h2>
            <LinkButton href="/practice?exam=TMUA&area=P1&mode=drill&count=12" variant="outline" className="text-xs py-1">
              Mixed P1 Drill
            </LinkButton>
          </div>
          <div className="space-y-3">
            {p1Topics.map(t => {
              const p = progress.get(t.id);
              const mastery = p?.mastery ?? 0;
              return (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-line bg-surface hover:border-line transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${masteryColor(mastery)}`} />
                    <div>
                      <div className="text-sm font-medium text-content">{t.subtopic}</div>
                      <div className={`text-xs font-semibold ${masteryTextColor(mastery)}`}>{mastery}% mastery</div>
                    </div>
                  </div>
                  <LinkButton href={`/practice?exam=TMUA&topic=${t.id}&mode=drill`} variant="ghost" className="text-sm py-1.5 px-3">
                    Drill
                  </LinkButton>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-content">Paper 2</h2>
            <LinkButton href="/practice?exam=TMUA&area=P2&mode=drill&count=12" variant="outline" className="text-xs py-1">
              Mixed P2 Drill
            </LinkButton>
          </div>
          <div className="space-y-3">
            {p2Topics.map(t => {
              const p = progress.get(t.id);
              const mastery = p?.mastery ?? 0;
              return (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-line bg-surface hover:border-line transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${masteryColor(mastery)}`} />
                    <div>
                      <div className="text-sm font-medium text-content">{t.subtopic}</div>
                      <div className={`text-xs font-semibold ${masteryTextColor(mastery)}`}>{mastery}% mastery</div>
                    </div>
                  </div>
                  <LinkButton href={`/practice?exam=TMUA&topic=${t.id}&mode=drill`} variant="ghost" className="text-sm py-1.5 px-3">
                    Drill
                  </LinkButton>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

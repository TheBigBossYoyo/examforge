import { getExam, getTopics, getProgressMap } from "@/lib/queries";
import { Card, SectionHeader, LinkButton } from "@/components/ui";
import { masteryColor, masteryTextColor } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function SatReadingPage() {
  const sat = getExam("SAT");
  
  if (!sat) {
    return (
      <Card>
        <h1 className="text-lg font-semibold">Database not seeded</h1>
      </Card>
    );
  }

  // Reading uses "RW" area. We can frame the whole RW list here, or filter to likely reading ones.
  // The instructions say "it's fine to show the full RW topic list on both with appropriate framing"
  const topics = getTopics(sat.id, "RW");
  const progress = getProgressMap(sat.id);

  return (
    <div className="space-y-8">
      <SectionHeader 
        title="SAT Reading" 
        subtitle="Information & Ideas, Craft & Structure" 
        right={<LinkButton href="/practice?exam=SAT&area=RW&mode=drill&count=10" variant="sat">Mixed RW Drill</LinkButton>}
      />

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
              <LinkButton href={`/practice?exam=SAT&topic=${t.id}&area=RW&mode=drill`} variant="ghost">
                Drill
              </LinkButton>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

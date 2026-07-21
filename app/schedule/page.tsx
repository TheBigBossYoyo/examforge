import { ScheduleGrid, ScheduleLegend } from "@/components/ScheduleGrid";
import { Badge, Card, SectionHeader } from "@/components/ui";
import { getScheduleBlocks } from "@/lib/schedule";
import { isoWeekIndex, todayIso } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function SchedulePage() {
  const blocks = getScheduleBlocks();
  const weekIndex = isoWeekIndex(todayIso());
  const fortnight = weekIndex % 2 === 0 ? "A" : "B";

  if (blocks.length === 0) {
    return (
      <Card>
        <h1 className="text-lg font-semibold text-ink-900">Schedule not seeded</h1>
        <p className="mt-2 text-sm text-ink-500">
          Run <code className="rounded bg-ink-100 px-1.5 py-0.5">npm run seed</code> to create the
          fixed weekly schedule.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Weekly schedule"
        subtitle="Your fixed week, hour by hour. Study blocks show exactly what to do; everything else is protected time."
        right={
          <div className="flex flex-wrap gap-2">
            <Badge tone="tmua">TMUA · Mon–Thu 14:00–17:00</Badge>
            <Badge tone="sat">SAT · Mon–Thu 07:00–09:00</Badge>
            <Badge tone="amber">Fortnight {fortnight}</Badge>
          </div>
        }
      />

      <Card className="space-y-4">
        <ScheduleLegend />
        <ScheduleGrid blocks={blocks} weekIndex={weekIndex} />
        <p className="text-xs text-ink-400">
          Wednesday TMUA and Thursday SAT alternate fortnightly between a timed past paper and a
          full mock / review (currently fortnight {fortnight}). All durations are an estimate.
        </p>
      </Card>
    </div>
  );
}

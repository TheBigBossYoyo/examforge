import { DESMOS_DRILLS } from "@/lib/desmos-drills";
import { getDrillStats, desmosFluencyPercent } from "@/lib/drill-stats";
import { DesmosDrillRunner, type DrillClient } from "@/components/exam/DesmosDrillRunner";
import { Card, SectionHeader, Badge, Bar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function DesmosDrillsPage() {
  // Strip the answer, method and tradeoff — the client is marked server-side.
  const clientDrills: DrillClient[] = DESMOS_DRILLS.map((d) => ({
    code: d.code,
    title: d.title,
    skill: d.skill,
    prompt_md: d.prompt_md,
    par_seconds: d.par_seconds,
    desmos_state_json: d.desmos_state_json,
  }));

  const stats = getDrillStats();
  const fluency = desmosFluencyPercent();
  const byCode = new Map(stats.map((s) => [s.drill_code, s]));

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHeader
        title="Desmos speed drills"
        subtitle="The lessons teach the techniques. This drills them against a clock — because on test day the value of Desmos is entirely in how fast you reach for it."
        right={
          <div className="text-right">
            <div className="text-3xl font-extrabold tracking-tight text-sat-dark">{fluency}%</div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink-400">
              fluency
            </div>
          </div>
        }
      />

      <Card className="mb-6">
        <div className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-ink-400">
          Progress — a drill counts as fluent once answered correctly inside par
        </div>
        <Bar value={fluency / 100} color="bg-sat" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DESMOS_DRILLS.map((d) => {
            const s = byCode.get(d.code);
            return (
              <div
                key={d.code}
                className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 px-3 py-2"
              >
                <span className="truncate text-xs font-semibold text-ink-700">{d.title}</span>
                {s?.fluent ? (
                  <Badge tone="green">{s.best_seconds?.toFixed(1)}s</Badge>
                ) : s && s.attempts > 0 ? (
                  <Badge tone="amber">{s.attempts} tried</Badge>
                ) : (
                  <Badge tone="ink">par {d.par_seconds}s</Badge>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <DesmosDrillRunner drills={clientDrills} />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { Badge, Bar, Card, EmptyState } from "@/components/ui";
import { formatClock, formatDate } from "@/lib/format";
import { getSessionDef } from "@/lib/sessions";
import type { AgendaItem, PhaseInfo } from "@/lib/planner";
import type { Exam } from "@/lib/types";

async function postPlan(body: {
  action: "generate" | "toggle" | "reallocate";
  examId?: number;
  daysAhead?: number;
  id?: number;
  done?: boolean;
  confirmed?: boolean;
}) {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

function groupByDate(items: AgendaItem[]) {
  return items.reduce<Record<string, AgendaItem[]>>((acc, item) => {
    acc[item.date] ??= [];
    acc[item.date].push(item);
    return acc;
  }, {});
}

function sessionTitle(code: string | null): string | null {
  if (!code) return null;
  return getSessionDef(code)?.title ?? code;
}

export function PlannerBoard({
  agenda,
  exams,
  phase,
}: {
  agenda: AgendaItem[];
  exams: Exam[];
  phase: PhaseInfo;
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const agendaByExam = useMemo(() => {
    const map = new Map<number, AgendaItem[]>();
    for (const exam of exams) map.set(exam.id, []);
    for (const item of agenda) {
      const bucket = map.get(item.exam_id) ?? [];
      bucket.push(item);
      map.set(item.exam_id, bucket);
    }
    return map;
  }, [agenda, exams]);

  const tmuaExam = useMemo(() => exams.find((e) => e.name === "TMUA"), [exams]);

  const run = async (key: string, body: Parameters<typeof postPlan>[0]) => {
    setBusyKey(key);
    const ok = await postPlan(body);
    setBusyKey(null);
    if (ok) router.refresh();
  };

  /** Confirm/revoke reallocation then regenerate the TMUA plan so it takes effect. */
  const setReallocate = async (confirmed: boolean) => {
    const key = "reallocate";
    setBusyKey(key);
    const ok = await postPlan({ action: "reallocate", confirmed });
    if (ok && tmuaExam) {
      await postPlan({ action: "generate", examId: tmuaExam.id, daysAhead: 28 });
    }
    setBusyKey(null);
    if (ok) router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* Phase 2 reallocation — never silent, always confirm first. */}
      {(phase.reallocateAvailable || phase.reallocateConfirmed) && (
        <Card className="space-y-3 border-l-4 border-amber-400">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="amber">Phase 2</Badge>
            <span className="text-sm font-semibold text-ink-900">
              SAT is done — reallocate freed SAT blocks to TMUA?
            </span>
          </div>
          <p className="text-sm text-ink-500">
            Your Mon–Thu 07:00–09:00 SAT blocks are now free. Reallocating fills them with TMUA work
            until exam day. Nothing changes until you confirm.
          </p>
          <div className="flex flex-wrap gap-2">
            {phase.reallocateConfirmed ? (
              <>
                <Badge tone="green">Reallocation active</Badge>
                <button
                  onClick={() => setReallocate(false)}
                  disabled={busyKey === "reallocate"}
                  className="btn-outline"
                >
                  Revoke &amp; restore SAT blocks
                </button>
              </>
            ) : (
              <button
                onClick={() => setReallocate(true)}
                disabled={busyKey === "reallocate"}
                className="btn-tmua"
              >
                Confirm reallocation to TMUA
              </button>
            )}
          </div>
        </Card>
      )}

      {exams.map((exam) => {
        const items = agendaByExam.get(exam.id) ?? [];
        const grouped = groupByDate(items);
        const dates = Object.keys(grouped);
        const done = items.filter((item) => item.done === 1).length;
        const tone = exam.name === "TMUA" ? "tmua" : "sat";
        const buttonClass = exam.name === "TMUA" ? "btn-tmua" : "btn-sat";
        const taper = exam.name === "TMUA" ? phase.tmuaTaper : phase.satTaper;

        return (
          <Card key={exam.id} className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone={tone}>{exam.name}</Badge>
                  <span className="text-xs text-ink-400">Study plan</span>
                  {taper && <Badge tone="amber">Taper</Badge>}
                </div>
                <h2 className="mt-1 text-lg font-semibold text-ink-900">Agenda from today forward</h2>
                <p className="mt-1 text-sm text-ink-500">
                  Tasks are filled into your fixed schedule blocks. Loads are an estimate.
                </p>
              </div>
              <button
                onClick={() =>
                  run(`generate-${exam.id}`, {
                    action: "generate",
                    examId: exam.id,
                    daysAhead: 28,
                  })
                }
                disabled={busyKey === `generate-${exam.id}`}
                className={buttonClass}
              >
                {items.length > 0 ? "Regenerate plan" : "Generate study plan"}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-[160px,1fr] md:items-center">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">Completion</div>
                <div className="mt-1 text-2xl font-bold text-ink-900">
                  {done}/{items.length || 0}
                </div>
              </div>
              <Bar value={items.length ? done / items.length : 0} color={exam.name === "TMUA" ? "bg-tmua" : "bg-sat"} />
            </div>

            {items.length === 0 ? (
              <EmptyState
                icon={exam.name === "TMUA" ? "∫" : "📘"}
                title={`No ${exam.name} plan yet`}
                description="Generate a schedule-driven agenda: each SAT/TMUA block is filled from the session catalogue, weighted toward weak topics, with weekly mocks and a final taper."
              />
            ) : (
              <div className="space-y-4">
                {dates.map((date) => (
                  <section key={date} className="rounded-2xl border border-ink-100 bg-ink-50/40 p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge tone={tone}>{formatDate(date)}</Badge>
                      <span className="text-xs text-ink-400">{grouped[date].length} task{grouped[date].length === 1 ? "" : "s"}</span>
                    </div>
                    <div className="space-y-3">
                      {grouped[date].map((item) => {
                        const itemBusy = busyKey === `toggle-${item.id}`;
                        const title = sessionTitle(item.session_code);
                        return (
                          <div key={item.id} className="rounded-xl border border-white/80 bg-white p-3 shadow-sm">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={item.done === 1}
                                disabled={itemBusy}
                                onChange={(e) =>
                                  run(`toggle-${item.id}`, {
                                    action: "toggle",
                                    id: item.id,
                                    done: e.target.checked,
                                  })
                                }
                                className="mt-1 h-4 w-4 rounded border-ink-300 text-ink-900"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <Badge tone={tone}>{item.type}</Badge>
                                  {title && <Badge tone="blue">{title}</Badge>}
                                  {item.start_time && (
                                    <span className="text-xs text-ink-400">{item.start_time}</span>
                                  )}
                                  {item.subtopic && <Badge tone="ink">{item.subtopic}</Badge>}
                                  {item.area && <span className="text-xs text-ink-400">{item.area}</span>}
                                  {item.est_minutes !== null && (
                                    <span className="ml-auto text-xs text-ink-400">~{formatClock(item.est_minutes * 60)}</span>
                                  )}
                                </div>
                                <div className={item.done === 1 ? "opacity-60" : ""}>
                                  <Markdown className="text-sm">{item.task_md}</Markdown>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// Server component: the fixed weekly schedule (section M) rendered as a "Today"
// focus list plus a rolling 7-day calendar. Study blocks (SAT 07:00—09:00 and
// TMUA 14:00—17:00, Mon—Thu) show the concrete tasks the planner filled into
// them, tagged by session_code; every other block is shown locked/read-only.
import { Badge, Card, LinkButton } from "@/components/ui";
import { InlineMarkdown } from "@/components/Markdown";
import { addDaysIso, dayOfWeekMon0, formatClock, formatDate, weekdayLabel } from "@/lib/format";
import { getSessionDef } from "@/lib/sessions";
import type { AgendaItem, PhaseInfo } from "@/lib/planner";
import type { ScheduleBlock } from "@/lib/types";

function blockTone(category: string): "tmua" | "sat" | "ink" {
  if (category === "TMUA") return "tmua";
  if (category === "SAT") return "sat";
  return "ink";
}

function isStudyBlock(b: ScheduleBlock): boolean {
  return b.locked === 0 && (b.category === "SAT" || b.category === "TMUA");
}

function sessionTitle(code: string | null): string {
  if (!code) return "Study";
  return getSessionDef(code)?.title ?? code;
}

function PhaseStrip({ phase }: { phase: PhaseInfo }) {
  const label =
    phase.phase === "taper"
      ? "Taper — mocks + light review only"
      : phase.phase === "phase2"
        ? "Phase 2 — SAT done, focus shifts to TMUA"
        : "Phase 1 — SAT + TMUA in parallel";
  const tone = phase.phase === "taper" ? "amber" : phase.phase === "phase2" ? "tmua" : "blue";

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Badge tone={tone}>{label}</Badge>
      {phase.satDaysLeft !== null && phase.satDaysLeft > 0 && (
        <Badge tone="sat">SAT in {phase.satDaysLeft}d{phase.satTaper ? " — taper" : ""}</Badge>
      )}
      {phase.tmuaDaysLeft !== null && phase.tmuaDaysLeft > 0 && (
        <Badge tone="tmua">TMUA in {phase.tmuaDaysLeft}d{phase.tmuaTaper ? " — taper" : ""}</Badge>
      )}
      {phase.reallocateAvailable && (
        <Badge tone="amber">Freed SAT blocks available — confirm reallocation in the planner</Badge>
      )}
      {phase.reallocateConfirmed && <Badge tone="green">SAT blocks reallocated to TMUA</Badge>}
    </div>
  );
}

function TaskLine({ item }: { item: AgendaItem }) {
  return (
    <li className={`flex items-start gap-2.5 text-[14px] p-1.5 rounded-xl transition-colors hover:bg-ink-50/50 ${item.done === 1 ? "opacity-60" : ""}`}>
      <span className={`mt-0.5 text-[11px] ${item.done === 1 ? "text-emerald-600 bg-emerald-100 rounded-full p-0.5 shadow-sm" : "text-ink-300"}`}>
        {item.done === 1 ? "??" : "?"}
      </span>
      <span className={`flex-1 leading-snug font-medium ${item.done === 1 ? "text-ink-500 line-through decoration-ink-300" : "text-ink-800"}`}>
        <InlineMarkdown>{item.task_md}</InlineMarkdown>
      </span>
    </li>
  );
}

/** Group a day's tasks by their block start_time. */
function tasksByStart(tasks: AgendaItem[]): Map<string, AgendaItem[]> {
  const map = new Map<string, AgendaItem[]>();
  for (const t of tasks) {
    const key = t.start_time ?? "";
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }
  return map;
}

export function WeekSchedule({
  blocks,
  agenda,
  phase,
  today,
}: {
  blocks: ScheduleBlock[];
  agenda: AgendaItem[];
  phase: PhaseInfo;
  today: string;
}) {
  // Schedule blocks grouped by weekday (0=Mon..6=Sun).
  const blocksByDow = new Map<number, ScheduleBlock[]>();
  for (const b of blocks) {
    const list = blocksByDow.get(b.day_of_week) ?? [];
    list.push(b);
    blocksByDow.set(b.day_of_week, list);
  }

  // Tasks grouped by date.
  const tasksByDate = new Map<string, AgendaItem[]>();
  for (const t of agenda) {
    const list = tasksByDate.get(t.date) ?? [];
    list.push(t);
    tasksByDate.set(t.date, list);
  }

  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(today, i));

  // --- Today focus ---
  const todaysTasks = tasksByDate.get(today) ?? [];
  const todayByStart = tasksByStart(todaysTasks);
  const todayDow = dayOfWeekMon0(today);
  const todayStudyBlocks = (blocksByDow.get(todayDow) ?? []).filter(isStudyBlock);

  return (
    <Card className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">This week&apos;s schedule</h2>
          <p className="mt-1 text-sm font-medium text-ink-500">
            Study happens only in your fixed SAT &amp; TMUA blocks. Times and loads are an estimate.
          </p>
        </div>
        <LinkButton href="/planner" variant="outline" className="shadow-sm">
          Open planner ?
        </LinkButton>
      </div>

      <PhaseStrip phase={phase} />

      {/* Today focus */}
      <section className="rounded-3xl border border-ink-200/60 bg-gradient-to-br from-ink-50 to-white p-5 lg:p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <Badge tone="green" className="shadow-sm">Today</Badge>
          <span className="text-lg font-extrabold tracking-tight text-ink-900">{formatDate(today)}</span>
        </div>
        {todayStudyBlocks.length === 0 ? (
          <div className="p-5 rounded-2xl border border-dashed border-ink-200 text-center bg-white/50">
            <p className="text-sm font-medium text-ink-500">
              No study blocks today — rest, or a non-study commitment is scheduled.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayStudyBlocks.map((b) => {
              const tasks = todayByStart.get(b.start_time) ?? [];
              const code = tasks[0]?.session_code ?? b.session_code;
              const mins = tasks.reduce((s, t) => s + (t.est_minutes ?? 0), 0);
              const tone = blockTone(b.category);
              const borderTheme = tone === "tmua" ? "border-tmua/20 bg-tmua-pale/20" : "border-sat/20 bg-sat-pale/20";
              
              return (
                <div key={b.id} className={`rounded-2xl border ${borderTheme} p-4 shadow-sm transition-all hover:shadow-md bg-white`}>
                  <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-ink-100 pb-3">
                    <Badge tone={tone} className="shadow-sm">
                      {b.start_time}—{b.end_time}
                    </Badge>
                    <span className="text-base font-extrabold tracking-tight text-ink-900">{sessionTitle(code)}</span>
                    {mins > 0 && (
                      <span className="ml-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-400 bg-ink-50 px-2 py-1 rounded-md">
                        ? {formatClock(mins * 60)}
                      </span>
                    )}
                  </div>
                  {tasks.length > 0 ? (
                    <ul className="space-y-1">
                      {tasks.map((t) => (
                        <TaskLine key={t.id} item={t} />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm italic font-medium text-ink-400 py-1">
                      No tasks generated yet — generate the plan in the planner.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 7-day grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((date) => {
          const dow = dayOfWeekMon0(date);
          const dayBlocks = blocksByDow.get(dow) ?? [];
          const byStart = tasksByStart(tasksByDate.get(date) ?? []);
          const isToday = date === today;
          return (
            <div
              key={date}
              className={`flex flex-col rounded-2xl border p-3 transition-colors ${
                isToday ? "border-tmua/40 bg-gradient-to-b from-tmua-pale/40 to-white shadow-sm ring-1 ring-inset ring-tmua/10" : "border-ink-100 bg-white hover:border-ink-200"
              }`}
            >
              <div className="mb-3 flex items-baseline justify-between border-b border-ink-100/60 pb-2">
                <span className={`text-[13px] font-extrabold uppercase tracking-wide ${isToday ? "text-tmua-dark" : "text-ink-800"}`}>{weekdayLabel(dow)}</span>
                <span className={`text-[11px] font-bold ${isToday ? "text-tmua" : "text-ink-400"}`}>{date.slice(5)}</span>
              </div>
              <div className="space-y-2 flex-1">
                {dayBlocks.length === 0 && (
                  <div className="flex h-full items-center justify-center text-[12px] font-medium text-ink-300 italic">Free</div>
                )}
                {dayBlocks.map((b) => {
                  const study = isStudyBlock(b);
                  const tasks = byStart.get(b.start_time) ?? [];
                  const code = tasks[0]?.session_code ?? b.session_code;
                  return (
                    <div
                      key={b.id}
                      className={`rounded-xl px-2.5 py-2 border transition-all ${
                        study
                          ? b.category === "TMUA"
                            ? "bg-tmua-pale/50 border-tmua/10 hover:border-tmua/30"
                            : "bg-sat-pale/50 border-sat/10 hover:border-sat/30"
                          : "bg-ink-50/50 border-ink-100/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={`text-[10px] font-bold tracking-wider ${
                            study
                              ? b.category === "TMUA"
                                ? "text-tmua-dark"
                                : "text-sat-dark"
                              : "text-ink-400"
                          }`}
                        >
                          {b.start_time}
                        </span>
                        {study && tasks.length > 0 && (
                          <span className="text-[10px] font-bold text-white bg-ink-900/20 px-1.5 rounded-full">{tasks.length}</span>
                        )}
                      </div>
                      <div
                        className={`truncate text-[11px] leading-tight ${
                          study ? "font-extrabold text-ink-900" : "font-medium text-ink-500"
                        }`}
                        title={study ? sessionTitle(code) : b.category}
                      >
                        {study ? sessionTitle(code) : b.category}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

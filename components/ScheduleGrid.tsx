import { getSessionDef, resolveSessionCode } from "@/lib/sessions";
import { weekdayLabel } from "@/lib/format";
import type { ScheduleBlock, StudyTaskType } from "@/lib/types";

const START_HOUR = 7;
const END_HOUR = 19;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i); // 7..18

function parseHour(time: string): number {
  return parseInt(time.slice(0, 2), 10);
}

function isStudy(b: ScheduleBlock): boolean {
  return b.locked === 0 && (b.category === "SAT" || b.category === "TMUA");
}

/** Friendly activity label + colour for each slot type. */
const ACTIVITY: Record<StudyTaskType, { label: string; cls: string; dot: string }> = {
  theory: { label: "Theory", cls: "bg-sky-50 text-sky-700", dot: "bg-sky-400 shadow-sm" },
  drill: { label: "Exercises", cls: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-400 shadow-sm" },
  mock: { label: "Past paper", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-400 shadow-sm" },
  review: { label: "Correction", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400 shadow-sm" },
  desmos: { label: "Desmos", cls: "bg-teal-50 text-teal-700", dot: "bg-teal-400 shadow-sm" },
};

const CATEGORY_LABEL: Record<string, string> = {
  Workout: "Workout",
  Chess: "Chess",
  "Chess (Coach)": "Chess — coach",
  "Personal Statement": "Personal statement",
  free: "Free — meals",
};

function StudyCell({ block, weekIndex }: { block: ScheduleBlock; weekIndex: number }) {
  const isTmua = block.category === "TMUA";
  const seeded = block.session_code ?? "";
  const resolved = resolveSessionCode(seeded, weekIndex);
  const def = getSessionDef(resolved);

  return (
    <div
      className={`flex h-full flex-col gap-2.5 rounded-2xl border p-3.5 transition-all hover:shadow-md ${
        isTmua 
          ? "border-tmua/20 bg-gradient-to-br from-tmua-pale/40 to-white hover:border-tmua/40" 
          : "border-sat/20 bg-gradient-to-br from-sat-pale/40 to-white hover:border-sat/40"
      }`}
    >
      <div className="flex items-center justify-between gap-1 border-b border-ink-100/50 pb-2">
        <span
          className={`text-[12px] font-extrabold uppercase tracking-widest ${
            isTmua ? "text-tmua-dark" : "text-sat-dark"
          }`}
        >
          {block.category}
        </span>
        <span className="text-[11px] font-bold text-ink-400 bg-white/60 px-1.5 py-0.5 rounded-md border border-white">
          {block.start_time}—{block.end_time}
        </span>
      </div>
      <div className="text-[14px] font-extrabold leading-tight text-ink-900 drop-shadow-sm">
        {def?.title ?? block.category}
      </div>
      <ul className="space-y-1.5 mt-auto pt-2">
        {def?.slots.map((slot, i) => {
          const a = ACTIVITY[slot.type];
          return (
            <li key={i} className="flex items-start gap-2">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.dot}`} />
              <span className="min-w-0 text-[12px] leading-snug">
                <span className="font-bold text-ink-700">{a.label}</span>
                <span className="font-medium text-ink-400"> • {slot.minutes}m</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LockedCell({ block }: { block: ScheduleBlock }) {
  const label = CATEGORY_LABEL[block.category] ?? block.category;
  const muted = block.category === "free";
  return (
    <div
      className={`flex h-full flex-col justify-center rounded-2xl border-2 border-dashed px-3 py-2.5 transition-colors ${
        muted ? "border-ink-100/60 bg-ink-50/30" : "border-ink-200/80 bg-ink-50/60 hover:bg-ink-100/40"
      }`}
    >
      <span className={`text-[12px] font-bold ${muted ? "text-ink-300" : "text-ink-600"}`}>
        {label}
      </span>
      <span className="text-[10px] font-semibold text-ink-400 mt-0.5">
        {block.start_time}—{block.end_time}
      </span>
    </div>
  );
}

export function ScheduleGrid({
  blocks,
  weekIndex,
}: {
  blocks: ScheduleBlock[];
  weekIndex: number;
}) {
  // day_of_week (0=Mon..6=Sun) -> startHour -> block
  const byDayStart = new Map<number, Map<number, ScheduleBlock>>();
  for (const b of blocks) {
    const day = byDayStart.get(b.day_of_week) ?? new Map<number, ScheduleBlock>();
    day.set(parseHour(b.start_time), b);
    byDayStart.set(b.day_of_week, day);
  }

  const days = [0, 1, 2, 3, 4, 5, 6];
  // Hours covered by an in-progress rowSpan, per day, so we skip rendering them.
  const skip: Set<number>[] = days.map(() => new Set<number>());

  return (
    <div className="overflow-x-auto rounded-[24px] border border-ink-200/60 bg-white shadow-card relative z-10">
      <table className="w-full min-w-[960px] border-separate border-spacing-1.5 p-2.5">
        <thead>
          <tr>
            <th className="w-20 rounded-xl bg-ink-50 px-3 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-ink-500">
              Time
            </th>
            {days.map((d) => (
              <th
                key={d}
                className={`rounded-xl px-4 py-3.5 text-left text-[13px] font-extrabold uppercase tracking-wide transition-colors ${
                  d >= 5 ? "bg-ink-800 text-white shadow-sm" : "bg-ink-900 text-white shadow-md"
                }`}
              >
                {weekdayLabel(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => (
            <tr key={hour}>
              <td className="whitespace-nowrap rounded-xl bg-ink-50/50 px-3 py-3 align-top text-[12px] font-bold text-ink-500 border border-ink-100/50">
                {hour}h—{hour + 1}h
              </td>
              {days.map((d, di) => {
                if (skip[di].has(hour)) return null;
                const block = byDayStart.get(d)?.get(hour);
                if (!block) {
                  return <td key={d} className="h-14 rounded-xl border border-transparent" />;
                }
                const span = Math.max(1, parseHour(block.end_time) - hour);
                for (let h = hour + 1; h < hour + span; h += 1) skip[di].add(h);
                return (
                  <td key={d} rowSpan={span} className="p-0 align-top">
                    {isStudy(block) ? (
                      <StudyCell block={block} weekIndex={weekIndex} />
                    ) : (
                      <LockedCell block={block} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Small legend explaining the activity colour dots. */
export function ScheduleLegend() {
  const entries: { label: string; dot: string }[] = [
    { label: "Theory", dot: "bg-sky-400" },
    { label: "Exercises", dot: "bg-indigo-400" },
    { label: "Past paper", dot: "bg-amber-400" },
    { label: "Correction", dot: "bg-emerald-400" },
    { label: "Desmos", dot: "bg-teal-400" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 bg-white border border-ink-200/60 px-4 py-3 rounded-2xl shadow-sm inline-flex">
      <span className="text-[11px] font-extrabold uppercase tracking-widest text-ink-400 border-r border-ink-200 pr-4 mr-1">Activities</span>
      {entries.map((e) => (
        <span key={e.label} className="flex items-center gap-2 text-[13px] font-bold text-ink-600 hover:text-ink-900 transition-colors cursor-default">
          <span className={`h-2.5 w-2.5 rounded-full shadow-sm ${e.dot}`} />
          {e.label}
        </span>
      ))}
    </div>
  );
}

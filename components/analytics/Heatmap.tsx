/**
 * Weakness Heatmap — grid of topics coloured by mastery.
 * Groups rows by area. Uses masteryColor() from lib/format.ts.
 * Pure server component — no Recharts, no "use client" needed.
 */

import { masteryColor } from "@/lib/format";
import type { AccuracyByTopic } from "@/lib/analytics";

interface HeatmapProps {
  data: AccuracyByTopic[];
  /** Accent colour for area headings (hex or tailwind-friendly string). */
  accentClass?: string;
}

/**
 * Groups an array of AccuracyByTopic by the `area` field,
 * preserving the order in which areas first appear.
 */
function groupByArea(data: AccuracyByTopic[]): Map<string, AccuracyByTopic[]> {
  const map = new Map<string, AccuracyByTopic[]>();
  for (const item of data) {
    const existing = map.get(item.area);
    if (existing) {
      existing.push(item);
    } else {
      map.set(item.area, [item]);
    }
  }
  return map;
}

function masteryLabel(mastery: number): string {
  if (mastery >= 80) return "Strong";
  if (mastery >= 60) return "Good";
  if (mastery >= 40) return "Fair";
  if (mastery >= 20) return "Weak";
  return "Critical";
}

function contrastText(mastery: number): string {
  // All mastery colours are mid-saturation — white text reads well everywhere.
  return "text-white";
}

export function Heatmap({ data, accentClass = "text-content-muted" }: HeatmapProps) {
  if (data.length === 0) return null;

  const groups = groupByArea(data);

  return (
    <div className="space-y-5">
      {Array.from(groups.entries()).map(([area, topics]) => (
        <div key={area}>
          {/* Area heading */}
          <h4 className={`mb-2 text-xs font-semibold uppercase tracking-widest ${accentClass}`}>
            {area}
          </h4>

          {/* Topic cells */}
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => {
              const bg = masteryColor(t.mastery);
              const fg = contrastText(t.mastery);
              const practiced = t.attempts_count > 0;

              return (
                <div
                  key={t.topic_id}
                  title={`${t.area} — ${t.subtopic}\nMastery: ${t.mastery}% (${masteryLabel(t.mastery)})\nAccuracy: ${Math.round(t.accuracy * 100)}%\nAttempts: ${t.attempts_count}`}
                  className={[
                    "group relative rounded-lg px-3 py-2 text-center text-xs font-medium",
                    "transition-transform duration-150 hover:scale-105 cursor-default",
                    practiced ? bg : "bg-surface-muted",
                    practiced ? fg : "text-content-subtle",
                    "min-w-[90px] max-w-[160px]",
                  ].join(" ")}
                >
                  {/* Subtopic name */}
                  <div className="leading-tight">
                    {t.subtopic.length > 28 ? t.subtopic.slice(0, 26) + "…" : t.subtopic}
                  </div>

                  {/* Mastery % badge */}
                  <div
                    className={[
                      "mt-1 text-[10px] font-semibold opacity-90",
                      practiced ? fg : "text-content-subtle",
                    ].join(" ")}
                  >
                    {practiced ? `${t.mastery}%` : "—"}
                  </div>

                  {/* Hover tooltip overlay for accessibility */}
                  <span className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-content px-2 py-1 text-[10px] text-white shadow group-hover:block">
                    {t.subtopic} · {practiced ? `${t.mastery}% mastery` : "not yet practiced"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

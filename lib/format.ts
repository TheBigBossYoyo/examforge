/** Formatting & date helpers shared across the app. */

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  totalDays: number;
  past: boolean;
}

export function countdownTo(isoDate: string, from: Date = new Date()): Countdown {
  // Treat the exam date as local midnight.
  const target = new Date(`${isoDate}T08:00:00`);
  const ms = target.getTime() - from.getTime();
  const past = ms < 0;
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const totalDays = Math.ceil(ms / 86_400_000);
  return { days, hours, minutes, totalDays, past };
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Day of week with Monday=0 .. Sunday=6 (matches schedule_blocks.day_of_week). */
export function dayOfWeekMon0(iso: string): number {
  const js = new Date(`${iso}T00:00:00`).getDay(); // 0=Sun..6=Sat
  return (js + 6) % 7; // 0=Mon..6=Sun
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Short weekday label for a Monday=0 index. */
export function weekdayLabel(dayOfWeekMon0Value: number): string {
  return WEEKDAY_LABELS[((dayOfWeekMon0Value % 7) + 7) % 7];
}

/**
 * Stable week index since the Unix epoch Monday, used for fortnightly parity
 * (e.g. Thursday timed-vs-review alternation, bi-weekly full mocks).
 */
export function isoWeekIndex(iso: string): number {
  const ms = new Date(`${iso}T00:00:00`).getTime();
  // 1970-01-01 was a Thursday; shift by 3 days so weeks start on Monday.
  return Math.floor((ms / 86_400_000 + 3) / 7);
}

/** Difficulty label / colour helpers. */
export const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Easy",
  med: "Medium",
  hard: "Hard",
  "1600level": "1600-level",
  real: "Real exam",
};

export function masteryColor(mastery: number): string {
  if (mastery >= 80) return "bg-emerald-500";
  if (mastery >= 60) return "bg-lime-500";
  if (mastery >= 40) return "bg-amber-500";
  if (mastery >= 20) return "bg-orange-500";
  return "bg-rose-500";
}

export function masteryTextColor(mastery: number): string {
  if (mastery >= 80) return "text-emerald-600";
  if (mastery >= 60) return "text-lime-600";
  if (mastery >= 40) return "text-amber-600";
  if (mastery >= 20) return "text-orange-600";
  return "text-rose-600";
}

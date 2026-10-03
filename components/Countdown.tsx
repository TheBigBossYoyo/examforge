"use client";

import { useEffect, useState } from "react";

function diff(target: Date) {
  const ms = target.getTime() - Date.now();
  const past = ms < 0;
  const abs = Math.abs(ms);
  return {
    past,
    days: Math.floor(abs / 86_400_000),
    hours: Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
    seconds: Math.floor((abs % 60_000) / 1000),
  };
}

export function Countdown({ date, tone = "tmua" }: { date: string; tone?: "tmua" | "sat" }) {
  const target = new Date(`${date}T08:00:00`);
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const color = tone === "tmua" ? "text-tmua-dark" : "text-sat-dark";
  const cell = (v: number, label: string) => (
    <div className="flex flex-col items-center">
      {/* The server and client clocks can differ by a tick; the interval corrects it. */}
      <span suppressHydrationWarning className={`tabular-nums text-2xl font-bold ${color}`}>
        {String(v).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-content-subtle">{label}</span>
    </div>
  );

  if (t.past) {
    return <div className="text-sm font-medium text-content-muted">Exam date has passed — update it in Settings.</div>;
  }

  return (
    <div className="flex items-center gap-3">
      {cell(t.days, "days")}
      <span className="text-content-subtle">:</span>
      {cell(t.hours, "hrs")}
      <span className="text-content-subtle">:</span>
      {cell(t.minutes, "min")}
      <span className="text-content-subtle">:</span>
      {cell(t.seconds, "sec")}
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <div className={`card ${hover ? "card-hover" : ""} ${className}`}>{children}</div>;
}

export function Badge({
  children,
  tone = "ink",
  className = "",
}: {
  children: ReactNode;
  tone?: "ink" | "tmua" | "sat" | "green" | "amber" | "rose" | "blue";
  className?: string;
}) {
  // Tinted with alpha rather than a fixed pastel, so each tone sits correctly
  // on both a white and a near-black surface without a second definition.
  const tones: Record<string, string> = {
    ink: "bg-surface-muted text-content-muted ring-1 ring-inset ring-line/60",
    tmua: "bg-tmua/10 text-tmua-dark dark:text-tmua-soft ring-1 ring-inset ring-tmua/25",
    sat: "bg-sat/10 text-sat-dark dark:text-sat-soft ring-1 ring-inset ring-sat/25",
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/25",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/25",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-500/25",
    blue: "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/25",
  };
  return <span className={`badge ${tones[tone]} ${className}`}>{children}</span>;
}

/** Circular progress ring (SVG). value 0..1. */
export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  color = "#6d5dfc",
  // Theme-aware: a fixed light grey track disappears on a dark surface.
  trackColor = "rgb(var(--line))",
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: ReactNode;
  sublabel?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const dash = circ * clamped;
  return (
    <div className="relative inline-flex items-center justify-center filter drop-shadow-sm" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} className="opacity-60" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label && <span className="text-3xl font-extrabold tracking-tight leading-none">{label}</span>}
        {sublabel && <span className="text-[10px] font-extrabold text-content-muted mt-1 uppercase tracking-widest">{sublabel}</span>}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "ink",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "ink" | "tmua" | "sat";
}) {
  const accent: Record<string, string> = {
    ink: "text-content",
    tmua: "text-tmua-dark",
    sat: "text-sat-dark",
  };
  const bgAccent: Record<string, string> = {
    ink: "bg-surface-muted/50 hover:bg-surface-muted",
    tmua: "bg-tmua-pale/30 hover:bg-tmua-pale/50",
    sat: "bg-sat-pale/30 hover:bg-sat-pale/50",
  };
  return (
    <div className={`rounded-2xl border border-line p-5 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 ${bgAccent[tone]}`}>
      <div className="text-[11px] font-extrabold uppercase tracking-widest text-content-subtle mb-1.5">{label}</div>
      <div className={`text-3xl font-extrabold tracking-tight ${accent[tone]}`}>{value}</div>
      {hint && <div className="mt-1.5 text-xs font-semibold text-content-muted">{hint}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  // Was an emoji that an encoding round-trip had turned into literal "??".
  icon = "◎",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line/80 bg-surface-muted/30 px-6 py-14 text-center transition-colors hover:border-line-strong/80 hover:bg-surface-muted/60">
      <div className="text-5xl mb-4 drop-shadow-sm">{icon}</div>
      <h3 className="text-lg font-bold tracking-tight text-content">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-content-muted leading-relaxed">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  className = "",
  external = false,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "tmua" | "sat" | "ghost" | "outline";
  className?: string;
  external?: boolean;
}) {
  const cls = `btn-${variant} ${className}`;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function Bar({ value, color = "bg-content", track = "bg-line/50", className = "" }: {
  value: number; // 0..1
  color?: string;
  track?: string;
  className?: string;
}) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full ${track} ${className} shadow-inner`}>
      <div
        className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-content">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] font-medium text-content-muted">{subtitle}</p>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

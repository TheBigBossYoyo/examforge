"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavGroup {
  title: string;
  tone: "ink" | "tmua" | "sat";
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    title: "Overview",
    tone: "ink",
    items: [
      { href: "/", label: "Dashboard", icon: "home" },
      { href: "/exam", label: "Full Sections", icon: "exam" },
      { href: "/schedule", label: "Weekly Schedule", icon: "calendar" },
      { href: "/analytics", label: "Analytics", icon: "chart" },
      { href: "/insights", label: "Insights", icon: "insights" },
      { href: "/planner", label: "Study Planner", icon: "list" },
      { href: "/mistakes", label: "Mistake Notebook", icon: "flag" },
      { href: "/resources", label: "Resource Library", icon: "book" },
    ],
  },
  {
    title: "TMUA",
    tone: "tmua",
    items: [
      { href: "/tmua", label: "TMUA Hub", icon: "sigma" },
      { href: "/tmua/papers", label: "Past Papers", icon: "doc" },
      { href: "/tmua/practice", label: "Topic Practice", icon: "target" },
      { href: "/tmua/theory", label: "Theory", icon: "book" },
    ],
  },
  {
    title: "Digital SAT",
    tone: "sat",
    items: [
      { href: "/sat", label: "SAT Hub", icon: "star" },
      { href: "/sat/math", label: "Math", icon: "sigma" },
      { href: "/sat/reading", label: "Reading", icon: "book" },
      { href: "/sat/writing", label: "Writing", icon: "pen" },
      { href: "/sat/desmos", label: "Desmos Mastery", icon: "graph" },
      { href: "/sat/desmos/drills", label: "Desmos Drills", icon: "timer" },
      { href: "/sat/theory", label: "Theory", icon: "book" },
    ],
  },
  {
    title: "Tools",
    tone: "ink",
    items: [
      { href: "/tutor", label: "AI Tutor", icon: "chat" },
      { href: "/admin", label: "Import / Export", icon: "io" },
      { href: "/settings", label: "Settings", icon: "gear" },
    ],
  },
];

const toneDot: Record<string, string> = {
  ink: "bg-content-subtle",
  tmua: "bg-tmua shadow-[0_0_8px_rgba(109,93,252,0.4)]",
  sat: "bg-sat shadow-[0_0_8px_rgba(14,165,164,0.4)]",
};

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-5 py-4 shadow-sm backdrop-blur-md lg:hidden">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight text-content"
        >
          <span className="text-tmua">Exam</span>
          <span className="text-sat">Forge</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-xl border border-line bg-surface p-2 text-content-muted shadow-sm transition-all hover:bg-surface-muted active:scale-[0.95]"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
          >
            <Icon name={open ? "close" : "menu"} size={20} />
          </button>
        </div>
      </div>

      <aside
        className={`${
          open ? "block shadow-2xl" : "hidden"
        } z-40 w-full shrink-0 border-r border-line bg-surface transition-all lg:sticky lg:top-0 lg:block lg:h-screen lg:w-72 lg:overflow-y-auto lg:bg-surface/80 lg:backdrop-blur-xl`}
      >
        <div className="hidden items-center justify-between px-8 py-8 lg:flex">
          <Link href="/" className="flex items-center gap-1 text-2xl font-extrabold tracking-tight">
            <span className="text-tmua">Exam</span>
            <span className="text-sat">Forge</span>
          </Link>
          <ThemeToggle />
        </div>
        <nav className="px-4 pb-10 space-y-8">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="flex items-center gap-2.5 px-4 py-2">
                <span className={`h-2 w-2 rounded-full ${toneDot[group.tone]}`} />
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-content-subtle">
                  {group.title}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`group flex items-center gap-3 rounded-xl px-4 py-2.5 text-[14px] font-medium transition-all duration-200 ${
                          active
                            ? group.tone === "tmua"
                              ? "bg-tmua/10 font-bold text-tmua dark:text-tmua-soft"
                              : group.tone === "sat"
                                ? "bg-sat/10 font-bold text-sat dark:text-sat-soft"
                                : "bg-content font-bold text-surface shadow-sm"
                            : "text-content-muted hover:bg-surface-muted hover:text-content"
                        }`}
                      >
                        <span
                          className={`flex w-5 justify-center transition-transform duration-200 ${
                            active ? "scale-110" : "opacity-70 group-hover:scale-110 group-hover:opacity-100"
                          }`}
                        >
                          <Icon name={item.icon} />
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

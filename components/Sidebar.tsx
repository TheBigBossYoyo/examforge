"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
      { href: "/", label: "Dashboard", icon: "?" },
      { href: "/exam", label: "Full Sections", icon: "?" },
      { href: "/schedule", label: "Weekly Schedule", icon: "??" },
      { href: "/analytics", label: "Analytics", icon: "??" },
      { href: "/planner", label: "Study Planner", icon: "??" },
      { href: "/mistakes", label: "Mistake Notebook", icon: "??" },
      { href: "/resources", label: "Resource Library", icon: "??" },
    ],
  },
  {
    title: "TMUA",
    tone: "tmua",
    items: [
      { href: "/tmua", label: "TMUA Hub", icon: "?" },
      { href: "/tmua/papers", label: "Past Papers", icon: "??" },
      { href: "/tmua/practice", label: "Topic Practice", icon: "??" },
      { href: "/tmua/theory", label: "Theory", icon: "??" },
    ],
  },
  {
    title: "Digital SAT",
    tone: "sat",
    items: [
      { href: "/sat", label: "SAT Hub", icon: "??" },
      { href: "/sat/math", label: "Math", icon: "?" },
      { href: "/sat/reading", label: "Reading", icon: "??" },
      { href: "/sat/writing", label: "Writing", icon: "?" },
      { href: "/sat/desmos", label: "Desmos Mastery", icon: "??" },
      { href: "/sat/theory", label: "Theory", icon: "??" },
    ],
  },
  {
    title: "Tools",
    tone: "ink",
    items: [
      { href: "/tutor", label: "AI Tutor", icon: "??" },
      { href: "/admin", label: "Import / Export", icon: "?" },
      { href: "/settings", label: "Settings", icon: "??" },
    ],
  },
];

const toneDot: Record<string, string> = {
  ink: "bg-ink-300",
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
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-ink-100 bg-white/95 px-5 py-4 backdrop-blur-md shadow-sm">
        <Link href="/" className="flex items-center gap-1.5 font-extrabold text-ink-900 tracking-tight text-xl">
          <span className="text-tmua drop-shadow-sm">Exam</span>
          <span className="text-sat drop-shadow-sm">Forge</span>
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-ink-50 active:scale-[0.95] transition-all"
          aria-label="Toggle navigation"
        >
          ?
        </button>
      </div>

      <aside
        className={`${
          open ? "block shadow-2xl" : "hidden"
        } lg:block lg:sticky lg:top-0 lg:h-screen w-full lg:w-72 shrink-0 border-r border-ink-100/80 bg-white lg:overflow-y-auto lg:bg-white/80 lg:backdrop-blur-xl z-40 transition-all`}
      >
        <div className="hidden lg:flex items-center gap-1.5 px-8 py-8">
          <Link href="/" className="flex items-center gap-1 font-extrabold text-2xl tracking-tight">
            <span className="text-tmua drop-shadow-sm">Exam</span>
            <span className="text-sat drop-shadow-sm">Forge</span>
          </Link>
        </div>
        <nav className="px-4 pb-10 space-y-8">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="flex items-center gap-2.5 px-4 py-2">
                <span className={`h-2 w-2 rounded-full ${toneDot[group.tone]}`} />
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-ink-400">
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
                        className={`group flex items-center gap-3 rounded-xl px-4 py-2.5 text-[14px] font-medium transition-all duration-200 ${
                          active
                            ? group.tone === "tmua"
                              ? "bg-tmua/10 text-tmua-dark font-bold"
                              : group.tone === "sat"
                              ? "bg-sat/10 text-sat-dark font-bold"
                              : "bg-ink-900 text-white shadow-sm font-bold"
                            : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                        }`}
                      >
                        <span className={`w-5 text-center text-base transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-110 opacity-70 group-hover:opacity-100"}`}>
                          {item.icon}
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

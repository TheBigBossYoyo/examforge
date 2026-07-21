/**
 * Line icons, drawn inline.
 *
 * Replaces the emoji the sidebar used to carry: those had been corrupted to
 * literal "??" by an encoding round-trip, so every nav item showed the same
 * placeholder. SVG has no encoding to lose, scales with the font, and inherits
 * currentColor so it themes for free.
 */
const PATHS: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5",
  exam: "M9 3h6v3H9zM6 6h12v15H6zM9 11h6M9 15h6",
  insights: "M3 21V10M9 21V4M15 21v-7M21 21V8",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  chart: "M4 20V10M10 20V4M16 20v-6M22 20H2",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z",
  sigma: "M17 5H7l6 7-6 7h10",
  doc: "M7 3h7l4 4v14H7zM14 3v5h4",
  target: "M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  star: "M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.8 6.7 19.6l1.1-6L3.4 9.4l6-.8z",
  pen: "M4 20h4L20 8l-4-4L4 16zM14 6l4 4",
  graph: "M3 21V3M3 21h18M6 15l4-5 3 3 5-7",
  timer: "M12 8v5l3 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  chat: "M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z",
  io: "M12 3v10M8 7l4-4 4 4M4 17v3h16v-3",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.5L6 11a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.06-.33.1-.66.1-1z",
  dot: "M12 12h.01",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
};

export function Icon({
  name,
  className = "",
  size = 18,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const d = PATHS[name] ?? PATHS.dot;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Sidebar } from "@/components/Sidebar";
import { THEME_INIT_SCRIPT } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "ExamForge — TMUA 9.0 & Digital SAT 1600",
  description:
    "Local-first revision platform for TMUA (Oct 2026) and the Digital SAT (Aug 2026).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Do not block zoom — pinch-zoom is an accessibility feature, not a bug.
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#14181f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint, so there is no flash
            of the wrong one. Must run synchronously, hence dangerouslySet. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div className="relative min-h-screen selection:bg-tmua-pale selection:text-tmua-dark lg:flex">
          {/* Subtle background glow — decorative, and muted in dark mode where
              large soft washes read as smudges. */}
          <div
            className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block"
            aria-hidden
          >
            <div className="absolute -top-[300px] right-[100px] h-[600px] w-[600px] rounded-full bg-tmua-pale/40 blur-[100px] dark:bg-tmua/10" />
            <div className="absolute top-[200px] right-[-100px] h-[500px] w-[500px] rounded-full bg-sat-pale/40 blur-[100px] dark:bg-sat/10" />
          </div>

          <Sidebar />
          <main id="main-content" className="relative z-10 min-w-0 flex-1">
            <div className="mx-auto max-w-[1200px] animate-fade-in px-4 py-6 lg:px-10 lg:py-10">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

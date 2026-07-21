import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "ExamForge — TMUA 9.0 & Digital SAT 1600",
  description:
    "Local-first revision platform for TMUA (Oct 2026) and the Digital SAT (Aug 2026).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink-50">
        <div className="lg:flex min-h-screen selection:bg-tmua-pale selection:text-tmua-dark relative">
          {/* Subtle background glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden hidden lg:block">
            <div className="absolute -top-[300px] right-[100px] h-[600px] w-[600px] rounded-full bg-tmua-pale/40 blur-[100px]" />
            <div className="absolute top-[200px] right-[-100px] h-[500px] w-[500px] rounded-full bg-sat-pale/40 blur-[100px]" />
          </div>
          
          <Sidebar />
          <main className="flex-1 min-w-0 relative z-10">
            <div className="mx-auto max-w-[1200px] px-4 py-6 lg:px-10 lg:py-10 animate-fade-in">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

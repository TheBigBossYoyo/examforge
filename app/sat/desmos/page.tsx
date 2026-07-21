import { DESMOS_LESSONS } from "@/lib/desmos-lessons";
import Link from "next/link";
import { Card, Badge, SectionHeader } from "@/components/ui";
import { DesmosKeyNotice } from "@/components/Desmos";

export const dynamic = "force-dynamic";

export default function DesmosMasteryIndex() {
  const lessons = DESMOS_LESSONS.filter(l => l.slug !== "speed-drills");
  const speedDrills = DESMOS_LESSONS.find(l => l.slug === "speed-drills");

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <SectionHeader 
        title="Desmos Mastery Module" 
        subtitle="Desmos is your most powerful weapon on the digital SAT. Master these 11 skills to turn complex algebra into a 5-second graph."
      />
      <div className="mt-4">
        <DesmosKeyNotice />
      </div>

      <div className="mt-8 space-y-6">
        <h2 className="text-2xl font-bold text-ink-900 mb-4">The 11 Desmos Skills</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((l) => (
            <Link key={l.n} href={`/sat/desmos/${l.slug}`}>
              <Card hover className="h-full flex flex-col p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Badge tone="sat">Skill {l.n}</Badge>
                </div>
                <h3 className="font-semibold text-lg text-ink-900 group-hover:text-sat transition-colors">
                  {l.title}
                </h3>
              </Card>
            </Link>
          ))}
        </div>

        {speedDrills && (
          <div className="pt-8">
            <h2 className="text-2xl font-bold text-ink-900 mb-4">Final Challenge</h2>
            <Link href={`/sat/desmos/${speedDrills.slug}`}>
              <Card hover className="flex flex-col p-6 border-sat-200 bg-sat/5 text-center items-center">
                <h3 className="font-bold text-xl text-sat-dark mb-2">Desmos Speed Drills</h3>
                <p className="text-ink-600 mb-4">Test your mastery of all 11 skills under pressure.</p>
                <div className="btn-sat inline-flex">Start Drills</div>
              </Card>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

import { getExam, getTopics } from "@/lib/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, Badge, SectionHeader } from "@/components/ui";
import { getTheory, slugify } from "@/lib/theory";

export const dynamic = "force-dynamic";

export default function SatTheoryIndex() {
  const exam = getExam("SAT");
  if (!exam) return notFound();

  const topicsMath = getTopics(exam.id, "Math");
  const topicsRW = getTopics(exam.id, "RW");

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <SectionHeader 
        title="SAT Theory" 
        subtitle="Review essential concepts for Math and Reading & Writing."
      />

      <div className="mt-8 space-y-12">
        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-2xl font-bold text-content">Math</h2>
            <Badge tone="sat">Calculator Allowed</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {topicsMath.map((t) => {
              const theory = getTheory("SAT", t.subtopic);
              const slug = slugify(t.subtopic);
              return (
                <Link key={t.id} href={`/sat/theory/${slug}`}>
                  <Card hover className="h-full flex flex-col p-5">
                    <h3 className="font-semibold text-lg mb-2 text-content group-hover:text-sat transition-colors">
                      {t.subtopic}
                    </h3>
                    <p className="text-sm text-content-muted line-clamp-2">
                      {theory?.explanation_md.slice(0, 100) || "Rules, formulas, and strategies for SAT Math."}...
                    </p>
                    <div className="mt-auto pt-4 flex gap-2">
                      {theory && <Badge tone="green">Content Available</Badge>}
                      {!theory && <Badge tone="ink">Coming Soon</Badge>}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-2xl font-bold text-content">Reading & Writing</h2>
            <Badge tone="sat">Grammar & Reading</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {topicsRW.map((t) => {
              const theory = getTheory("SAT", t.subtopic);
              const slug = slugify(t.subtopic);
              return (
                <Link key={t.id} href={`/sat/theory/${slug}`}>
                  <Card hover className="h-full flex flex-col p-5">
                    <h3 className="font-semibold text-lg mb-2 text-content group-hover:text-sat transition-colors">
                      {t.subtopic}
                    </h3>
                    <p className="text-sm text-content-muted line-clamp-2">
                      {theory?.explanation_md.slice(0, 100) || "Grammar rules, reading strategies, and common traps."}...
                    </p>
                    <div className="mt-auto pt-4 flex gap-2">
                      {theory && <Badge tone="green">Content Available</Badge>}
                      {!theory && <Badge tone="ink">Coming Soon</Badge>}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

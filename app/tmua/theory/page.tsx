import { getExam, getTopics } from "@/lib/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, Badge, SectionHeader } from "@/components/ui";
import { getTheory, slugify } from "@/lib/theory";

export const dynamic = "force-dynamic";

export default function TmuaTheoryIndex() {
  const exam = getExam("TMUA");
  if (!exam) return notFound();

  const topicsP1 = getTopics(exam.id, "P1");
  const topicsP2 = getTopics(exam.id, "P2");

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <SectionHeader 
        title="TMUA Theory" 
        subtitle="Master the fundamental concepts before attempting Paper 1 and Paper 2 questions."
      />

      <div className="mt-8 space-y-12">
        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-2xl font-bold text-ink-900">Paper 1: Pure Mathematics</h2>
            <Badge tone="tmua">Non-calculator</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {topicsP1.map((t) => {
              const theory = getTheory("TMUA", t.subtopic);
              const slug = slugify(t.subtopic);
              return (
                <Link key={t.id} href={`/tmua/theory/${slug}`}>
                  <Card hover className="h-full flex flex-col p-5">
                    <h3 className="font-semibold text-lg mb-2 text-ink-900 group-hover:text-tmua transition-colors">
                      {t.subtopic}
                    </h3>
                    <p className="text-sm text-ink-500 line-clamp-2">
                      {theory?.explanation_md.slice(0, 100) || "Comprehensive notes, worked examples, and exercises for this topic."}...
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
            <h2 className="text-2xl font-bold text-ink-900">Paper 2: Mathematical Thinking</h2>
            <Badge tone="tmua">Logic & Proof</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {topicsP2.map((t) => {
              const theory = getTheory("TMUA", t.subtopic);
              const slug = slugify(t.subtopic);
              return (
                <Link key={t.id} href={`/tmua/theory/${slug}`}>
                  <Card hover className="h-full flex flex-col p-5">
                    <h3 className="font-semibold text-lg mb-2 text-ink-900 group-hover:text-tmua transition-colors">
                      {t.subtopic}
                    </h3>
                    <p className="text-sm text-ink-500 line-clamp-2">
                      {theory?.explanation_md.slice(0, 100) || "Logic, proof, and reasoning strategies for this topic."}...
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

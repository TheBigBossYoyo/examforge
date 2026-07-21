import { getTheory } from "@/lib/theory";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { Badge, Card, SectionHeader } from "@/components/ui";

export default function SatTheoryPage({ params }: { params: { topic: string } }) {
  const theory = getTheory("SAT", params.topic);

  if (!theory) {
    return notFound();
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Link href="/sat/theory" className="inline-flex items-center text-sat hover:underline mb-6">
        &larr; Back to Theory Index
      </Link>
      
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Badge tone="sat">{theory.area}</Badge>
        </div>
        <h1 className="text-3xl font-bold text-content">{theory.title}</h1>
      </div>

      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-content border-b border-line pb-2">Explanation</h2>
          <div className="prose prose-ink max-w-none">
            <Markdown>{theory.explanation_md}</Markdown>
          </div>
        </section>

        {theory.worked_examples.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-content border-b border-line pb-2">Worked Examples</h2>
            <div className="space-y-6">
              {theory.worked_examples.map((ex, i) => (
                <Card key={i} className="p-6 bg-surface-muted">
                  <h3 className="font-semibold mb-3">Example {i + 1}</h3>
                  <div className="mb-4">
                    <Markdown>{ex.prompt_md}</Markdown>
                  </div>
                  <div className="pt-4 border-t border-line">
                    <p className="text-sm font-semibold text-content-muted mb-2">Solution:</p>
                    <Markdown>{ex.solution_md}</Markdown>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {theory.mini_exercises.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-content border-b border-line pb-2">Mini Exercises</h2>
            <div className="space-y-4">
              {theory.mini_exercises.map((ex, i) => (
                <Card key={i} className="p-5">
                  <div className="mb-3">
                    <span className="font-medium mr-2">{i + 1}.</span>
                    <Markdown>{ex.prompt_md}</Markdown>
                  </div>
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-sat hover:text-sat-dark transition-colors">
                      Show Answer
                    </summary>
                    <div className="mt-3 pl-4 border-l-2 border-sat/30 text-content-muted">
                      <Markdown>{ex.answer_md}</Markdown>
                    </div>
                  </details>
                </Card>
              ))}
            </div>
          </section>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <section>
            <Card className="p-6 h-full border-rose-200 bg-rose-50/50">
              <h2 className="text-xl font-semibold mb-3 text-rose-800">Common Traps</h2>
              <div className="prose prose-sm max-w-none text-content">
                <Markdown>{theory.common_traps_md}</Markdown>
              </div>
            </Card>
          </section>

          <section>
            <Card className="p-6 h-full border-blue-200 bg-blue-50/50">
              <h2 className="text-xl font-semibold mb-3 text-blue-800">Exam Strategy</h2>
              <div className="prose prose-sm max-w-none text-content">
                <Markdown>{theory.exam_strategy_md}</Markdown>
              </div>
            </Card>
          </section>
        </div>

        <section>
          <Card className="p-6 bg-sat/5 border-sat/20">
            <h2 className="text-xl font-semibold mb-3 text-sat-dark">From Theory to Exam</h2>
            <div className="prose prose-ink max-w-none">
              <Markdown>{theory.theory_to_exam_md}</Markdown>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

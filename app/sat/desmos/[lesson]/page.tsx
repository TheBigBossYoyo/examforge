"use client";

import { DESMOS_LESSONS } from "@/lib/desmos-lessons";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { Badge, Card } from "@/components/ui";
import dynamic from "next/dynamic";
import { useState } from "react";

const DesmosCalculator = dynamic(() => import("@/components/Desmos").then((mod) => mod.DesmosCalculator), { ssr: false });

function DesmosQuestion({ q, index }: { q: any; index: number }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <span className="font-semibold mr-2 text-content">Q{index + 1}.</span>
        <Markdown>{q.prompt_md}</Markdown>
      </div>
      
      {q.choices && (
        <div className="flex gap-2 flex-wrap mb-4">
          {q.choices.map((c: string) => (
            <div key={c} className="px-3 py-1.5 border border-line rounded-md text-sm bg-surface-muted">
              <Markdown>{c}</Markdown>
            </div>
          ))}
        </div>
      )}

      {!revealed ? (
        <button 
          onClick={() => setRevealed(true)}
          className="btn-outline text-sm py-1.5 px-3"
        >
          Reveal Workflow
        </button>
      ) : (
        <div className="mt-4 pt-4 border-t border-line">
          <div className="mb-2 text-sm">
            <span className="font-semibold text-sat-dark">Correct Answer: </span>
            <span className="font-medium">{q.correct_answer}</span>
          </div>
          <div className="text-content-muted bg-sat/5 p-3 rounded text-sm border-l-2 border-sat">
            <span className="font-semibold text-sat-dark block mb-1">Desmos Workflow:</span>
            <Markdown>{q.reveal_md}</Markdown>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function DesmosLessonPage({ params }: { params: { lesson: string } }) {
  const lessonIndex = DESMOS_LESSONS.findIndex(l => l.slug === params.lesson);
  if (lessonIndex === -1) return notFound();

  const lesson = DESMOS_LESSONS[lessonIndex];
  const prevLesson = lessonIndex > 0 ? DESMOS_LESSONS[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < DESMOS_LESSONS.length - 1 ? DESMOS_LESSONS[lessonIndex + 1] : null;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <Link href="/sat/desmos" className="inline-flex items-center text-sat hover:underline mb-6">
        &larr; Back to Desmos Mastery
      </Link>
      
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {lesson.slug !== "speed-drills" ? (
            <Badge tone="sat">Skill {lesson.n} of 11</Badge>
          ) : (
            <Badge tone="amber">Final Challenge</Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold text-content">{lesson.title}</h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        <div className="space-y-8">
          <section>
            <div className="prose prose-ink max-w-none text-lg">
              <Markdown>{lesson.explanation_md}</Markdown>
            </div>
          </section>

          <section>
            <Card className="p-5 bg-sat-50/50 border-sat-200 mb-6">
              <h2 className="font-semibold text-sat-800 mb-2 flex items-center gap-2">
                <span className="text-xl">👉</span> Try It Now
              </h2>
              <div className="text-sat-900">
                <Markdown>{lesson.try_it_md}</Markdown>
              </div>
            </Card>

            <div className="h-[400px] lg:h-[500px] shadow-sm rounded-xl overflow-hidden border border-line">
              <DesmosCalculator state={lesson.desmos_state_json} className="w-full h-full border-0" height={500} />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-content mb-4 border-b border-line pb-2">Practice</h2>
          <div className="space-y-4">
            {lesson.questions.map((q, i) => (
              <DesmosQuestion key={i} q={q} index={i} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 pt-6 border-t border-line flex justify-between">
        {prevLesson ? (
          <Link href={`/sat/desmos/${prevLesson.slug}`} className="btn-outline flex items-center gap-2">
            &larr; {prevLesson.title}
          </Link>
        ) : <div />}
        
        {nextLesson ? (
          <Link href={`/sat/desmos/${nextLesson.slug}`} className="btn-sat flex items-center gap-2">
            {nextLesson.title} &rarr;
          </Link>
        ) : (
          <Link href="/sat/desmos" className="btn-sat flex items-center gap-2">
            Complete Module
          </Link>
        )}
      </div>
    </div>
  );
}

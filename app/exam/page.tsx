import Link from "next/link";
import { getExams } from "@/lib/queries";
import { getExamFormat, sectionMinutes, sectionQuestionCount } from "@/lib/exam-format";
import { getRecentSessions } from "@/lib/test-session";
import { query } from "@/lib/db";
import { Card, SectionHeader, Badge } from "@/components/ui";
import type { ExamName } from "@/lib/types";

export const dynamic = "force-dynamic";

/** How many questions the bank can actually offer per section. */
function poolCounts(): Map<string, number> {
  const rows = query<{ exam_id: number; area: string; n: number }>(
    `SELECT q.exam_id, t.area, COUNT(*) AS n
       FROM questions q JOIN topics t ON t.id = q.topic_id
      GROUP BY q.exam_id, t.area`,
  );
  return new Map(rows.map((r) => [`${r.exam_id}:${r.area}`, r.n]));
}

export default function ExamPage() {
  const exams = getExams();
  const pools = poolCounts();
  const sessions = getRecentSessions(undefined, 8);

  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeader
        title="Full sections"
        subtitle="Sit a complete exam section under real conditions — real length, real timing, and for the SAT, real adaptive module routing."
      />

      <div className="space-y-6">
        {exams.map((exam) => {
          const format = getExamFormat(exam.name as ExamName);
          return (
            <div key={exam.id}>
              <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-ink-400">
                {exam.name}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {format.sections.map((section) => {
                  const available = pools.get(`${exam.id}:${section.code}`) ?? 0;
                  const needed = sectionQuestionCount(section);
                  const thin = available < needed;
                  return (
                    <Card key={section.code} hover>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold tracking-tight text-ink-900">
                            {section.label}
                          </div>
                          <div className="mt-1 text-xs text-ink-500">
                            {needed} questions · {sectionMinutes(section)} min ·{" "}
                            {section.modules.length === 2 ? "2 modules" : "1 paper"}
                          </div>
                        </div>
                        {section.adaptive && <Badge tone="sat">Adaptive</Badge>}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {section.allowCalculator && <Badge tone="blue">Desmos</Badge>}
                        {section.referenceSheet && <Badge tone="ink">Reference sheet</Badge>}
                        {!section.allowCalculator && <Badge tone="ink">No calculator</Badge>}
                      </div>

                      {thin && (
                        <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                          Bank has {available} of {needed} questions — modules will run short until
                          the content pipeline fills this out.
                        </p>
                      )}

                      <div className="mt-4 flex gap-2">
                        <Link
                          href={`/exam/run?examId=${exam.id}&section=${encodeURIComponent(section.code)}&mode=exam`}
                          className={exam.name === "TMUA" ? "btn-tmua" : "btn-sat"}
                        >
                          Start timed
                        </Link>
                        <Link
                          href={`/exam/run?examId=${exam.id}&section=${encodeURIComponent(section.code)}&mode=untimed`}
                          className="btn-outline"
                        >
                          Untimed
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {sessions.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-ink-400">
            Recent sections
          </h2>
          <Card>
            <div className="divide-y divide-ink-100">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <span className="font-semibold text-ink-800">{s.section}</span>
                    <span className="ml-2 text-xs text-ink-400">
                      {s.started_at.slice(0, 16).replace("T", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.routed_difficulty && (
                      <Badge tone={s.routed_difficulty === "hard" ? "green" : "amber"}>
                        {s.routed_difficulty} route
                      </Badge>
                    )}
                    <span className="font-bold tabular-nums text-ink-900">
                      {s.finished_at ? (s.scaled_score ?? "—") : "in progress"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

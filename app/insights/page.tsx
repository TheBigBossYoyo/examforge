import Link from "next/link";
import { getExams } from "@/lib/queries";
import {
  getNextActions,
  getUntriagedMistakes,
  modulePacing,
  paceBudgetFor,
  questionPacing,
  rootCauseBreakdown,
  suggestForMistake,
} from "@/lib/insights";
import { ROOT_CAUSE_ACTIONS, ROOT_CAUSE_LABELS, type RootCause } from "@/lib/error-log";
import { TriagePanel, type TriageItem } from "@/components/TriagePanel";
import { Badge, Bar, Card, SectionHeader } from "@/components/ui";
import type { ExamName } from "@/lib/types";

export const dynamic = "force-dynamic";

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export default function InsightsPage() {
  const exams = getExams();

  const triageItems: TriageItem[] = [];
  for (const exam of exams) {
    for (const m of getUntriagedMistakes(exam.id, 20)) {
      const suggestion = suggestForMistake(m, exam.name as ExamName);
      triageItems.push({
        id: m.id,
        prompt_md: m.prompt_md,
        area: m.area,
        subtopic: m.subtopic,
        seconds_spent: m.seconds_spent,
        budget_seconds: paceBudgetFor(exam.name as ExamName, m.area),
        confidence: m.confidence,
        suggestion,
      });
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeader
        title="Insights"
        subtitle="What to drill next, why you are missing things, and where the clock is actually hurting you."
      />

      {/* ---------------- next best action ---------------- */}
      <div className="space-y-6">
        {exams.map((exam) => {
          const actions = getNextActions(exam.id, 4);
          const tone = exam.name === "TMUA" ? "tmua" : "sat";
          const hasSignal = actions.drill.length > 0 || actions.uncovered.length > 0;

          return (
            <div key={exam.id}>
              <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-content-subtle">
                {exam.name} — next best action
              </h2>

              {!hasSignal ? (
                <Card>
                  <p className="text-sm text-content-muted">
                    Nothing to recommend yet. Sit a section or a drill and this will rank your
                    weakest topics by how much drilling them now would actually help.
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {actions.drill.map((r, i) => (
                    <Card key={r.topicId} hover>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {i === 0 && <Badge tone={tone}>Start here</Badge>}
                            <Badge tone="ink">{r.area}</Badge>
                          </div>
                          <div className="mt-1.5 font-bold tracking-tight text-content">
                            {r.subtopic}
                          </div>
                          <p className="mt-1 text-sm text-content-muted">{r.reason}</p>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-content-subtle">
                            <span>error density {pct(r.errorDensity)}</span>
                            <span>recency {pct(r.recencyWeight)}</span>
                          </div>
                        </div>
                        <Link
                          href={`/practice?exam=${exam.name}&topic=${r.topicId}`}
                          className={`btn-${tone} shrink-0`}
                        >
                          Drill
                        </Link>
                      </div>
                      <div className="mt-3">
                        <Bar
                          value={Math.min(1, r.score * 3)}
                          color={exam.name === "TMUA" ? "bg-tmua" : "bg-sat"}
                        />
                      </div>
                    </Card>
                  ))}

                  {actions.uncovered.length > 0 && (
                    <Card>
                      <div className="text-[11px] font-extrabold uppercase tracking-widest text-content-subtle">
                        Never practised — invisible to the ranking above
                      </div>
                      <p className="mt-1 text-xs text-content-muted">
                        These have produced no errors because they have produced no attempts. A
                        top score cannot skip them.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {actions.uncovered.map((t) => (
                          <Link
                            key={t.topicId}
                            href={`/practice?exam=${exam.name}&topic=${t.topicId}`}
                            className="rounded-lg border border-dashed border-line-strong px-2.5 py-1 text-xs font-semibold text-content-muted hover:bg-surface-muted"
                          >
                            {t.subtopic}
                          </Link>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ---------------- triage ---------------- */}
      <div className="mt-10">
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-content-subtle">
          Error log — root cause triage
        </h2>
        <TriagePanel items={triageItems} />
      </div>

      {/* ---------------- root cause mix ---------------- */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {exams.map((exam) => {
          const breakdown = rootCauseBreakdown(exam.id);
          const total = breakdown.reduce((s, b) => s + b.count, 0);
          if (total === 0) return null;
          return (
            <div key={exam.id}>
              <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-content-subtle">
                {exam.name} — why you miss
              </h2>
              <Card>
                <div className="space-y-3">
                  {breakdown.map((b) => {
                    const label =
                      b.root_cause === "untriaged"
                        ? "Not yet triaged"
                        : (ROOT_CAUSE_LABELS[b.root_cause as RootCause] ?? b.root_cause);
                    return (
                      <div key={b.root_cause}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-content">{label}</span>
                          <span className="text-content-muted">
                            {b.count}
                            {b.triaged < b.count && (
                              <span className="ml-1 text-xs text-amber-600">
                                ({b.count - b.triaged} unconfirmed)
                              </span>
                            )}
                          </span>
                        </div>
                        <Bar value={b.count / total} className="mt-1" />
                        {b.root_cause !== "untriaged" && ROOT_CAUSE_ACTIONS[b.root_cause as RootCause] && (
                          <p className="mt-1 text-xs text-content-subtle">
                            {ROOT_CAUSE_ACTIONS[b.root_cause as RootCause]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* ---------------- pacing ---------------- */}
      <div className="mt-10">
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-content-subtle">
          Pacing — is the clock or the content the problem?
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {exams.map((exam) => {
            const pacing = questionPacing(exam.id, exam.name as ExamName);
            if (pacing.length === 0) return null;
            return (
              <Card key={exam.id}>
                <div className="mb-3 text-sm font-bold text-content">{exam.name}</div>
                <div className="space-y-4">
                  {pacing.map((p) => {
                    // Similar accuracy either side of the budget means the extra
                    // time is buying nothing.
                    const gap = p.accuracy_when_under - p.accuracy_when_over;
                    const verdict =
                      gap > 0.15
                        ? "The slow questions are the ones you do not know — that is a content gap wearing a timing costume."
                        : gap < -0.15
                          ? "You are more accurate when you take longer. The time is being well spent; find it elsewhere."
                          : "Accuracy barely moves with extra time — that time is buying nothing. Move on faster.";
                    return (
                      <div key={p.area}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-content">{p.area}</span>
                          <span
                            className={
                              p.avg_seconds > p.budget_seconds ? "text-rose-600" : "text-emerald-600"
                            }
                          >
                            {p.avg_seconds}s avg / {p.budget_seconds}s budget
                          </span>
                        </div>
                        <div className="mt-1 flex gap-4 text-xs text-content-muted">
                          <span>{pct(p.over_budget_share)} ran over</span>
                          <span>acc under budget {pct(p.accuracy_when_under)}</span>
                          <span>over budget {pct(p.accuracy_when_over)}</span>
                        </div>
                        <p className="mt-1 text-xs leading-snug text-content-subtle">{verdict}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        {exams.map((exam) => {
          const mods = modulePacing(exam.id, exam.name as ExamName, 8);
          if (mods.length === 0) return null;
          return (
            <Card key={`mp-${exam.id}`} className="mt-4">
              <div className="mb-3 text-sm font-bold text-content">
                {exam.name} — module pacing
              </div>
              <div className="space-y-2">
                {mods.map((m, i) => {
                  const used = m.limit_seconds > 0 ? m.seconds_total / m.limit_seconds : 0;
                  return (
                    <div key={`${m.session_id}-${m.module_number}-${i}`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-content-muted">
                          {m.section} · module {m.module_number}
                          {m.module_difficulty ? ` (${m.module_difficulty})` : ""}
                        </span>
                        <span className="text-content-muted">
                          {Math.round(m.seconds_total / 60)}/{Math.round(m.limit_seconds / 60)} min ·{" "}
                          {m.raw_score}/{m.questions} correct
                        </span>
                      </div>
                      <Bar
                        value={Math.min(1, used)}
                        color={used > 0.98 ? "bg-rose-500" : "bg-content"}
                        className="mt-1"
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

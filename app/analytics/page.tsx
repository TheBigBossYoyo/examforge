/**
 * Analytics dashboard — server component.
 * Fetches all analytics data server-side, passes serialisable props to
 * "use client" chart wrappers.
 */

export const dynamic = "force-dynamic";

import { getExams } from "@/lib/queries";
import { getExamAnalytics } from "@/lib/analytics";
import type { ExamAnalytics, ScorePrediction } from "@/lib/analytics";
import type { Exam } from "@/lib/types";
import { pct, formatClock } from "@/lib/format";
import {
  Card,
  StatCard,
  EmptyState,
  SectionHeader,
  Badge,
} from "@/components/ui";
import { Heatmap } from "@/components/analytics/Heatmap";
import {
  AccuracyByTopicChart,
  AccuracyByDifficultyChart,
  ImprovementChart,
  ConfidenceCalibrationChart,
  ErrorTypeChart,
  TimeVsPaceChart,
  SatSectionBarsChart,
} from "@/components/analytics/Charts";

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */

function hasData(a: ExamAnalytics): boolean {
  return (
    a.accuracyByTopic.some((t) => t.attempts_count > 0) ||
    a.improvementOverTime.length > 0
  );
}

function predictionLabel(p: ScorePrediction | null): string {
  if (!p) return "—";
  return p.label;
}

function paceLabel(avgSecs: number, paceTarget: number): string {
  if (avgSecs === 0) return "—";
  const diff = avgSecs - paceTarget;
  const sign = diff > 0 ? "+" : "";
  return `${formatClock(avgSecs)}/Q  (${sign}${Math.round(diff)}s vs target)`;
}

/* Derive a combined pace target for the exam from the first area's target */
function examPaceTarget(a: ExamAnalytics): number {
  return a.timeVsPace[0]?.paceTarget ?? 90;
}

/* ------------------------------------------------------------------ */
/* Section: single exam panel                                           */
/* ------------------------------------------------------------------ */

function ExamPanel({ exam, analytics }: { exam: Exam; analytics: ExamAnalytics }) {
  const isTmua = exam.name === "TMUA";
  const accentBg = isTmua ? "bg-tmua" : "bg-sat";
  const accentText = isTmua ? "text-tmua-dark" : "text-sat-dark";
  const accentBadge = isTmua ? ("tmua" as const) : ("sat" as const);
  const chartColor = isTmua ? "#6d5dfc" : "#0ea5a4";
  const paceTarget = examPaceTarget(analytics);
  const prediction = analytics.scorePrediction;
  const hasAnyData = hasData(analytics);

  const improvementDomain: [number, number] | undefined = isTmua
    ? [1, 9]
    : [200, 1600];

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`h-2 w-2 rounded-full ${accentBg}`} />
        <h2 className="text-xl font-bold tracking-tight text-content">{exam.name}</h2>
        <Badge tone={accentBadge}>{exam.name === "TMUA" ? "TMUA" : "SAT"}</Badge>
      </div>

      {/* Empty guard */}
      {!hasAnyData ? (
        <EmptyState
          title="No data yet"
          description="Practice a few questions to unlock analytics."
          icon="📊"
        />
      ) : (
        <>
          {/* ---- Stat cards row ---- */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Overall Accuracy"
              value={pct(analytics.overallAccuracy, 1)}
              tone={accentBadge}
            />
            <StatCard
              label="Predicted Score (est.)"
              value={predictionLabel(prediction)}
              hint="Based on practice accuracy"
              tone={accentBadge}
            />
            <StatCard
              label="Readiness"
              value={`${analytics.readinessPercent}%`}
              hint="Mastery × topic coverage"
              tone={accentBadge}
            />
            <StatCard
              label="Avg Time / Question"
              value={analytics.avgSecondsPerQuestion > 0 ? formatClock(analytics.avgSecondsPerQuestion) : "—"}
              hint={analytics.avgSecondsPerQuestion > 0 ? paceLabel(analytics.avgSecondsPerQuestion, paceTarget) : undefined}
            />
          </div>

          {/* SAT section prediction bars (only if data available) */}
          {!isTmua && prediction?.kind === "sat" && (
            <Card className="p-4">
              <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${accentText}`}>
                Section Score Estimates
              </h3>
              <p className="mb-3 text-xs text-content-subtle">
                Math: <strong>{prediction.math}</strong> · R&amp;W: <strong>{prediction.rw}</strong> · Total: <strong>{prediction.total}</strong>
                {prediction.prioritise !== "Balanced" && (
                  <> · Prioritise: <strong>{prediction.prioritise}</strong></>
                )}
                <span className="ml-2 font-semibold text-amber-600">(ESTIMATES)</span>
              </p>
              <SatSectionBarsChart math={prediction.math} rw={prediction.rw} />
            </Card>
          )}

          {/* ---- Weakness Heatmap ---- */}
          <Card className="p-4">
            <h3 className={`mb-4 text-sm font-semibold uppercase tracking-wide ${accentText}`}>
              Topic Mastery Heatmap
            </h3>
            {analytics.accuracyByTopic.length === 0 ? (
              <p className="text-sm text-content-subtle">No topic data yet.</p>
            ) : (
              <Heatmap
                data={analytics.accuracyByTopic}
                accentClass={accentText}
              />
            )}
          </Card>

          {/* ---- Charts grid ---- */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Accuracy by topic */}
            {analytics.accuracyByTopic.some((t) => t.attempts_count > 0) && (
              <Card className="p-4">
                <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${accentText}`}>
                  Accuracy by Topic
                </h3>
                <AccuracyByTopicChart
                  data={analytics.accuracyByTopic.filter((t) => t.attempts_count > 0)}
                  color={chartColor}
                />
              </Card>
            )}

            {/* Accuracy by difficulty */}
            {analytics.accuracyByDifficulty.length > 0 && (
              <Card className="p-4">
                <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${accentText}`}>
                  Accuracy by Difficulty
                </h3>
                <AccuracyByDifficultyChart data={analytics.accuracyByDifficulty} />
              </Card>
            )}

            {/* Improvement over time */}
            {analytics.improvementOverTime.length > 1 && (
              <Card className="p-4">
                <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${accentText}`}>
                  Score Trend
                </h3>
                <ImprovementChart
                  data={analytics.improvementOverTime}
                  color={chartColor}
                  yLabel={isTmua ? "Band" : "Score"}
                  yDomain={improvementDomain}
                />
              </Card>
            )}

            {/* Time vs pace */}
            {analytics.timeVsPace.length > 0 && (
              <Card className="p-4">
                <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${accentText}`}>
                  Time vs Pace Target
                </h3>
                <TimeVsPaceChart data={analytics.timeVsPace} />
              </Card>
            )}

            {/* Confidence calibration */}
            {analytics.confidenceCalibration.length > 0 && (
              <Card className="p-4">
                <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${accentText}`}>
                  Confidence Calibration
                </h3>
                <p className="mb-2 text-xs text-content-subtle">
                  Ideal: Guessed → low accuracy · Confident → high accuracy
                </p>
                <ConfidenceCalibrationChart data={analytics.confidenceCalibration} />
              </Card>
            )}

            {/* Error type breakdown */}
            {analytics.errorTypeBreakdown.length > 0 && (
              <Card className="p-4">
                <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${accentText}`}>
                  Error Type Breakdown
                </h3>
                <ErrorTypeChart data={analytics.errorTypeBreakdown} />
              </Card>
            )}
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                  */
/* ------------------------------------------------------------------ */

export default async function AnalyticsPage() {
  const exams = getExams();

  if (exams.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <SectionHeader
          title="Analytics"
          subtitle="In-depth performance insights across all your exams"
        />
        <EmptyState
          title="No exams configured"
          description="Set up your exams in Settings to see analytics."
          icon="🎓"
        />
      </main>
    );
  }

  // Load analytics for each exam in parallel (they are sync/server functions,
  // but we map them immediately so data is ready before render).
  const analyticsMap: Map<number, ExamAnalytics> = new Map(
    exams.map((e) => [e.id, getExamAnalytics(e.id, e.name)]),
  );

  const tmua = exams.find((e) => e.name === "TMUA");
  const sat = exams.find((e) => e.name === "SAT");

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <SectionHeader
        title="Analytics"
        subtitle="In-depth performance insights — predictions are ESTIMATES based on practice accuracy"
      />

      <div className="space-y-12">
        {tmua && (
          <ExamPanel exam={tmua} analytics={analyticsMap.get(tmua.id)!} />
        )}
        {sat && (
          <ExamPanel exam={sat} analytics={analyticsMap.get(sat.id)!} />
        )}
        {/* Handle exams that are neither TMUA nor SAT */}
        {exams
          .filter((e) => e.name !== "TMUA" && e.name !== "SAT")
          .map((e) => (
            <ExamPanel key={e.id} exam={e} analytics={analyticsMap.get(e.id)!} />
          ))}
      </div>
    </main>
  );
}

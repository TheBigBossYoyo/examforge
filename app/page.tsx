import Link from "next/link";
import { getExams, getExamDashboard, getSetting, countQuestions, type ExamDashboard } from "@/lib/queries";
import { Card, ProgressRing, Badge, Bar, LinkButton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Countdown } from "@/components/Countdown";
import { InlineMarkdown } from "@/components/Markdown";
import { WeekSchedule } from "@/components/WeekSchedule";
import { getScheduleBlocks } from "@/lib/schedule";
import { getAgenda, getPhaseInfo } from "@/lib/planner";
import { formatDate, masteryColor, todayIso } from "@/lib/format";

export const dynamic = "force-dynamic";

function TopicRow({ subtopic, area, mastery }: { subtopic: string; area: string; mastery: number }) {
  return (
    <li className="flex items-center gap-3 group">
      <span className={`h-2 w-2 shrink-0 rounded-full shadow-sm transition-transform group-hover:scale-125 ${masteryColor(mastery)}`} />
      <span className="flex-1 truncate text-sm font-medium text-content-muted group-hover:text-content transition-colors" title={subtopic}>
        {subtopic}
      </span>
      <span className="text-xs font-bold text-content-muted bg-surface-muted/50 px-1.5 py-0.5 rounded-md border border-line">{mastery}%</span>
    </li>
  );
}

function ExamPanel({ d, tone }: { d: ExamDashboard; tone: "tmua" | "sat" }) {
  const isTmua = tone === "tmua";
  const ringColor = isTmua ? "#6d5dfc" : "#0ea5a4";
  const goalLabel = isTmua ? "9.0" : "1600";
  const accent = isTmua ? "text-tmua-dark" : "text-sat-dark";
  const hubHref = isTmua ? "/tmua" : "/sat";
  const lightBg = isTmua ? "bg-tmua-pale/50" : "bg-sat-pale/50";
  const borderTone = isTmua ? "border-tmua/20" : "border-sat/20";

  return (
    <Card className="flex flex-col gap-6 relative group overflow-visible">
      {/* Absolute decorative gradient glow behind card header */}
      <div className={`absolute top-0 right-0 left-0 h-32 rounded-t-[24px] opacity-40 ${isTmua ? "bg-gradient-to-b from-tmua-pale to-transparent" : "bg-gradient-to-b from-sat-pale to-transparent"} pointer-events-none`} />

      {/* Header */}
      <div className="flex items-start justify-between relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <Badge tone={tone} className="shadow-sm">{d.exam.name}</Badge>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-content-subtle">Target {goalLabel}</span>
          </div>
          <h2 className={`mt-2 text-2xl font-extrabold tracking-tight ${accent}`}>
            {isTmua ? "Test of Mathematics for University Admission" : "Digital SAT"}
          </h2>
          <p className="mt-1 text-sm font-medium text-content-muted">Exam date • {formatDate(d.examDate)}</p>
        </div>
        <Link href={hubHref} className="text-sm font-bold text-content-muted hover:text-content transition-colors bg-surface-muted px-3 py-1.5 rounded-xl hover:bg-surface-muted shadow-sm border border-line/50">
          Open hub →
        </Link>
      </div>

      <div className="relative z-10">
        <Countdown date={d.examDate} tone={tone} />
      </div>

      {/* Goal ring + projection */}
      <div className={`flex items-center gap-6 rounded-2xl border ${borderTone} ${lightBg} p-5 relative z-10 shadow-sm`}>
        <div className="drop-shadow-sm shrink-0">
          <ProgressRing
            value={d.projectedFraction}
            color={ringColor}
            size={110}
            stroke={12}
            trackColor="rgba(255,255,255,0.8)"
            label={<span className={accent}>{d.projectedLabel}</span>}
            sublabel={`/ ${goalLabel}`}
          />
        </div>
        <div className="flex-1 space-y-3">
          <div className="text-[13px] font-bold tracking-wide text-content">Projected score (estimate)</div>
          <Bar value={d.projectedFraction} color={isTmua ? "bg-tmua shadow-sm" : "bg-sat shadow-sm"} track="bg-surface" className="h-3" />
          <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs font-semibold text-content-muted">
            <span className="flex items-center gap-1.5 bg-surface px-2 py-1.5 rounded-lg shadow-sm border border-line/50"><Icon name="timer" size={14} /> {d.streakDays}-day streak</span>
            <span className="flex items-center gap-1.5 bg-surface px-2 py-1.5 rounded-lg shadow-sm border border-line/50"><Icon name="doc" size={14} /> {d.papersCompleted} papers done</span>
            {d.prioritise && d.prioritise !== "Balanced" && (
              <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2 py-1.5 rounded-lg shadow-sm border border-amber-200/50">Prioritise: {d.prioritise}</span>
            )}
          </div>
        </div>
      </div>

      {/* Strongest / weakest */}
      <div className="grid grid-cols-2 gap-6 relative z-10">
        <div className="bg-surface-muted/50 p-4 rounded-2xl border border-line/50 shadow-sm transition-colors hover:bg-surface-muted">
          <div className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-content-subtle">
            Strongest
          </div>
          {d.strongest.length ? (
            <ul className="space-y-2.5">
              {d.strongest.map((t) => (
                <TopicRow key={t.topic_id} {...t} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-content-subtle italic">Practise to reveal strengths.</p>
          )}
        </div>
        <div className="bg-surface-muted/50 p-4 rounded-2xl border border-line/50 shadow-sm transition-colors hover:bg-surface-muted">
          <div className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-content-subtle">
            Weakest
          </div>
          {d.weakest.length ? (
            <ul className="space-y-2.5">
              {d.weakest.map((t) => (
                <TopicRow key={t.topic_id} {...t} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-content-subtle italic">No weak spots logged yet.</p>
          )}
        </div>
      </div>

      {/* Recent mistakes */}
      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-content-subtle">
            Recent mistakes
          </span>
          <Link href="/mistakes" className="text-xs font-bold text-content-muted hover:text-content transition-colors">
            View all →
          </Link>
        </div>
        {d.recentMistakes.length ? (
          <ul className="space-y-2.5">
            {d.recentMistakes.map((m) => (
              <li key={m.id} className="flex items-start gap-3 text-sm p-3 rounded-2xl border border-line bg-surface shadow-sm hover:shadow-md transition-shadow">
                <span className="mt-0.5 text-rose-500"><Icon name="flag" size={16} /></span>
                <span className="flex-1 truncate font-medium text-content-muted">
                  <InlineMarkdown>{m.prompt_md.slice(0, 90)}</InlineMarkdown>
                </span>
                <Badge tone="rose" className="shrink-0 shadow-sm">
                  {m.error_type.replace(/_/g, " ")}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5 rounded-2xl border-2 border-dashed border-line bg-surface-muted/50 text-center">
            <p className="text-sm font-medium text-content-muted">No mistakes logged — start a paper or drill.</p>
          </div>
        )}
      </div>

      {/* Recommended next task */}
      <div className={`mt-2 relative z-10 overflow-hidden rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${isTmua ? "border-tmua bg-gradient-to-br from-tmua-pale to-white" : "border-sat bg-gradient-to-br from-sat-pale to-white"}`}>
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 blur-3xl opacity-50 ${isTmua ? "bg-tmua" : "bg-sat"} pointer-events-none`} />
        
        <div className="relative z-10">
          <div className={`text-[11px] font-extrabold uppercase tracking-widest ${isTmua ? "text-tmua-dark" : "text-sat-dark"}`}>
            Recommended next task
          </div>
          <div className="mt-1.5 text-xl font-extrabold tracking-tight text-content">{d.recommendation.title}</div>
          <p className="mt-1 text-sm font-medium text-content-muted leading-relaxed max-w-md">{d.recommendation.detail}</p>
          <LinkButton href={d.recommendation.href} variant={tone} className="mt-5 shadow-sm">
            {d.recommendation.cta} →
          </LinkButton>
        </div>
      </div>
    </Card>
  );
}

export default function HomePage() {
  const exams = getExams();
  const tmua = exams.find((e) => e.name === "TMUA");
  const sat = exams.find((e) => e.name === "SAT");
  const onboarded = getSetting("onboarding_complete", "false") === "true";

  if (!tmua || !sat) {
    return (
      <Card>
        <h1 className="text-2xl font-extrabold tracking-tight">Database not seeded</h1>
        <p className="mt-2 text-sm font-medium text-content-muted">
          Run <code className="rounded-md bg-surface-muted border border-line px-1.5 py-0.5 font-mono text-xs">npm run seed</code> to initialise
          exams, the topic taxonomy and resources.
        </p>
      </Card>
    );
  }

  const tmuaDash = getExamDashboard(tmua);
  const satDash = getExamDashboard(sat);
  const totalQuestions = countQuestions(tmua.id) + countQuestions(sat.id);

  const today = todayIso();
  const scheduleBlocks = getScheduleBlocks();
  const weekAgenda = getAgenda(undefined, 6);
  const phase = getPhaseInfo();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-content drop-shadow-sm">Dashboard</h1>
          <p className="mt-2 text-[15px] font-medium text-content-muted max-w-lg">
            Two exams, two boulders. Roll them daily. <strong className="text-content-muted">{totalQuestions} questions</strong> in your bank.
          </p>
        </div>
        {!onboarded && (
          <LinkButton href="/onboarding" variant="primary" className="shadow-md hover:shadow-lg">
            Take the 5-minute diagnostic
          </LinkButton>
        )}
      </div>

      <WeekSchedule blocks={scheduleBlocks} agenda={weekAgenda} phase={phase} today={today} />

      <div className="grid gap-6 xl:grid-cols-2 items-start">
        <ExamPanel d={tmuaDash} tone="tmua" />
        <ExamPanel d={satDash} tone="sat" />
      </div>
    </div>
  );
}

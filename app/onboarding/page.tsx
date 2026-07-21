import { getExams, getSetting, countQuestions, effectiveExamDate } from "@/lib/queries";
import { Card, Badge, LinkButton, SectionHeader, EmptyState } from "@/components/ui";
import { Countdown } from "@/components/Countdown";
import { formatDate } from "@/lib/format";
import { FinishOnboarding } from "@/components/OnboardingControls";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    n: 1,
    title: "Confirm your targets & dates",
    body: "TMUA 9.0 by 13 Oct 2026 · Digital SAT 1600 by 22 Aug 2026. Editable any time in Settings.",
  },
  {
    n: 2,
    title: "Sit two short diagnostics",
    body: "A quick mixed set per exam calibrates your starting accuracy so the dashboard projections and recommendations mean something on day one.",
  },
  {
    n: 3,
    title: "Let ExamForge plan your boulder",
    body: "From there, the dashboard surfaces your weakest topics, builds a mistake notebook, and recommends the next highest-leverage task.",
  },
];

export default function OnboardingPage() {
  const exams = getExams();
  const tmua = exams.find((e) => e.name === "TMUA");
  const sat = exams.find((e) => e.name === "SAT");
  const done = getSetting("onboarding_complete", "false") === "true";

  if (!tmua || !sat) {
    return (
      <EmptyState
        icon="🌱"
        title="Database not seeded"
        description="Run `npm run seed` to initialise exams, the topic taxonomy and resources, then return here."
      />
    );
  }

  const totalQuestions = countQuestions(tmua.id) + countQuestions(sat.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SectionHeader
        title="Welcome to ExamForge"
        subtitle="Two exams, two boulders. Let's calibrate your starting point — about 5 minutes."
        right={<FinishOnboarding done={done} />}
      />

      {/* Steps */}
      <div className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <Card key={s.n} className="space-y-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-content text-sm font-bold text-white">
              {s.n}
            </div>
            <div className="mt-1 text-sm font-semibold text-content">{s.title}</div>
            <p className="text-xs text-content-muted">{s.body}</p>
          </Card>
        ))}
      </div>

      {/* Diagnostics */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Badge tone="tmua">TMUA</Badge>
            <span className="text-xs text-content-subtle">Target 9.0 · {formatDate(effectiveExamDate(tmua))}</span>
          </div>
          <Countdown date={effectiveExamDate(tmua)} tone="tmua" />
          <p className="text-sm text-content-muted">
            A short non-calculator diagnostic across Paper 1 (applications) and Paper 2 (reasoning &
            proof). No calculator — TMUA is non-calculator.
          </p>
          <LinkButton href="/practice?exam=TMUA&mode=diagnostic&count=12&title=TMUA%20diagnostic" variant="tmua">
            Start TMUA diagnostic →
          </LinkButton>
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Badge tone="sat">Digital SAT</Badge>
            <span className="text-xs text-content-subtle">Target 1600 · {formatDate(effectiveExamDate(sat))}</span>
          </div>
          <Countdown date={effectiveExamDate(sat)} tone="sat" />
          <p className="text-sm text-content-muted">
            A mixed Math + Reading & Writing diagnostic. Desmos is available on the Math questions,
            just like the real Digital SAT.
          </p>
          <LinkButton href="/practice?exam=SAT&mode=diagnostic&count=12&title=SAT%20diagnostic" variant="sat">
            Start SAT diagnostic →
          </LinkButton>
        </Card>
      </div>

      <Card className="flex flex-col items-start gap-2 bg-surface-muted/60">
        <div className="text-sm text-content-muted">
          Your bank holds <strong>{totalQuestions}</strong> original / imported questions. Copyright
          rules mean official past papers are linked, never stored — diagnostics draw only from your
          own bank. Add more on the Import page any time.
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/admin" variant="outline">Import questions</LinkButton>
          <LinkButton href="/settings" variant="ghost">Edit targets & dates</LinkButton>
          <FinishOnboarding done={done} />
        </div>
      </Card>
    </div>
  );
}

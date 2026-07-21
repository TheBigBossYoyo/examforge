import { buildRunnerConfig, type LaunchOptions } from "@/lib/launch";
import { PracticeRunner } from "@/components/PracticeRunner";
import { EmptyState, LinkButton } from "@/components/ui";
import type { AttemptMode, ExamName } from "@/lib/types";

export const dynamic = "force-dynamic";

const MODES: AttemptMode[] = ["exam", "diagnostic", "untimed", "drill", "redo"];

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function num(v: string | string[] | undefined): number | undefined {
  const s = str(v);
  if (s == null || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export default function PracticePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const examRaw = str(searchParams.exam);
  const exam: ExamName = examRaw === "SAT" ? "SAT" : "TMUA";
  const modeRaw = str(searchParams.mode) as AttemptMode | undefined;
  const mode: AttemptMode = modeRaw && MODES.includes(modeRaw) ? modeRaw : "drill";

  const idsRaw = str(searchParams.ids);
  const questionIds = idsRaw
    ? idsRaw
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n))
    : undefined;

  const opts: LaunchOptions = {
    exam,
    mode,
    topicId: num(searchParams.topic),
    area: str(searchParams.area),
    difficulty: str(searchParams.difficulty),
    count: num(searchParams.count),
    paperId: num(searchParams.paper),
    desmosOnly: str(searchParams.desmos) === "1",
    questionIds,
    title: str(searchParams.title),
  };

  const result = buildRunnerConfig(opts);

  if (!result.ok || !result.config) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon="🗒️"
          title="Nothing to practise here yet"
          description={result.reason}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <LinkButton href={exam === "TMUA" ? "/tmua" : "/sat"} variant={exam === "TMUA" ? "tmua" : "sat"}>
                Back to {exam} hub
              </LinkButton>
              <LinkButton href="/admin" variant="outline">
                Import questions
              </LinkButton>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PracticeRunner config={result.config} />
    </div>
  );
}

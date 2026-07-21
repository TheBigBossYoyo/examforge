import { getExamById } from "@/lib/queries";
import { startSection } from "@/lib/test-session";
import { ExamRunner } from "@/components/exam/ExamRunner";
import { EmptyState, LinkButton } from "@/components/ui";
import type { AttemptMode, ExamName } from "@/lib/types";

export const dynamic = "force-dynamic";

const MODES: AttemptMode[] = ["exam", "diagnostic", "untimed"];

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function ExamRunPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const examId = Number(str(searchParams.examId));
  const section = str(searchParams.section) ?? "";
  const modeRaw = str(searchParams.mode) as AttemptMode | undefined;
  const mode: AttemptMode = modeRaw && MODES.includes(modeRaw) ? modeRaw : "exam";

  const exam = Number.isFinite(examId) ? getExamById(examId) : undefined;

  let handle;
  let error: string | null = null;
  if (!exam) {
    error = "That exam does not exist. Run `npm run seed` if the database is empty.";
  } else {
    try {
      handle = startSection({ examId, section, mode });
    } catch (err) {
      error = err instanceof Error ? err.message : "Could not start this section.";
    }
  }

  if (error || !handle || !exam) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon="📋"
          title="Cannot start this section"
          description={error ?? "Unknown error."}
          action={
            <LinkButton href="/exam" variant="outline">
              Back to sections
            </LinkButton>
          }
        />
      </div>
    );
  }

  if (handle.questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon="📭"
          title="No questions available for this section"
          description="The bank has nothing tagged to this section yet. Load the starter bank with `npm run load:bank`, or import your own on the Admin page."
          action={
            <LinkButton href="/admin" variant="outline">
              Import questions
            </LinkButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <ExamRunner initial={handle} examName={exam.name as ExamName} />
    </div>
  );
}

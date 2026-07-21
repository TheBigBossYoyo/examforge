import Link from "next/link";
import { getMistakes, getExams } from "@/lib/queries";
import { TMUA_ERROR_TYPES, SAT_ERROR_TYPES, type ExamName } from "@/lib/types";
import { Card, Badge, EmptyState, SectionHeader, LinkButton } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { formatDate } from "@/lib/format";
import { MistakeActions, RedoAllButton, PrintButton } from "@/components/MistakeActions";

export const dynamic = "force-dynamic";

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const FILTER_LINK =
  "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors";

export default function MistakesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const exams = getExams();
  const examFilter = str(searchParams.exam) as ExamName | undefined;
  const exam = examFilter ? exams.find((e) => e.name === examFilter) : undefined;
  const statusFilter = str(searchParams.status) ?? "open"; // open | resolved | all
  const errorType = str(searchParams.error);

  const resolved = statusFilter === "all" ? undefined : statusFilter === "resolved";

  const mistakes = getMistakes({
    examId: exam?.id,
    resolved,
    errorType,
    limit: 500,
  });

  const errorOptions = (examFilter === "SAT" ? SAT_ERROR_TYPES : TMUA_ERROR_TYPES) as readonly string[];
  const allErrorOptions = [...TMUA_ERROR_TYPES, ...SAT_ERROR_TYPES];

  // Unresolved ids grouped by exam for "redo all".
  const unresolvedByExam = new Map<string, number[]>();
  for (const m of mistakes) {
    if (m.resolved === 0) {
      const ex = exams.find((e) => e.id === m.exam_id)?.name ?? "TMUA";
      const arr = unresolvedByExam.get(ex) ?? [];
      arr.push(m.question_id);
      unresolvedByExam.set(ex, arr);
    }
  }

  const buildHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { exam: examFilter, status: statusFilter, error: errorType, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/mistakes${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Mistake notebook"
        subtitle={`${mistakes.length} ${statusFilter === "all" ? "" : statusFilter} mistake${mistakes.length === 1 ? "" : "s"} — fix them, then redo to lock it in.`}
        right={
          <div className="flex gap-2">
            {[...unresolvedByExam.entries()].map(([ex, ids]) => (
              <RedoAllButton key={ex} exam={ex} ids={ids} />
            ))}
            <PrintButton />
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 print:hidden">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-content-subtle">Exam:</span>
          <Link href={buildHref({ exam: undefined })} className={`${FILTER_LINK} ${!examFilter ? "bg-content text-white ring-ink-900" : "bg-surface text-content-muted ring-line"}`}>All</Link>
          <Link href={buildHref({ exam: "TMUA" })} className={`${FILTER_LINK} ${examFilter === "TMUA" ? "bg-tmua text-white ring-tmua" : "bg-surface text-content-muted ring-line"}`}>TMUA</Link>
          <Link href={buildHref({ exam: "SAT" })} className={`${FILTER_LINK} ${examFilter === "SAT" ? "bg-sat text-white ring-sat" : "bg-surface text-content-muted ring-line"}`}>SAT</Link>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-content-subtle">Status:</span>
          {["open", "resolved", "all"].map((s) => (
            <Link key={s} href={buildHref({ status: s })} className={`${FILTER_LINK} capitalize ${statusFilter === s ? "bg-content text-white ring-ink-900" : "bg-surface text-content-muted ring-line"}`}>{s}</Link>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-content-subtle">Type:</span>
          <Link href={buildHref({ error: undefined })} className={`${FILTER_LINK} ${!errorType ? "bg-content text-white ring-ink-900" : "bg-surface text-content-muted ring-line"}`}>Any</Link>
          {(examFilter ? errorOptions : allErrorOptions).map((et) => (
            <Link key={et} href={buildHref({ error: et })} className={`${FILTER_LINK} ${errorType === et ? "bg-content text-white ring-ink-900" : "bg-surface text-content-muted ring-line"}`}>{et.replace(/_/g, " ")}</Link>
          ))}
        </div>
      </div>

      {mistakes.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No mistakes here"
          description={statusFilter === "resolved" ? "Nothing resolved yet." : "Clean slate — sit a paper or drill to surface weak spots."}
          action={<LinkButton href="/tmua/papers" variant="primary">Start practising</LinkButton>}
        />
      ) : (
        <div className="space-y-3">
          {mistakes.map((m) => {
            const examName = exams.find((e) => e.id === m.exam_id)?.name ?? "TMUA";
            // widened to string[]: error_type is free-text in the DB, so a row may
            // legitimately carry a value from the other exam's set (or a legacy one).
            const opts: string[] = examName === "SAT" ? [...SAT_ERROR_TYPES] : [...TMUA_ERROR_TYPES];
            // ensure current value is selectable even if cross-set
            if (!opts.includes(m.error_type)) opts.unshift(m.error_type);
            return (
              <Card key={m.id} className={m.resolved ? "opacity-70" : ""}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone={examName === "TMUA" ? "tmua" : "sat"}>{examName}</Badge>
                  {m.subtopic && <Badge tone="ink">{m.subtopic}</Badge>}
                  <Badge tone="rose">{m.error_type.replace(/_/g, " ")}</Badge>
                  {m.resolved === 1 && <Badge tone="green">resolved</Badge>}
                  <span className="ml-auto text-xs text-content-subtle">{formatDate(m.created_at.slice(0, 10))}</span>
                </div>

                <Markdown className="text-sm">{m.prompt_md}</Markdown>

                <div className="mt-2 text-sm">
                  <span className="text-xs font-medium uppercase tracking-wide text-content-subtle">Correct answer: </span>
                  <span className="font-medium text-emerald-700">{m.correct_answer}</span>
                </div>

                {m.solution_md && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-semibold text-content-muted hover:text-content">Solution</summary>
                    <div className="mt-2 rounded-lg bg-surface-muted/60 px-3 py-2">
                      <Markdown className="text-sm">{m.solution_md}</Markdown>
                    </div>
                  </details>
                )}

                {m.note_md && (
                  <div className="mt-2 rounded-lg border-l-4 border-amber-300 bg-amber-50/60 px-3 py-2 text-sm text-content-muted">
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">Note: </span>
                    <Markdown className="inline text-sm">{m.note_md}</Markdown>
                  </div>
                )}

                <MistakeActions
                  id={m.id}
                  resolved={m.resolved === 1}
                  note={m.note_md}
                  errorType={m.error_type}
                  errorOptions={opts}
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

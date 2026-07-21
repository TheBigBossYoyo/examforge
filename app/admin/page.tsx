import { getExams, countQuestions } from "@/lib/queries";
import { queryOne } from "@/lib/db";
import { Card, SectionHeader } from "@/components/ui";
import { ImportPanel } from "@/components/ImportPanel";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const exams = getExams();
  const counts = exams.map((e) => ({
    name: e.name,
    questions: countQuestions(e.id),
  }));
  const totalAttempts =
    queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM attempts")?.n ?? 0;
  const totalMistakes =
    queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM mistakes")?.n ?? 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Admin — Import &amp; Export"
        subtitle="Manage your personal question bank and export all data."
      />

      {/* Bank stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map((c) => (
          <div key={c.name} className="rounded-xl border border-line bg-surface p-4 text-center">
            <div className="text-2xl font-bold text-content">{c.questions}</div>
            <div className="mt-0.5 text-xs font-medium text-content-subtle">{c.name} questions</div>
          </div>
        ))}
        <div className="rounded-xl border border-line bg-surface p-4 text-center">
          <div className="text-2xl font-bold text-content">{totalAttempts}</div>
          <div className="mt-0.5 text-xs font-medium text-content-subtle">Attempts</div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 text-center">
          <div className="text-2xl font-bold text-content">{totalMistakes}</div>
          <div className="mt-0.5 text-xs font-medium text-content-subtle">Mistakes logged</div>
        </div>
      </div>

      {/* Copyright notice */}
      <Card className="border-l-4 border-amber-400 bg-amber-50/60">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚖️</span>
          <div>
            <h3 className="font-semibold text-content">Copyright policy</h3>
            <p className="mt-1 text-sm text-content-muted">
              Your question bank holds only{" "}
              <strong>user-imported or AI-generated original questions</strong>. Official TMUA and
              SAT past-paper questions are copyrighted — ExamForge links to those resources but
              never stores or reproduces them. Only import your own original practice questions.
            </p>
          </div>
        </div>
      </Card>

      {/* Import */}
      <Card>
        <h2 className="section-title mb-1">Import Questions</h2>
        <p className="mb-4 text-sm text-content-muted">
          Paste or upload your own original questions in JSON or CSV format. Only your own
          user-created content may be imported.
        </p>

        <details className="mb-4">
          <summary className="cursor-pointer text-sm font-semibold text-content-muted hover:text-content">
            JSON field reference
          </summary>
          <div className="mt-2 space-y-0.5 rounded-lg bg-surface-muted px-4 py-3 font-mono text-xs text-content-muted">
            <div>
              <span className="text-tmua-dark">exam</span>{" "}
              <span className="text-content-subtle">
                — &quot;TMUA&quot; | &quot;SAT&quot; (required)
              </span>
            </div>
            <div>
              <span className="text-tmua-dark">area</span>{" "}
              <span className="text-content-subtle">— e.g. &quot;P1&quot;, &quot;Math&quot;, &quot;RW&quot; (required)</span>
            </div>
            <div>
              <span className="text-tmua-dark">subtopic</span>{" "}
              <span className="text-content-subtle">— must match a known subtopic (required)</span>
            </div>
            <div>
              <span className="text-tmua-dark">prompt_md</span>{" "}
              <span className="text-content-subtle">— question text with Markdown/LaTeX (required)</span>
            </div>
            <div>
              <span className="text-tmua-dark">correct_answer</span>{" "}
              <span className="text-content-subtle">— the correct answer string (required)</span>
            </div>
            <div>
              <span className="text-tmua-dark">choices</span>{" "}
              <span className="text-content-subtle">— string array (null for free-response)</span>
            </div>
            <div>
              <span className="text-tmua-dark">solution_md</span>{" "}
              <span className="text-content-subtle">— worked solution</span>
            </div>
            <div>
              <span className="text-tmua-dark">difficulty</span>{" "}
              <span className="text-content-subtle">— easy | med | hard | 1600level | real</span>
            </div>
            <div>
              <span className="text-tmua-dark">desmos_recommended</span>{" "}
              <span className="text-content-subtle">— true | false</span>
            </div>
            <div>
              <span className="text-tmua-dark">hint1_md / hint2_md / hint3_md</span>{" "}
              <span className="text-content-subtle">— progressive hints</span>
            </div>
            <div>
              <span className="text-tmua-dark">faster_method_md</span>{" "}
              <span className="text-content-subtle">— Desmos / faster approach note</span>
            </div>
            <div>
              <span className="text-tmua-dark">source_label</span>{" "}
              <span className="text-content-subtle">— attribution label</span>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-content-subtle">
            See{" "}
            <code className="rounded bg-surface-muted px-1">samples/questions.sample.json</code> for a
            complete example.
          </p>
        </details>

        <details className="mb-5">
          <summary className="cursor-pointer text-sm font-semibold text-content-muted hover:text-content">
            CSV header reference
          </summary>
          <div className="mt-2 rounded-lg bg-surface-muted px-4 py-3">
            <code className="block break-all text-xs text-content-muted">
              exam,area,subtopic,prompt_md,choices_pipe,correct_answer,solution_md,faster_method_md,difficulty,desmos_recommended,desmos_state_json,hint1_md,hint2_md,hint3_md,source_label
            </code>
            <p className="mt-1.5 text-xs text-content-subtle">
              <strong>choices_pipe</strong>: separate multiple-choice options with | (pipe). See{" "}
              <code className="rounded bg-surface-muted px-1">samples/questions.sample.csv</code>.
            </p>
          </div>
        </details>

        <ImportPanel />
      </Card>

      {/* Export */}
      <Card>
        <h2 className="section-title mb-1">Export Data</h2>
        <p className="mb-4 text-sm text-content-muted">
          Download a full snapshot of your question bank, attempts, responses, mistakes, and
          settings as JSON. This is your own data — keep regular backups.
        </p>
        <a
          href="/api/export"
          download="examforge-export.json"
          className="btn-outline inline-block"
        >
          ⬇ Download examforge-export.json
        </a>
      </Card>
    </div>
  );
}

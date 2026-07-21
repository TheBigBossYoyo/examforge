import { getExam, getPapers } from "@/lib/queries";
import { Card, SectionHeader, Badge, LinkButton } from "@/components/ui";
import { SelfScoreForm } from "@/components/SelfScoreForm";

export const dynamic = "force-dynamic";

export default function TmuaPapersPage() {
  const tmua = getExam("TMUA");
  
  if (!tmua) {
    return (
      <Card>
        <h1 className="text-lg font-semibold">Database not seeded</h1>
      </Card>
    );
  }

  const papers = getPapers(tmua.id);
  
  // Group by year descending
  const byYear = papers.reduce((acc, p) => {
    const y = p.year ?? 0;
    if (!acc[y]) acc[y] = [];
    acc[y].push(p);
    return acc;
  }, {} as Record<number, typeof papers>);

  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  return (
    <div className="space-y-8">
      <SectionHeader 
        title="TMUA Past Papers" 
        subtitle="Official past papers and mocks" 
        right={<LinkButton href="/practice?exam=TMUA&mode=exam" variant="tmua">Bank Simulation</LinkButton>}
      />

      <Card className="bg-amber-50 border-amber-200">
        <h2 className="font-semibold text-amber-900">Copyright Notice</h2>
        <p className="mt-1 text-sm text-amber-800">
          Official TMUA papers are linked, never copied. Sit the PDF under timed conditions, then self-score below to track your performance and get a scaled band projection.
        </p>
      </Card>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-1 lg:col-span-1 space-y-4">
          <h3 className="font-semibold text-ink-900">Log an Attempt</h3>
          <SelfScoreForm examId={tmua.id} papers={papers} />
        </div>

        <div className="md:col-span-1 lg:col-span-2 space-y-8">
          {years.map(y => (
            <div key={y}>
              <h3 className="mb-3 text-lg font-bold text-ink-900">{y === 0 ? "Other / Mocks" : y}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {byYear[y].map(p => (
                  <Card key={p.id} className="flex flex-col">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-ink-800">{p.title}</h4>
                        <Badge tone="ink" className="shrink-0">{p.kind}</Badge>
                      </div>
                      {p.time_limit_min && (
                        <p className="mt-1 text-xs text-ink-500">⏱️ {p.time_limit_min} mins</p>
                      )}
                      {p.note && (
                        <p className="mt-2 text-xs text-ink-600 border-l-2 border-ink-200 pl-2">{p.note}</p>
                      )}
                    </div>
                    {p.pdf_url && (
                      <div className="mt-4">
                        <LinkButton href={p.pdf_url} variant="outline" external className="w-full text-center text-sm py-1.5">
                          View official PDF
                        </LinkButton>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

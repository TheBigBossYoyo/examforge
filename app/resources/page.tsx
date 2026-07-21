import Link from "next/link";
import { getResources, getExam } from "@/lib/queries";
import { Card, SectionHeader, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function ResourcesPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const examFilter = typeof searchParams.exam === "string" ? searchParams.exam : undefined;
  const typeFilter = typeof searchParams.type === "string" ? searchParams.type : undefined;

  let examId: number | undefined = undefined;
  if (examFilter) {
    const e = getExam(examFilter as any);
    if (e) examId = e.id;
  }

  const allResources = getResources(examId);
  const resources = typeFilter ? allResources.filter(r => r.type === typeFilter) : allResources;

  // Derive unique types for the filter chips
  const types = Array.from(new Set(allResources.map(r => r.type))).sort();

  return (
    <div className="space-y-8">
      <SectionHeader 
        title="Resource Library" 
        subtitle={`External links and materials (${resources.length})`}
      />

      <div className="flex flex-wrap gap-2">
        <Link 
          href={`/resources${examFilter ? `?exam=${examFilter}` : ''}`}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${!typeFilter ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'}`}
        >
          All
        </Link>
        {types.map(t => {
          const params = new URLSearchParams();
          if (examFilter) params.set("exam", examFilter);
          params.set("type", t);
          const active = typeFilter === t;
          return (
            <Link 
              key={t}
              href={`/resources?${params.toString()}`}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${active ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'}`}
            >
              {t.replace(/_/g, " ")}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resources.map(r => (
          <Card key={r.id} hover className="flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-ink-900 hover:underline">
                {r.title}
              </a>
              <div className="flex flex-col gap-1 shrink-0 items-end">
                <Badge tone="ink">{r.type.replace(/_/g, " ")}</Badge>
                {r.cost === "free" ? <Badge tone="green">Free</Badge> : <Badge tone="rose">Paid</Badge>}
              </div>
            </div>
            
            {r.relevance && (
              <div className="mt-2 text-xs text-ink-500">
                Relevance: {r.relevance}/10
              </div>
            )}
            
            {r.license_note && (
              <div className="mt-4 pt-3 border-t border-ink-100 text-xs text-ink-400">
                <span className="font-semibold">License/Note:</span> {r.license_note}
              </div>
            )}
          </Card>
        ))}
        {resources.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 text-center py-12 text-ink-500 bg-white/50 rounded-xl border border-dashed border-ink-200">
            No resources found for the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}

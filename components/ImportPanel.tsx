"use client";

import { useState, useRef } from "react";
import type { ImportResult } from "@/lib/importer";

export function ImportPanel() {
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [data, setData] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const detected: "json" | "csv" = file.name.endsWith(".csv") ? "csv" : "json";
    setFormat(detected);
    const reader = new FileReader();
    reader.onload = (ev) => setData((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, data }),
      });
      const json = (await res.json()) as ImportResult & { error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? "Import failed");
      } else {
        setResult(json);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Format selector + file upload */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex overflow-hidden rounded-lg border border-line text-sm">
          {(["json", "csv"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-4 py-1.5 font-medium transition-colors ${
                format === f
                  ? "bg-content text-white"
                  : "bg-surface text-content-muted hover:bg-surface-muted"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <button onClick={() => fileRef.current?.click()} className="btn-outline text-sm">
          📂 Upload file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {/* Paste area */}
      <textarea
        className="input w-full font-mono text-xs"
        rows={10}
        placeholder={
          format === "json"
            ? `Paste a JSON array:\n[\n  {\n    "exam": "SAT",\n    "area": "Math",\n    "subtopic": "Systems & inequalities",\n    "prompt_md": "...",\n    "correct_answer": "..."\n  }\n]`
            : `Paste CSV (first row must be header):\nexam,area,subtopic,prompt_md,choices_pipe,correct_answer,...`
        }
        value={data}
        onChange={(e) => setData(e.target.value)}
      />

      <button
        onClick={handleImport}
        disabled={loading || !data.trim()}
        className="btn-primary"
      >
        {loading ? "Importing…" : "Import questions"}
      </button>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            result.rejected.length === 0
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <div className="font-semibold">
            ✓ {result.inserted} question{result.inserted !== 1 ? "s" : ""} imported
            {result.rejected.length > 0 && ` · ${result.rejected.length} rejected`}
          </div>
          {result.rejected.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer font-medium text-amber-700">
                Show {result.rejected.length} rejected row{result.rejected.length !== 1 ? "s" : ""}
              </summary>
              <ul className="mt-2 space-y-1">
                {result.rejected.map((r) => (
                  <li key={r.index} className="text-xs">
                    <span className="font-medium">Row {r.index}:</span> {r.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

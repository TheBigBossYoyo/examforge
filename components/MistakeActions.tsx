"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "resolve" | "unresolve" | "note" | "errorType";

async function patch(body: {
  id: number;
  action: Action;
  note_md?: string;
  error_type?: string;
}): Promise<boolean> {
  const res = await fetch("/api/mistake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export function MistakeActions({
  id,
  resolved,
  note,
  errorType,
  errorOptions,
}: {
  id: number;
  resolved: boolean;
  note: string | null;
  errorType: string;
  errorOptions: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [draft, setDraft] = useState(note ?? "");

  const run = async (body: Parameters<typeof patch>[0]) => {
    setBusy(true);
    const ok = await patch(body);
    setBusy(false);
    if (ok) router.refresh();
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm print:hidden">
      <button
        onClick={() => run({ id, action: resolved ? "unresolve" : "resolve" })}
        disabled={busy}
        className={resolved ? "btn-ghost text-xs" : "btn-primary text-xs"}
      >
        {resolved ? "↺ Mark unresolved" : "✓ Mark resolved"}
      </button>

      <select
        value={errorType}
        disabled={busy}
        onChange={(e) => run({ id, action: "errorType", error_type: e.target.value })}
        className="rounded-lg border border-line px-2 py-1 text-xs"
        aria-label="Error type"
      >
        {errorOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <button onClick={() => setNoteOpen((o) => !o)} className="btn-outline text-xs">
        {note ? "Edit note" : "Add note"}
      </button>

      {noteOpen && (
        <div className="flex w-full items-center gap-2">
          <input
            className="input flex-1 text-sm"
            placeholder="What went wrong / how to fix it…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            onClick={() => run({ id, action: "note", note_md: draft }).then(() => setNoteOpen(false))}
            disabled={busy}
            className="btn-primary text-xs"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-outline print:hidden">
      🖨 Print
    </button>
  );
}

export function RedoAllButton({ exam, ids }: { exam: string; ids: number[] }) {
  if (ids.length === 0) return null;
  const href = `/practice?exam=${exam}&mode=redo&ids=${ids.join(",")}&title=${encodeURIComponent(
    "Redo unresolved mistakes",
  )}`;
  return (
    <a href={href} className={`btn-${exam === "TMUA" ? "tmua" : "sat"} print:hidden`}>
      ↻ Redo all {ids.length} unresolved
    </a>
  );
}

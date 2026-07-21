"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FinishOnboarding({ done }: { done: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const toggle = async (complete: boolean) => {
    setBusy(true);
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complete }),
    });
    setBusy(false);
    router.refresh();
    if (complete) router.push("/");
  };

  if (done) {
    return (
      <div className="flex items-center gap-3">
        <span className="badge bg-emerald-100 text-emerald-700">✓ Setup complete</span>
        <button onClick={() => toggle(false)} disabled={busy} className="btn-ghost text-xs">
          Re-run onboarding
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => toggle(true)} disabled={busy} className="btn-primary">
      {busy ? "Saving…" : "Skip & mark setup complete →"}
    </button>
  );
}

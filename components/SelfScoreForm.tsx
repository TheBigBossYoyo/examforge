"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Paper } from "@/lib/types";
import { Card } from "@/components/ui";

export function SelfScoreForm({ examId, papers }: { examId: number; papers: Paper[] }) {
  const router = useRouter();
  const [paperId, setPaperId] = useState<string>("none");
  const [rawScore, setRawScore] = useState<string>("");
  const [maxRaw, setMaxRaw] = useState<string>("20");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successScore, setSuccessScore] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessScore(null);

    try {
      const pId = paperId === "none" ? null : parseInt(paperId, 10);
      const res = await fetch("/api/selfscore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId,
          paperId: pId,
          rawScore: parseInt(rawScore, 10),
          maxRaw: parseInt(maxRaw, 10),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit score");
      }

      const data = await res.json();
      if (data.attemptId) {
        router.push(`/review/${data.attemptId}`);
      } else if (data.scaledLabel) {
        setSuccessScore(`Scaled Score: ${data.scaledLabel}`);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">Paper</label>
          <select
            value={paperId}
            onChange={(e) => setPaperId(e.target.value)}
            className="input w-full mt-1"
          >
            <option value="none">No specific paper</option>
            {papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.year ? `${p.year} ` : ""}{p.title}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="label">Raw Score</label>
            <input
              type="number"
              min="0"
              max={maxRaw}
              required
              value={rawScore}
              onChange={(e) => setRawScore(e.target.value)}
              className="input w-full mt-1"
            />
          </div>
          <div className="flex-1">
            <label className="label">Max Raw</label>
            <input
              type="number"
              min="1"
              required
              value={maxRaw}
              onChange={(e) => setMaxRaw(e.target.value)}
              className="input w-full mt-1"
            />
          </div>
        </div>

        {error && <div className="text-rose-600 text-sm font-medium">{error}</div>}
        {successScore && <div className="text-emerald-600 text-sm font-medium">{successScore}</div>}

        <button
          type="submit"
          disabled={loading}
          className="btn-tmua w-full"
        >
          {loading ? "Submitting..." : "Score Attempt"}
        </button>
      </form>
    </Card>
  );
}

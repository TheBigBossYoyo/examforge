"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SettingsDefaults {
  tmua_band_table: string;
  sat_math_config: string;
  sat_rw_config: string;
}

interface SettingsFormProps {
  initial: Record<string, string>;
  defaults: SettingsDefaults;
}

export function SettingsForm({ initial, defaults }: SettingsFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const set = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);

    const changed: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      if (value !== (initial[key] ?? "")) {
        changed[key] = value;
      }
    }

    if (Object.keys(changed).length === 0) {
      setStatus({ ok: true, msg: "No changes to save." });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: changed }),
      });
      const json = (await res.json()) as { ok?: boolean; saved?: number; error?: string };
      if (!res.ok || json.error) {
        setStatus({ ok: false, msg: json.error ?? "Save failed." });
      } else {
        setStatus({
          ok: true,
          msg: `Saved ${json.saved ?? 0} setting${(json.saved ?? 0) !== 1 ? "s" : ""}.`,
        });
        router.refresh();
      }
    } catch (err) {
      setStatus({ ok: false, msg: err instanceof Error ? err.message : "Network error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Exam Dates & Targets */}
      <div className="card">
        <h2 className="section-title mb-4">Exam Dates &amp; Targets</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tmua_exam_date">
              TMUA Exam Date
            </label>
            <input
              id="tmua_exam_date"
              type="date"
              className="input w-full"
              value={values.tmua_exam_date ?? ""}
              onChange={(e) => set("tmua_exam_date", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="sat_exam_date">
              SAT Exam Date
            </label>
            <input
              id="sat_exam_date"
              type="date"
              className="input w-full"
              value={values.sat_exam_date ?? ""}
              onChange={(e) => set("sat_exam_date", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="tmua_target">
              TMUA Target Score (1.0–9.0)
            </label>
            <input
              id="tmua_target"
              type="number"
              min={1}
              max={9}
              step={0.1}
              className="input w-full"
              value={values.tmua_target ?? ""}
              onChange={(e) => set("tmua_target", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="sat_target">
              SAT Target Score (400–1600)
            </label>
            <input
              id="sat_target"
              type="number"
              min={400}
              max={1600}
              step={10}
              className="input w-full"
              value={values.sat_target ?? ""}
              onChange={(e) => set("sat_target", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Pace */}
      <div className="card">
        <h2 className="section-title mb-4">Pace (seconds per question)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="tmua_pace">
              TMUA
            </label>
            <input
              id="tmua_pace"
              type="number"
              min={30}
              max={600}
              className="input w-full"
              value={values.tmua_pace_seconds ?? ""}
              onChange={(e) => set("tmua_pace_seconds", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="sat_math_pace">
              SAT Math
            </label>
            <input
              id="sat_math_pace"
              type="number"
              min={30}
              max={600}
              className="input w-full"
              value={values.sat_math_pace_seconds ?? ""}
              onChange={(e) => set("sat_math_pace_seconds", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="sat_rw_pace">
              SAT R&amp;W
            </label>
            <input
              id="sat_rw_pace"
              type="number"
              min={30}
              max={600}
              className="input w-full"
              value={values.sat_rw_pace_seconds ?? ""}
              onChange={(e) => set("sat_rw_pace_seconds", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Score Conversion Tables */}
      <div className="card">
        <h2 className="section-title mb-1">Score Conversion Tables</h2>
        <p className="mb-4 text-xs text-ink-400">
          All score conversions are estimates — real conversions are norm-referenced per sitting and
          vary year to year.
        </p>
        <div className="space-y-5">
          {/* TMUA band table */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label mb-0" htmlFor="tmua_band_table">
                TMUA Band Table{" "}
                <span className="font-normal text-ink-400">(21-length numeric JSON array)</span>
              </label>
              <button
                type="button"
                onClick={() => set("tmua_band_table", defaults.tmua_band_table)}
                className="text-xs text-ink-400 underline hover:text-ink-700"
              >
                Reset to default
              </button>
            </div>
            <textarea
              id="tmua_band_table"
              className="input w-full font-mono text-xs"
              rows={3}
              value={values.tmua_band_table ?? ""}
              onChange={(e) => set("tmua_band_table", e.target.value)}
            />
          </div>

          {/* SAT Math config */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label mb-0" htmlFor="sat_math_config">
                SAT Math Config{" "}
                <span className="font-normal text-ink-400">(JSON object)</span>
              </label>
              <button
                type="button"
                onClick={() => set("sat_math_config", defaults.sat_math_config)}
                className="text-xs text-ink-400 underline hover:text-ink-700"
              >
                Reset to default
              </button>
            </div>
            <textarea
              id="sat_math_config"
              className="input w-full font-mono text-xs"
              rows={8}
              value={values.sat_math_config ?? ""}
              onChange={(e) => set("sat_math_config", e.target.value)}
            />
          </div>

          {/* SAT RW config */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label mb-0" htmlFor="sat_rw_config">
                SAT R&amp;W Config{" "}
                <span className="font-normal text-ink-400">(JSON object)</span>
              </label>
              <button
                type="button"
                onClick={() => set("sat_rw_config", defaults.sat_rw_config)}
                className="text-xs text-ink-400 underline hover:text-ink-700"
              >
                Reset to default
              </button>
            </div>
            <textarea
              id="sat_rw_config"
              className="input w-full font-mono text-xs"
              rows={8}
              value={values.sat_rw_config ?? ""}
              onChange={(e) => set("sat_rw_config", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Onboarding */}
      <div className="card">
        <h2 className="section-title mb-4">Onboarding</h2>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-ink-300"
            checked={values.onboarding_complete === "true"}
            onChange={(e) => set("onboarding_complete", e.target.checked ? "true" : "false")}
          />
          <span className="text-sm text-ink-700">
            Onboarding complete (hides the diagnostic prompt on the dashboard)
          </span>
        </label>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save settings"}
        </button>
        {status && (
          <span
            className={`text-sm font-medium ${status.ok ? "text-emerald-600" : "text-rose-600"}`}
          >
            {status.ok ? "✓" : "✕"} {status.msg}
          </span>
        )}
      </div>
    </div>
  );
}

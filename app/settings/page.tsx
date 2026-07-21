import { getSettings } from "@/lib/queries";
import { DEFAULT_TMUA_BAND_TABLE, DEFAULT_SAT_MATH, DEFAULT_SAT_RW } from "@/lib/scoring";
import { Card, SectionHeader } from "@/components/ui";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const settings = getSettings();
  const desmosKey = process.env.NEXT_PUBLIC_DESMOS_API_KEY;

  const defaults = {
    tmua_band_table: JSON.stringify(DEFAULT_TMUA_BAND_TABLE),
    sat_math_config: JSON.stringify(DEFAULT_SAT_MATH, null, 2),
    sat_rw_config: JSON.stringify(DEFAULT_SAT_RW, null, 2),
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Settings"
        subtitle="Configure exam dates, targets, pace, and scoring tables."
      />

      {/* Desmos key status */}
      <Card>
        <h2 className="section-title mb-3">Desmos API Key</h2>
        {desmosKey ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <span className="text-lg">✓</span>
            <span>
              Desmos API key <strong>configured</strong>
            </span>
          </div>
        ) : (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            Using shared demo key — set{" "}
            <code className="rounded bg-sky-100 px-1 py-0.5">NEXT_PUBLIC_DESMOS_API_KEY</code> in{" "}
            <code className="rounded bg-sky-100 px-1 py-0.5">.env.local</code> for full access to
            the Desmos Graphing Calculator API.
          </div>
        )}
      </Card>

      <SettingsForm initial={settings} defaults={defaults} />
    </div>
  );
}

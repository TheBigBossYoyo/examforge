import { NextResponse } from "next/server";
import { setSetting } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_KEYS = ["tmua_band_table", "sat_math_config", "sat_rw_config"] as const;

function validateJsonKey(key: string, value: string): string | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (key === "tmua_band_table") {
      if (
        !Array.isArray(parsed) ||
        parsed.length !== 21 ||
        !(parsed as unknown[]).every((v) => typeof v === "number")
      ) {
        return "tmua_band_table must be a JSON array of exactly 21 numbers";
      }
    } else if (key === "sat_math_config" || key === "sat_rw_config") {
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return `${key} must be a JSON object`;
      }
    }
    return null;
  } catch {
    return `${key} must be valid JSON`;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { settings: Record<string, string> };
    const { settings } = body;

    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return NextResponse.json({ error: "Body must be { settings: { key: value, ... } }" }, { status: 400 });
    }

    for (const key of JSON_KEYS) {
      if (key in settings) {
        const err = validateJsonKey(key, settings[key]);
        if (err) {
          return NextResponse.json({ error: err }, { status: 400 });
        }
      }
    }

    let saved = 0;
    for (const [key, value] of Object.entries(settings)) {
      setSetting(key, String(value));
      saved++;
    }

    return NextResponse.json({ ok: true, saved });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Settings update failed" },
      { status: 400 },
    );
  }
}

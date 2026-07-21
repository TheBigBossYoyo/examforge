/**
 * Database-backed overrides for the scoring tables.
 *
 * lib/scoring.ts holds the pure conversions and the shipped defaults. This
 * module is the only place that reads the user's edited tables out of the
 * `settings` table, keeping the maths unit-testable and the I/O in one spot.
 *
 * Previously `loadSatConfig` existed twice — once in lib/attempts.ts and again
 * in lib/analytics.ts — so a table edited in Settings could be honoured by one
 * and not the other.
 */
import { queryOne } from "./db";
import {
  DEFAULT_SAT_MATH,
  DEFAULT_SAT_RW,
  DEFAULT_TMUA_BAND_TABLE,
  type SatSectionConfig,
} from "./scoring";

function readSetting(key: string): string | null {
  return queryOne<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key])?.value ?? null;
}

/** The user's TMUA band table, or the shipped default if unset/corrupt. */
export function loadTmuaBandTable(): number[] {
  const raw = readSetting("tmua_band_table");
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      // A band table must cover every raw score 0..20 inclusive.
      if (Array.isArray(parsed) && parsed.length === 21 && parsed.every((n) => Number.isFinite(Number(n)))) {
        return parsed.map(Number);
      }
    } catch {
      /* fall through to the default */
    }
  }
  return DEFAULT_TMUA_BAND_TABLE;
}

function loadSatSection(key: string, fallback: SatSectionConfig): SatSectionConfig {
  const raw = readSetting(key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as SatSectionConfig;
      if (
        parsed &&
        Number.isFinite(parsed.totalQuestions) &&
        Number.isFinite(parsed.module1Questions) &&
        Array.isArray(parsed.curve) &&
        parsed.curve.length >= 2
      ) {
        return parsed;
      }
    } catch {
      /* fall through to the default */
    }
  }
  return fallback;
}

/** The user's SAT section configs, or the shipped defaults if unset/corrupt. */
export function loadSatConfig(): { math: SatSectionConfig; rw: SatSectionConfig } {
  return {
    math: loadSatSection("sat_math_config", DEFAULT_SAT_MATH),
    rw: loadSatSection("sat_rw_config", DEFAULT_SAT_RW),
  };
}

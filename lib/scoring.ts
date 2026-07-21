/**
 * Scoring models (section G1). Every value is labelled an ESTIMATE — real
 * conversions are norm-referenced per sitting and vary. Tables are editable
 * (persisted in `settings`, overriding these defaults).
 */

import { queryOne } from "./db";

/* ------------------------------------------------------------------ *
 * TMUA: raw /20 per paper -> 1.0–9.0 band.
 * Anchored on median = 4.5 and 90th percentile = 7.0, with 9.0 deep in the
 * top tail (~top 1%). Index = raw score (0..20).
 * ------------------------------------------------------------------ */
export const DEFAULT_TMUA_BAND_TABLE: number[] = [
  1.0, // 0
  1.4, // 1
  1.8, // 2
  2.2, // 3
  2.6, // 4
  3.0, // 5
  3.4, // 6
  3.8, // 7
  4.1, // 8
  4.3, // 9
  4.5, // 10  <- median anchor
  4.8, // 11
  5.2, // 12
  5.6, // 13
  6.1, // 14
  6.6, // 15
  7.0, // 16  <- 90th percentile anchor
  7.6, // 17
  8.2, // 18
  8.7, // 19
  9.0, // 20  <- top tail
];

function loadTmuaTable(): number[] {
  const row = queryOne<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'tmua_band_table'",
  );
  if (row?.value) {
    try {
      const t = JSON.parse(row.value);
      if (Array.isArray(t) && t.length === 21) return t.map(Number);
    } catch {
      /* fall through to default */
    }
  }
  return DEFAULT_TMUA_BAND_TABLE;
}

/** Convert a single TMUA paper raw score (0..20) to a 1.0–9.0 band estimate. */
export function tmuaPaperBand(raw: number): number {
  const table = loadTmuaTable();
  const clamped = Math.max(0, Math.min(20, Math.round(raw)));
  return table[clamped];
}

/** Combine two paper bands into an overall TMUA estimate (rounded to 0.1). */
export function tmuaOverall(band1: number, band2: number): number {
  return Math.round(((band1 + band2) / 2) * 10) / 10;
}

/* ------------------------------------------------------------------ *
 * Digital SAT: simplified adaptive model per section.
 * Score Module 1; if raw fraction >= routeThreshold, Module 2 is "hard" and
 * the section can scale up to 800; otherwise the scaled score is capped.
 * Editable raw(total correct)->scaled table per section.
 * ------------------------------------------------------------------ */
export interface SatSectionConfig {
  totalQuestions: number; // e.g. 54 (RW) or 44 (Math)
  module1Questions: number; // e.g. 27 or 22
  routeThreshold: number; // fraction of module 1 correct to reach hard route
  cappedMax: number; // max scaled score if NOT routed to hard
  /** anchor points mapping fraction-correct -> scaled, interpolated. */
  curve: { frac: number; scaled: number }[];
}

export const DEFAULT_SAT_RW: SatSectionConfig = {
  totalQuestions: 54,
  module1Questions: 27,
  routeThreshold: 0.7,
  cappedMax: 650,
  curve: [
    { frac: 0, scaled: 200 },
    { frac: 0.25, scaled: 350 },
    { frac: 0.5, scaled: 500 },
    { frac: 0.7, scaled: 600 },
    { frac: 0.85, scaled: 700 },
    { frac: 0.95, scaled: 760 },
    { frac: 1, scaled: 800 },
  ],
};

export const DEFAULT_SAT_MATH: SatSectionConfig = {
  totalQuestions: 44,
  module1Questions: 22,
  routeThreshold: 0.7,
  cappedMax: 650,
  curve: [
    { frac: 0, scaled: 200 },
    { frac: 0.25, scaled: 360 },
    { frac: 0.5, scaled: 510 },
    { frac: 0.7, scaled: 610 },
    { frac: 0.85, scaled: 710 },
    { frac: 0.95, scaled: 770 },
    { frac: 1, scaled: 800 },
  ],
};

function interpolateCurve(curve: { frac: number; scaled: number }[], frac: number): number {
  if (frac <= curve[0].frac) return curve[0].scaled;
  if (frac >= curve[curve.length - 1].frac) return curve[curve.length - 1].scaled;
  for (let i = 1; i < curve.length; i++) {
    if (frac <= curve[i].frac) {
      const lo = curve[i - 1];
      const hi = curve[i];
      const t = (frac - lo.frac) / (hi.frac - lo.frac);
      return lo.scaled + t * (hi.scaled - lo.scaled);
    }
  }
  return curve[curve.length - 1].scaled;
}

export interface SatSectionResult {
  rawTotal: number;
  module1Raw: number;
  routedHard: boolean;
  scaled: number;
  capped: boolean;
}

/**
 * Estimate a SAT section scaled score.
 * @param module1Raw correct answers in module 1
 * @param module2Raw correct answers in module 2
 */
export function satSectionScore(
  cfg: SatSectionConfig,
  module1Raw: number,
  module2Raw: number,
): SatSectionResult {
  const rawTotal = module1Raw + module2Raw;
  const frac = rawTotal / cfg.totalQuestions;
  const m1Frac = module1Raw / cfg.module1Questions;
  const routedHard = m1Frac >= cfg.routeThreshold;

  let scaled = Math.round(interpolateCurve(cfg.curve, frac) / 10) * 10;
  let capped = false;
  if (!routedHard && scaled > cfg.cappedMax) {
    scaled = cfg.cappedMax;
    capped = true;
  }
  return { rawTotal, module1Raw, routedHard, scaled, capped };
}

export interface SatTotalResult {
  rw: SatSectionResult;
  math: SatSectionResult;
  total: number;
  /** which section has the larger gap to 800 (prioritisation hint). */
  prioritise: "Math" | "Reading & Writing" | "Balanced";
}

export function satTotal(rw: SatSectionResult, math: SatSectionResult): SatTotalResult {
  const total = rw.scaled + math.scaled;
  const rwGap = 800 - rw.scaled;
  const mathGap = 800 - math.scaled;
  let prioritise: SatTotalResult["prioritise"] = "Balanced";
  if (Math.abs(rwGap - mathGap) >= 30) {
    prioritise = mathGap > rwGap ? "Math" : "Reading & Writing";
  }
  return { rw, math, total, prioritise };
}

/**
 * Estimate a SAT section score from a single flat accuracy (used when we only
 * have an overall accuracy, e.g. drills). Splits evenly across modules.
 */
export function satSectionFromAccuracy(
  cfg: SatSectionConfig,
  accuracy: number, // 0..1
): SatSectionResult {
  const m1 = Math.round(accuracy * cfg.module1Questions);
  const m2 = Math.round(accuracy * (cfg.totalQuestions - cfg.module1Questions));
  return satSectionScore(cfg, m1, m2);
}

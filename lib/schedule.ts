// Server-only data access for the fixed weekly schedule (section M).
import { query, execute } from "./db";
import type { ScheduleBlock, ScheduleCategory } from "./types";
import { SCHEDULE_DEFAULT_SESSION } from "./sessions";

export interface ScheduleBlockSeed {
  day_of_week: number; // 0=Mon..6=Sun
  start_time: string;
  end_time: string;
  category: ScheduleCategory;
  session_code: string | null;
  locked: boolean;
}

/**
 * The fixed weekly template seeded verbatim (section M). Study happens ONLY in
 * the SAT (Mon-Thu 07:00-09:00) and TMUA (Mon-Thu 14:00-17:00) blocks; every
 * other block is locked. The 11:00-14:00 meal window is locked every day.
 */
export const WEEKLY_TEMPLATE: ScheduleBlockSeed[] = buildTemplate();

function buildTemplate(): ScheduleBlockSeed[] {
  const blocks: ScheduleBlockSeed[] = [];

  // Mon-Thu (0-3): SAT learn block, Workout, TMUA block.
  for (let d = 0; d <= 3; d += 1) {
    blocks.push({
      day_of_week: d,
      start_time: "07:00",
      end_time: "09:00",
      category: "SAT",
      session_code: SCHEDULE_DEFAULT_SESSION[`${d}:SAT`] ?? null,
      locked: false,
    });
    blocks.push({ day_of_week: d, start_time: "09:00", end_time: "11:00", category: "Workout", session_code: null, locked: true });
    blocks.push({
      day_of_week: d,
      start_time: "14:00",
      end_time: "17:00",
      category: "TMUA",
      session_code: SCHEDULE_DEFAULT_SESSION[`${d}:TMUA`] ?? null,
      locked: false,
    });
  }

  // Friday (4): Chess (Coach), Chess, Personal Statement — all locked.
  blocks.push({ day_of_week: 4, start_time: "07:00", end_time: "09:00", category: "Chess (Coach)", session_code: null, locked: true });
  blocks.push({ day_of_week: 4, start_time: "09:00", end_time: "11:00", category: "Chess", session_code: null, locked: true });
  blocks.push({ day_of_week: 4, start_time: "14:00", end_time: "16:00", category: "Personal Statement", session_code: null, locked: true });

  // Saturday (5): Workout — locked.
  blocks.push({ day_of_week: 5, start_time: "07:00", end_time: "09:00", category: "Workout", session_code: null, locked: true });

  // Sunday (6): Chess, Chess (Coach) — locked.
  blocks.push({ day_of_week: 6, start_time: "07:00", end_time: "08:00", category: "Chess", session_code: null, locked: true });
  blocks.push({ day_of_week: 6, start_time: "08:00", end_time: "09:00", category: "Chess (Coach)", session_code: null, locked: true });

  // Protected meals/personal time 11:00-14:00 every day — locked, no study.
  for (let d = 0; d <= 6; d += 1) {
    blocks.push({ day_of_week: d, start_time: "11:00", end_time: "14:00", category: "free", session_code: null, locked: true });
  }

  return blocks;
}

/**
 * Replace all schedule blocks with the fixed weekly template. Does NOT open its
 * own transaction — callers (e.g. the seed script) wrap this in one.
 */
export function seedScheduleBlocks(): number {
  execute("DELETE FROM schedule_blocks");
  for (const b of WEEKLY_TEMPLATE) {
    execute(
      `INSERT INTO schedule_blocks (day_of_week, start_time, end_time, category, session_code, locked)
       VALUES (?,?,?,?,?,?)`,
      [b.day_of_week, b.start_time, b.end_time, b.category, b.session_code, b.locked ? 1 : 0],
    );
  }
  return WEEKLY_TEMPLATE.length;
}

/** All schedule blocks ordered for display (Mon→Sun, earliest first). */
export function getScheduleBlocks(): ScheduleBlock[] {
  return query<ScheduleBlock>(
    "SELECT * FROM schedule_blocks ORDER BY day_of_week, start_time",
  );
}

/** Blocks on a given weekday (0=Mon..6=Sun). */
export function getBlocksForDay(dayOfWeek: number): ScheduleBlock[] {
  return query<ScheduleBlock>(
    "SELECT * FROM schedule_blocks WHERE day_of_week = ? ORDER BY start_time",
    [dayOfWeek],
  );
}

/** Study blocks (locked=0) for a category, across the week. */
export function getStudyBlocks(category: "SAT" | "TMUA"): ScheduleBlock[] {
  return query<ScheduleBlock>(
    "SELECT * FROM schedule_blocks WHERE category = ? AND locked = 0 ORDER BY day_of_week, start_time",
    [category],
  );
}

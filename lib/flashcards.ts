/**
 * Vocab / formula flashcards and their SRS scheduling.
 *
 * Reuses the existing SM-2 implementation in lib/srs.ts rather than inventing
 * a second scheduler — an `srs_cards` row now points at either a question or a
 * flashcard.
 */
import { execute, query, queryOne, transaction } from "./db";
import { todayIso } from "./format";
import { ALL_FLASHCARDS, type SeedFlashcard } from "./seed/flashcards";

export interface Flashcard {
  id: number;
  exam_id: number;
  topic_id: number | null;
  kind: "vocab" | "formula";
  front_md: string;
  back_md: string;
  hint_md: string | null;
  source: string | null;
}

export interface DueFlashcard extends Flashcard {
  card_id: number;
  due_date: string;
  reps: number;
  ease: number;
  interval_days: number;
  exam_name: string;
}

/**
 * Insert the shipped deck and give every new card an SRS entry due today.
 * Idempotent: the unique index on (exam_id, kind, front_md) means re-running
 * adds only genuinely new cards and never duplicates or resets progress.
 */
export function seedFlashcards(): { inserted: number; scheduled: number } {
  return transaction(() => {
    let inserted = 0;
    let scheduled = 0;

    for (const card of ALL_FLASHCARDS as SeedFlashcard[]) {
      const exam = queryOne<{ id: number }>("SELECT id FROM exams WHERE name = ?", [card.exam]);
      if (!exam) continue;

      const res = execute(
        `INSERT INTO flashcards (exam_id, kind, front_md, back_md, hint_md, source)
         VALUES (?,?,?,?,?,'shipped')
         ON CONFLICT(exam_id, kind, front_md) DO NOTHING`,
        [exam.id, card.kind, card.front, card.back, card.hint ?? null],
      );
      if (res.changes > 0) inserted++;

      const row = queryOne<{ id: number }>(
        "SELECT id FROM flashcards WHERE exam_id = ? AND kind = ? AND front_md = ?",
        [exam.id, card.kind, card.front],
      );
      if (!row) continue;

      const existing = queryOne<{ id: number }>(
        "SELECT id FROM srs_cards WHERE flashcard_id = ?",
        [row.id],
      );
      if (!existing) {
        execute(
          `INSERT INTO srs_cards (exam_id, flashcard_id, ease, interval_days, due_date, reps)
           VALUES (?,?,2.5,0,?,0)`,
          [exam.id, row.id, todayIso()],
        );
        scheduled++;
      }
    }

    return { inserted, scheduled };
  });
}

/** Flashcards due for review today. */
export function getDueFlashcards(examId?: number, limit = 20): DueFlashcard[] {
  const where = ["s.flashcard_id IS NOT NULL", "s.due_date <= ?"];
  const params: unknown[] = [todayIso()];
  if (examId) {
    where.push("s.exam_id = ?");
    params.push(examId);
  }
  params.push(Math.max(1, limit));

  return query<DueFlashcard>(
    `SELECT f.*, s.id AS card_id, s.due_date, s.reps, s.ease, s.interval_days, e.name AS exam_name
       FROM srs_cards s
       JOIN flashcards f ON f.id = s.flashcard_id
       JOIN exams e ON e.id = s.exam_id
      WHERE ${where.join(" AND ")}
      ORDER BY s.due_date, s.id
      LIMIT ?`,
    params,
  );
}

export interface DeckStats {
  exam_name: string;
  kind: string;
  total: number;
  due: number;
  learned: number;
}

/** A card counts as learned once SM-2 has pushed it past a week. */
export function getDeckStats(): DeckStats[] {
  return query<DeckStats>(
    `SELECT e.name AS exam_name, f.kind,
            COUNT(*) AS total,
            SUM(CASE WHEN s.due_date <= ? THEN 1 ELSE 0 END) AS due,
            SUM(CASE WHEN s.interval_days >= 7 THEN 1 ELSE 0 END) AS learned
       FROM flashcards f
       JOIN exams e ON e.id = f.exam_id
       LEFT JOIN srs_cards s ON s.flashcard_id = f.id
      GROUP BY e.name, f.kind
      ORDER BY e.name DESC, f.kind`,
    [todayIso()],
  );
}

export function countDueFlashcards(examId?: number): number {
  const where = ["flashcard_id IS NOT NULL", "due_date <= ?"];
  const params: unknown[] = [todayIso()];
  if (examId) {
    where.push("exam_id = ?");
    params.push(examId);
  }
  return (
    queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n FROM srs_cards WHERE ${where.join(" AND ")}`,
      params,
    )?.n ?? 0
  );
}

import { execute, query, queryOne, transaction } from "@/lib/db";
import { addDaysIso, todayIso } from "@/lib/format";
import { getTopics, getProgressMap } from "@/lib/queries";
import type { SrsCard } from "@/lib/types";

export interface DueCard extends SrsCard {
  area?: string;
  subtopic?: string;
  prompt_md?: string;
  correct_answer?: string;
  solution_md?: string;
}

type Sm2Input = Pick<SrsCard, "ease" | "interval_days" | "reps">;
type Grade = 0 | 1 | 2 | 3;

const SM2_QUALITY: Record<Grade, 2 | 3 | 4 | 5> = {
  0: 2,
  1: 3,
  2: 4,
  3: 5,
};

export function sm2(card: Sm2Input, grade: Grade): { ease: number; interval_days: number; reps: number; due_date: string } {
  const quality = SM2_QUALITY[grade];
  const ease = Math.max(
    1.3,
    Number((card.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))).toFixed(2)),
  );

  let intervalDays = 1;
  let reps = card.reps;

  if (quality < 3) {
    reps = 0;
    intervalDays = 1;
  } else if (card.reps <= 0) {
    reps = 1;
    intervalDays = 1;
  } else if (card.reps === 1) {
    reps = 2;
    intervalDays = 6;
  } else {
    reps = card.reps + 1;
    intervalDays = Math.max(1, Math.round(card.interval_days * ease));
  }

  return {
    ease,
    interval_days: intervalDays,
    reps,
    due_date: addDaysIso(todayIso(), intervalDays),
  };
}

export function getDueCards(examId?: number, limit = 50): DueCard[] {
  const where = ["s.due_date <= ?"];
  const params: unknown[] = [todayIso()];
  if (examId) {
    where.push("s.exam_id = ?");
    params.push(examId);
  }
  params.push(Math.max(1, Math.floor(limit)));
  return query<DueCard>(
    `SELECT s.*, t.area, t.subtopic, q.prompt_md, q.correct_answer, q.solution_md
     FROM srs_cards s
     LEFT JOIN topics t ON t.id = s.topic_id
     LEFT JOIN questions q ON q.id = s.question_id
     WHERE ${where.join(" AND ")}
     ORDER BY s.due_date, s.id
     LIMIT ?`,
    params,
  );
}

export function countDue(examId?: number): number {
  const where = ["due_date <= ?"];
  const params: unknown[] = [todayIso()];
  if (examId) {
    where.push("exam_id = ?");
    params.push(examId);
  }
  const row = queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM srs_cards WHERE ${where.join(" AND ")}`, params);
  return row?.n ?? 0;
}

export function gradeCard(cardId: number, grade: Grade): SrsCard {
  return transaction(() => {
    const card = queryOne<SrsCard>("SELECT * FROM srs_cards WHERE id = ?", [cardId]);
    if (!card) {
      throw new Error("Card not found");
    }
    const next = sm2(card, grade);
    execute(
      "UPDATE srs_cards SET ease = ?, interval_days = ?, reps = ?, due_date = ? WHERE id = ?",
      [next.ease, next.interval_days, next.reps, next.due_date, cardId],
    );
    const updated = queryOne<SrsCard>("SELECT * FROM srs_cards WHERE id = ?", [cardId]);
    if (!updated) {
      throw new Error("Failed to reload graded card");
    }
    return updated;
  });
}

interface WeakTopicCandidate {
  topic_id: number;
  mastery: number;
  attempts_count: number;
  last_practiced: string | null;
}

export function seedSrsFromWeakTopics(examId: number): number {
  const topics = getTopics(examId);
  if (topics.length === 0) return 0;

  const progressMap = getProgressMap(examId);
  const attempted = topics
    .map<WeakTopicCandidate>((topic) => {
      const progress = progressMap.get(topic.id);
      return {
        topic_id: topic.id,
        mastery: progress?.mastery ?? 0,
        attempts_count: progress?.attempts_count ?? 0,
        last_practiced: progress?.last_practiced ?? null,
      };
    })
    .filter((topic) => topic.attempts_count > 0)
    .sort((a, b) => {
      if (a.mastery !== b.mastery) return a.mastery - b.mastery;
      if (a.attempts_count !== b.attempts_count) return b.attempts_count - a.attempts_count;
      return (a.last_practiced ?? "").localeCompare(b.last_practiced ?? "");
    });

  const fallback = topics
    .map((topic) => ({ topic_id: topic.id, mastery: progressMap.get(topic.id)?.mastery ?? 0, attempts_count: 0, last_practiced: null }))
    .sort((a, b) => a.mastery - b.mastery);

  const selected = (attempted.length > 0 ? attempted : fallback).slice(0, 8);

  return transaction(() => {
    let created = 0;
    for (const candidate of selected) {
      const hasExisting = queryOne<{ id: number }>(
        "SELECT id FROM srs_cards WHERE exam_id = ? AND topic_id = ? LIMIT 1",
        [examId, candidate.topic_id],
      );
      if (hasExisting) continue;

      const unresolved = queryOne<{ question_id: number }>(
        `SELECT m.question_id
         FROM mistakes m
         JOIN questions q ON q.id = m.question_id
         WHERE q.exam_id = ? AND m.resolved = 0 AND q.topic_id = ?
           AND NOT EXISTS (
             SELECT 1 FROM srs_cards s WHERE s.question_id = m.question_id AND s.exam_id = ?
           )
         ORDER BY m.created_at DESC
         LIMIT 1`,
        [examId, candidate.topic_id, examId],
      );

      const topicQuestion = queryOne<{ id: number }>(
        `SELECT q.id
         FROM questions q
         WHERE q.exam_id = ? AND q.topic_id = ?
           AND NOT EXISTS (
             SELECT 1 FROM srs_cards s WHERE s.question_id = q.id AND s.exam_id = ?
           )
         ORDER BY q.id
         LIMIT 1`,
        [examId, candidate.topic_id, examId],
      );

      execute(
        `INSERT INTO srs_cards (exam_id, topic_id, question_id, ease, interval_days, due_date, reps)
         VALUES (?, ?, ?, 2.5, 0, ?, 0)`,
        [examId, candidate.topic_id, unresolved?.question_id ?? topicQuestion?.id ?? null, todayIso()],
      );
      created += 1;
    }
    return created;
  });
}

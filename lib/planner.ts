import { execute, query, transaction } from "@/lib/db";
import { addDaysIso, dayOfWeekMon0, isoWeekIndex, todayIso } from "@/lib/format";
import {
  effectiveExamDate,
  getExam,
  getExamById,
  getProgressMap,
  getSetting,
  getStudyPlan,
  getTopics,
} from "@/lib/queries";
import { getStudyBlocks } from "@/lib/schedule";
import {
  getSessionDef,
  resolveSessionCode,
  taperSessionCode,
  SCHEDULE_DEFAULT_SESSION,
  type SessionSlot,
} from "@/lib/sessions";
import type { ExamName, ScheduleBlock, StudyPlanItem, StudyTaskType, Topic } from "@/lib/types";

export interface AgendaItem extends StudyPlanItem {
  exam_name: ExamName;
  area: string | null;
  subtopic: string | null;
}

/** Setting key: has the user confirmed reallocating freed SAT blocks to TMUA? */
export const REALLOCATE_KEY = "phase2_reallocate_confirmed";

const TAPER_DAYS = 10;

export type Phase = "phase1" | "phase2" | "taper";

export interface PhaseInfo {
  phase: Phase;
  satPassed: boolean;
  reallocateConfirmed: boolean;
  /** SAT date has passed but the user hasn't yet confirmed reallocation. */
  reallocateAvailable: boolean;
  satDaysLeft: number | null;
  tmuaDaysLeft: number | null;
  satTaper: boolean;
  tmuaTaper: boolean;
}

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

function daysUntil(fromIso: string, targetIso: string): number {
  return Math.ceil(
    (new Date(`${targetIso}T00:00:00`).getTime() - new Date(`${fromIso}T00:00:00`).getTime()) / 86_400_000,
  );
}

/** Scale a session's slots so their minutes sum exactly to `target`. */
function scaleSlots(slots: SessionSlot[], target: number): SessionSlot[] {
  const sum = slots.reduce((s, x) => s + x.minutes, 0);
  if (sum === target) return slots.map((s) => ({ ...s }));
  const scaled = slots.map((s) => ({
    ...s,
    minutes: Math.max(5, Math.round((s.minutes / sum) * target / 5) * 5),
  }));
  const others = scaled.slice(0, -1).reduce((s, x) => s + x.minutes, 0);
  scaled[scaled.length - 1].minutes = Math.max(5, target - others);
  return scaled;
}

/** Taper slots (mock-heavy, light review, no new content) summing to `target`. */
function taperSlots(target: number): SessionSlot[] {
  const mockMin = Math.max(5, Math.round((target * 2) / 3 / 5) * 5);
  return [
    { type: "mock", minutes: mockMin, focus: "mock", label: "Timed full mock under exam conditions (estimate)." },
    { type: "review", minutes: Math.max(5, target - mockMin), focus: "mistakes", label: "Light targeted review of flagged mistakes — no new content." },
  ];
}

/**
 * Weakness-first topic picker. Returns topics ordered by lowest mastery (then
 * fewest attempts), cycling within an area so a single block hits several
 * distinct weak topics. `area` undefined falls back to the whole exam.
 */
function makeTopicPicker(examId: number): (area?: string) => Topic | undefined {
  const topics = getTopics(examId);
  const pm = getProgressMap(examId);
  const rank = (arr: Topic[]) =>
    [...arr].sort((a, b) => {
      const ma = pm.get(a.id)?.mastery ?? 0;
      const mb = pm.get(b.id)?.mastery ?? 0;
      if (ma !== mb) return ma - mb;
      const aa = pm.get(a.id)?.attempts_count ?? 0;
      const ab = pm.get(b.id)?.attempts_count ?? 0;
      if (aa !== ab) return aa - ab;
      return a.id - b.id;
    });
  const lists = new Map<string, Topic[]>();
  lists.set("*", rank(topics));
  for (const t of topics) {
    if (!lists.has(t.area)) lists.set(t.area, rank(topics.filter((x) => x.area === t.area)));
  }
  const cursors = new Map<string, number>();
  return (area?: string) => {
    const key = area && lists.has(area) ? area : "*";
    const list = lists.get(key) ?? [];
    if (list.length === 0) return undefined;
    const i = cursors.get(key) ?? 0;
    cursors.set(key, i + 1);
    return list[i % list.length];
  };
}

function topicHref(examName: ExamName, topicId: number): string {
  return `/practice?exam=${examName}&topic=${topicId}`;
}

function slotHref(examName: ExamName, slot: SessionSlot, topic?: Topic): string {
  if (slot.focus === "mock") return `/practice?exam=${examName}&mode=exam`;
  if (slot.focus === "srs") return "/planner";
  if (slot.focus === "mistakes") return "/mistakes";
  if (slot.focus === "desmos") return "/sat/desmos";
  if (topic) return topicHref(examName, topic.id);
  return `/practice?exam=${examName}`;
}

function buildTaskMd(params: {
  sessionTitle: string;
  examName: ExamName;
  slot: SessionSlot;
  topic?: Topic;
  examDate: string;
}): string {
  const { sessionTitle, examName, slot, topic } = params;
  const focusLabel = topic ? ` Focus: **${topic.subtopic}** (${topic.area}).` : "";
  const estimate = slot.type === "mock" ? " Scores are an **estimate**." : "";
  return `**${sessionTitle} · ${slot.minutes}m** — ${slot.label}${focusLabel}${estimate} Open: ${slotHref(examName, slot, topic)}`;
}

/**
 * Regenerate the future study plan for one exam by READING the fixed weekly
 * schedule (section M): the schedule decides WHEN + the subject; this fills WHAT
 * into each SAT/TMUA block from the session catalogue + weakness heatmap, with
 * each block's tasks summing to the block length. Phase 2 (SAT date passed +
 * user-confirmed) additionally fills the freed Mon–Thu SAT blocks with TMUA work.
 * Taper (final ~10 days) switches to mocks + light review; the day before each
 * exam is left as rest.
 */
export function generatePlan(examId: number, opts: { daysAhead?: number } = {}): {
  created: number;
  cleared: number;
} {
  const exam = getExamById(examId);
  if (!exam) throw new Error("Exam not found");

  const category: "SAT" | "TMUA" = exam.name;
  const examDate = effectiveExamDate(exam);
  const daysAhead = Math.max(7, Math.floor(opts.daysAhead ?? 28));
  const today = todayIso();
  const horizon = addDaysIso(today, daysAhead);
  const until = examDate < horizon ? examDate : horizon;

  // Phase 2: are the freed SAT blocks reallocated to TMUA?
  const satExam = getExam("SAT");
  const satPassed = satExam ? effectiveExamDate(satExam) < today : false;
  const reallocate =
    category === "TMUA" && satPassed && getSetting(REALLOCATE_KEY, "false") === "true";

  // Pre-group study blocks by weekday for fast lookup.
  const nativeBlocks = getStudyBlocks(category);
  const reallocBlocks = reallocate ? getStudyBlocks("SAT") : [];
  const blocksByDow = new Map<number, { block: ScheduleBlock; reallocated: boolean }[]>();
  for (const block of nativeBlocks) {
    const list = blocksByDow.get(block.day_of_week) ?? [];
    list.push({ block, reallocated: false });
    blocksByDow.set(block.day_of_week, list);
  }
  for (const block of reallocBlocks) {
    const list = blocksByDow.get(block.day_of_week) ?? [];
    list.push({ block, reallocated: true });
    blocksByDow.set(block.day_of_week, list);
  }

  const pick = makeTopicPicker(examId);

  return transaction(() => {
    const futureItems = getStudyPlan(examId, today);
    const cleared = futureItems.length;
    execute("DELETE FROM study_plan WHERE exam_id = ? AND date >= ?", [examId, today]);

    let created = 0;

    for (let dayIndex = 0; ; dayIndex += 1) {
      const date = addDaysIso(today, dayIndex);
      if (date > until) break;

      const daysToExam = daysUntil(date, examDate);
      if (daysToExam <= 0) continue; // exam day or past — no study
      if (daysToExam === 1) continue; // rest the day before the exam

      const dow = dayOfWeekMon0(date);
      const dayBlocks = blocksByDow.get(dow);
      if (!dayBlocks || dayBlocks.length === 0) continue; // Fri/Sat/Sun: no study blocks

      const weekIndex = isoWeekIndex(date);
      const isTaper = daysToExam <= TAPER_DAYS;

      for (const { block, reallocated } of dayBlocks) {
        const blockMinutes = minutesBetween(block.start_time, block.end_time);
        if (blockMinutes <= 0) continue;

        let resolvedCode: string;
        let slots: SessionSlot[];
        let sessionTitle: string;

        if (isTaper) {
          resolvedCode = taperSessionCode(category);
          slots = taperSlots(blockMinutes);
          sessionTitle = getSessionDef(resolvedCode)?.title ?? `${category} Taper`;
        } else {
          const seededCode = reallocated
            ? SCHEDULE_DEFAULT_SESSION[`${dow}:TMUA`] ?? "TMUA_TIMED_PAPER"
            : block.session_code ?? SCHEDULE_DEFAULT_SESSION[`${dow}:${category}`] ?? "";
          resolvedCode = resolveSessionCode(seededCode, weekIndex);
          const def = getSessionDef(resolvedCode);
          if (!def) continue;
          slots = scaleSlots(def.slots, blockMinutes);
          sessionTitle = reallocated ? `${def.title} (reallocated SAT block)` : def.title;
        }

        for (const slot of slots) {
          const usesTopic = slot.focus === "weakest" || slot.focus === "rotation";
          const topic = usesTopic ? pick(slot.area) : undefined;
          execute(
            `INSERT INTO study_plan
               (exam_id, date, task_md, topic_id, est_minutes, type, done, session_code, start_time)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
            [
              examId,
              date,
              buildTaskMd({ sessionTitle, examName: exam.name, slot, topic, examDate }),
              topic?.id ?? null,
              slot.minutes,
              slot.type as StudyTaskType,
              resolvedCode,
              block.start_time,
            ],
          );
          created += 1;
        }
      }
    }

    return { created, cleared };
  });
}

export function setTaskDone(id: number, done: boolean): void {
  execute("UPDATE study_plan SET done = ? WHERE id = ?", [done ? 1 : 0, id]);
}

const AGENDA_SELECT = `SELECT sp.*, e.name AS exam_name, t.area, t.subtopic
   FROM study_plan sp
   JOIN exams e ON e.id = sp.exam_id
   LEFT JOIN topics t ON t.id = sp.topic_id`;

export function getAgenda(examId?: number, daysAhead = 21): AgendaItem[] {
  const today = todayIso();
  const until = addDaysIso(today, Math.max(0, Math.floor(daysAhead)));
  const where = ["sp.date >= ?", "sp.date <= ?"];
  const params: unknown[] = [today, until];
  if (examId) {
    where.push("sp.exam_id = ?");
    params.push(examId);
  }
  return query<AgendaItem>(
    `${AGENDA_SELECT} WHERE ${where.join(" AND ")} ORDER BY sp.date, sp.start_time, e.name DESC, sp.id`,
    params,
  );
}

/** Concrete tasks for a single day (defaults to today), ordered by block time. */
export function getDayTasks(dateIso?: string): AgendaItem[] {
  const date = dateIso ?? todayIso();
  return query<AgendaItem>(
    `${AGENDA_SELECT} WHERE sp.date = ? ORDER BY sp.start_time, e.name DESC, sp.id`,
    [date],
  );
}

/** Current phase + taper/reallocation status, keyed off the editable exam dates. */
export function getPhaseInfo(): PhaseInfo {
  const today = todayIso();
  const sat = getExam("SAT");
  const tmua = getExam("TMUA");
  const satDaysLeft = sat ? daysUntil(today, effectiveExamDate(sat)) : null;
  const tmuaDaysLeft = tmua ? daysUntil(today, effectiveExamDate(tmua)) : null;
  const satPassed = satDaysLeft !== null && satDaysLeft <= 0;
  const reallocateConfirmed = getSetting(REALLOCATE_KEY, "false") === "true";
  const satTaper = satDaysLeft !== null && satDaysLeft > 1 && satDaysLeft <= TAPER_DAYS;
  const tmuaTaper = tmuaDaysLeft !== null && tmuaDaysLeft > 1 && tmuaDaysLeft <= TAPER_DAYS;

  let phase: Phase = "phase1";
  if (satTaper || tmuaTaper) phase = "taper";
  else if (satPassed) phase = "phase2";

  return {
    phase,
    satPassed,
    reallocateConfirmed,
    reallocateAvailable: satPassed && !reallocateConfirmed,
    satDaysLeft,
    tmuaDaysLeft,
    satTaper,
    tmuaTaper,
  };
}

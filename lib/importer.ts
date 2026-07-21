/**
 * Question importer (section J). Validates rows, maps (exam, area, subtopic)
 * to a topic_id, sets origin='user_import', and reports rejected rows.
 * Shared by the seed script and the Admin importer UI.
 */
import { execute, queryOne } from "./db";
import type { Difficulty } from "./types";

export interface ImportQuestion {
  exam: string;
  area: string;
  subtopic: string;
  prompt_md: string;
  /** Optional Reading & Writing stimulus shown alongside the question. */
  passage_md?: string | null;
  choices?: string[] | null;
  correct_answer: string;
  solution_md?: string | null;
  faster_method_md?: string | null;
  difficulty?: string | null;
  desmos_recommended?: boolean;
  desmos_state_json?: string | null;
  hint1_md?: string | null;
  hint2_md?: string | null;
  hint3_md?: string | null;
  source_label?: string | null;
}

export interface ImportResult {
  inserted: number;
  rejected: { index: number; reason: string; row?: Partial<ImportQuestion> }[];
}

const VALID_DIFFICULTY: Difficulty[] = ["easy", "med", "hard", "1600level", "real"];

function resolveExamId(name: string): number | undefined {
  const row = queryOne<{ id: number }>("SELECT id FROM exams WHERE name = ?", [name]);
  return row?.id;
}

function resolveTopicId(examId: number, area: string, subtopic: string): number | undefined {
  const row = queryOne<{ id: number }>(
    "SELECT id FROM topics WHERE exam_id = ? AND area = ? AND subtopic = ?",
    [examId, area, subtopic],
  );
  return row?.id;
}

/** Insert one validated question. Returns the new id or throws. */
export function insertQuestion(
  q: ImportQuestion,
  origin: "user_import" | "ai_generated" = "user_import",
): number {
  const examId = resolveExamId(q.exam);
  if (!examId) throw new Error(`Unknown exam '${q.exam}' (expected TMUA or SAT)`);
  if (!q.prompt_md?.trim()) throw new Error("Missing prompt_md");
  if (!q.correct_answer?.trim()) throw new Error("Missing correct_answer");

  const topicId = resolveTopicId(examId, q.area, q.subtopic);
  // topic is optional (SET NULL) but we warn via reject path in importQuestions

  const difficulty =
    q.difficulty && VALID_DIFFICULTY.includes(q.difficulty as Difficulty)
      ? q.difficulty
      : "med";

  const choicesJson =
    q.choices && Array.isArray(q.choices) && q.choices.length > 0
      ? JSON.stringify(q.choices.map(String))
      : null;

  const res = execute(
    `INSERT INTO questions
      (paper_id, exam_id, topic_id, prompt_md, passage_md, choices_json, correct_answer,
       solution_md, difficulty, source_label, origin, hint1_md, hint2_md, hint3_md,
       desmos_recommended, desmos_state_json, faster_method_md)
     VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      examId,
      topicId ?? null,
      q.prompt_md,
      q.passage_md ?? null,
      choicesJson,
      q.correct_answer,
      q.solution_md ?? null,
      difficulty,
      q.source_label ?? "Original (import)",
      origin,
      q.hint1_md ?? null,
      q.hint2_md ?? null,
      q.hint3_md ?? null,
      q.desmos_recommended ? 1 : 0,
      q.desmos_state_json ?? null,
      q.faster_method_md ?? null,
    ],
  );
  return res.lastInsertRowid;
}

/** Validate + insert an array of questions, collecting rejections. */
export function importQuestions(
  rows: ImportQuestion[],
  origin: "user_import" | "ai_generated" = "user_import",
): ImportResult {
  const result: ImportResult = { inserted: 0, rejected: [] };
  rows.forEach((row, index) => {
    try {
      const examId = resolveExamId(row.exam);
      if (!examId) {
        result.rejected.push({ index, reason: `Unknown exam '${row.exam}'`, row });
        return;
      }
      const topicId = resolveTopicId(examId, row.area, row.subtopic);
      if (!topicId) {
        result.rejected.push({
          index,
          reason: `No matching topic for area='${row.area}', subtopic='${row.subtopic}'`,
          row,
        });
        return;
      }
      insertQuestion(row, origin);
      result.inserted += 1;
    } catch (err) {
      result.rejected.push({
        index,
        reason: err instanceof Error ? err.message : String(err),
        row,
      });
    }
  });
  return result;
}

/** Parse the CSV format (section J). choices are pipe-separated. */
export function parseQuestionsCsv(csv: string): ImportQuestion[] {
  const rows = parseCsvRows(csv);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);

  const out: ImportQuestion[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length === 1 && r[0].trim() === "") continue;
    const get = (name: string) => {
      const j = idx(name);
      return j >= 0 ? (r[j] ?? "").trim() : "";
    };
    const choicesRaw = get("choices_pipe");
    out.push({
      exam: get("exam"),
      area: get("area"),
      subtopic: get("subtopic"),
      prompt_md: get("prompt_md"),
      passage_md: get("passage_md") || null,
      choices: choicesRaw ? choicesRaw.split("|").map((c) => c.trim()) : null,
      correct_answer: get("correct_answer"),
      solution_md: get("solution_md") || null,
      faster_method_md: get("faster_method_md") || null,
      difficulty: get("difficulty") || null,
      desmos_recommended: get("desmos_recommended").toLowerCase() === "true",
      desmos_state_json: get("desmos_state_json") || null,
      hint1_md: get("hint1_md") || null,
      hint2_md: get("hint2_md") || null,
      hint3_md: get("hint3_md") || null,
      source_label: get("source_label") || null,
    });
  }
  return out;
}

/** Minimal RFC-4180-ish CSV parser supporting quoted fields and commas. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * ExamForge seed script (section L step 3).
 *   npm run seed
 *
 * Seeds: exams + defaults, the topic taxonomy (D), all resource/paper LINKS (E),
 * default settings, and the original sample questions (J). Idempotent: it clears
 * seeded reference data first so re-running stays clean, but it never deletes
 * user attempts/responses/mistakes.
 */
import fs from "node:fs";
import path from "node:path";
import { getDb, execute, queryOne, transaction } from "../lib/db";
import { TMUA_TOPICS, SAT_TOPICS } from "../lib/seed/taxonomy";
import {
  STATIC_RESOURCES,
  TMUA_YEARS,
  LICENSE_NOTE,
  PREP_HUB,
  type SeedResource,
} from "../lib/seed/resources";
import { importQuestions, parseQuestionsCsv, type ImportQuestion } from "../lib/importer";
import {
  DEFAULT_TMUA_BAND_TABLE,
  DEFAULT_SAT_RW,
  DEFAULT_SAT_MATH,
} from "../lib/scoring";
import { seedScheduleBlocks } from "../lib/schedule";

function setSetting(key: string, value: string) {
  execute(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

function ensureExam(
  name: "TMUA" | "SAT",
  target: number,
  date: string,
  min: number,
  max: number,
): number {
  const existing = queryOne<{ id: number }>("SELECT id FROM exams WHERE name = ?", [name]);
  if (existing) {
    execute(
      "UPDATE exams SET target_score = ?, scale_min = ?, scale_max = ? WHERE id = ?",
      [target, min, max, existing.id],
    );
    return existing.id;
  }
  return execute(
    "INSERT INTO exams (name, target_score, exam_date, scale_min, scale_max) VALUES (?,?,?,?,?)",
    [name, target, date, min, max],
  ).lastInsertRowid;
}

function getOrCreateSource(
  name: string,
  type: "official" | "adjacent",
  examId: number,
  cost: "free" | "paid",
  hasSolutions: boolean,
): number {
  const existing = queryOne<{ id: number }>(
    "SELECT id FROM sources WHERE name = ? AND exam_id = ?",
    [name, examId],
  );
  if (existing) return existing.id;
  return execute(
    "INSERT INTO sources (name, type, exam_id, cost, url, has_solutions, license_note) VALUES (?,?,?,?,?,?,?)",
    [name, type, examId, cost, null, hasSolutions ? 1 : 0, LICENSE_NOTE],
  ).lastInsertRowid;
}

function main() {
  getDb(); // applies schema
  console.log("→ Seeding ExamForge database...");

  transaction(() => {
    // ---- Exams (dates editable in Settings) ----
    const tmuaId = ensureExam("TMUA", 9.0, "2026-10-13", 1.0, 9.0);
    const satId = ensureExam("SAT", 1600, "2026-08-22", 400, 1600);

    // ---- Reset reference tables (NOT user data) ----
    execute("DELETE FROM resources");
    execute("DELETE FROM papers");
    execute("DELETE FROM topics");
    execute("DELETE FROM sources");

    // ---- Topics (taxonomy D) ----
    const topicInsert =
      "INSERT INTO topics (exam_id, area, subtopic, parent_id) VALUES (?,?,?,NULL)";
    for (const t of TMUA_TOPICS) execute(topicInsert, [tmuaId, t.area, t.subtopic]);
    for (const t of SAT_TOPICS) execute(topicInsert, [satId, t.area, t.subtopic]);
    console.log(`  ✓ Topics: ${TMUA_TOPICS.length} TMUA + ${SAT_TOPICS.length} SAT`);

    // ---- Resources (E) ----
    const examIdByName = { TMUA: tmuaId, SAT: satId } as const;
    function insertResource(r: SeedResource) {
      const examId = examIdByName[r.exam];
      const sourceId = getOrCreateSource(
        r.source_name,
        r.source_type,
        examId,
        r.cost,
        r.has_solutions,
      );
      execute(
        `INSERT INTO resources
          (exam_id, source_id, title, url, topic_tags_json, difficulty, type, cost,
           has_solutions, relevance, license_note)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          examId,
          sourceId,
          r.title,
          r.url,
          r.topic_tags ? JSON.stringify(r.topic_tags) : null,
          r.difficulty ?? null,
          r.type,
          r.cost,
          r.has_solutions ? 1 : 0,
          r.relevance ?? null,
          r.note ? `${LICENSE_NOTE} ${r.note}` : LICENSE_NOTE,
        ],
      );
    }
    for (const r of STATIC_RESOURCES) insertResource(r);

    // ---- TMUA past papers (E): paper rows + resource rows per year ----
    const tmuaSourceId = getOrCreateSource(
      "UAT-UK Official",
      "official",
      tmuaId,
      "free",
      true,
    );
    let paperCount = 0;
    let pastPaperResourceCount = 0;
    for (const y of TMUA_YEARS) {
      // Two paper rows per year (Paper 1 + Paper 2) for paper mode.
      const mk = (which: 1 | 2, pdf: string) =>
        execute(
          `INSERT INTO papers
            (source_id, exam_id, title, year, kind, time_limit_min, num_questions,
             difficulty, pdf_url, relevance_to_target, note)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [
            tmuaSourceId,
            tmuaId,
            `TMUA ${y.label} — Paper ${which}`,
            y.year,
            "paper",
            75,
            20,
            "real",
            pdf,
            5,
            y.note ?? null,
          ],
        );
      mk(1, y.p1);
      mk(2, y.p2);
      paperCount += 2;

      // Resource rows: link out to all five PDFs per year.
      const links: { label: string; url: string; sols: boolean }[] = [
        { label: `TMUA ${y.label} Paper 1`, url: y.p1, sols: false },
        { label: `TMUA ${y.label} Paper 1 — worked answers`, url: y.p1Worked, sols: true },
        { label: `TMUA ${y.label} Paper 2`, url: y.p2, sols: false },
        { label: `TMUA ${y.label} Paper 2 — worked answers`, url: y.p2Worked, sols: true },
        { label: `TMUA ${y.label} — answer keys`, url: y.key, sols: true },
      ];
      for (const link of links) {
        execute(
          `INSERT INTO resources
            (exam_id, source_id, title, url, topic_tags_json, difficulty, type, cost,
             has_solutions, relevance, license_note)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [
            tmuaId,
            tmuaSourceId,
            link.label,
            link.url,
            null,
            "real",
            "past_paper",
            "free",
            link.sols ? 1 : 0,
            5,
            LICENSE_NOTE,
          ],
        );
        pastPaperResourceCount++;
      }
    }
    console.log(
      `  ✓ Papers: ${paperCount} TMUA paper rows; Resources: ${STATIC_RESOURCES.length} static + ${pastPaperResourceCount} past-paper links`,
    );

    // ---- Default settings ----
    setSetting("tmua_exam_date", "2026-10-13");
    setSetting("sat_exam_date", "2026-08-22");
    setSetting("tmua_target", "9.0");
    setSetting("sat_target", "1600");
    setSetting("tmua_pace_seconds", "225"); // 3:45 per question
    setSetting("sat_math_pace_seconds", "95");
    setSetting("sat_rw_pace_seconds", "71");
    setSetting("tmua_band_table", JSON.stringify(DEFAULT_TMUA_BAND_TABLE));
    setSetting("sat_rw_config", JSON.stringify(DEFAULT_SAT_RW));
    setSetting("sat_math_config", JSON.stringify(DEFAULT_SAT_MATH));
    setSetting("onboarding_complete", "false");
    setSetting("prep_hub_url", PREP_HUB);
    console.log("  ✓ Default settings written");

    // ---- Fixed weekly schedule (M) ----
    const blockCount = seedScheduleBlocks();
    console.log(`  ✓ Schedule blocks: ${blockCount} fixed weekly blocks`);
  });

  // ---- Sample questions (J) — only if the bank is empty of imports ----
  const existing = queryOne<{ n: number }>(
    "SELECT COUNT(*) AS n FROM questions WHERE source_label LIKE 'Original (sample)%'",
  );
  if ((existing?.n ?? 0) === 0) {
    const jsonPath = path.join(process.cwd(), "samples", "questions.sample.json");
    const csvPath = path.join(process.cwd(), "samples", "questions.sample.csv");
    let total = 0;

    if (fs.existsSync(jsonPath)) {
      const rows = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as ImportQuestion[];
      const res = importQuestions(rows, "user_import");
      total += res.inserted;
      if (res.rejected.length)
        console.warn("  ! JSON rejected:", JSON.stringify(res.rejected, null, 2));
    }
    if (fs.existsSync(csvPath)) {
      const rows = parseQuestionsCsv(fs.readFileSync(csvPath, "utf8"));
      const res = importQuestions(rows, "user_import");
      total += res.inserted;
      if (res.rejected.length)
        console.warn("  ! CSV rejected:", JSON.stringify(res.rejected, null, 2));
    }
    console.log(`  ✓ Sample questions imported: ${total}`);
  } else {
    console.log("  • Sample questions already present — skipped");
  }

  console.log("✓ Seed complete.");
}

main();

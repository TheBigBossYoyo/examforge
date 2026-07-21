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
import { getDb, execute, query, queryOne, transaction } from "../lib/db";
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
    //
    // `resources` is the ONLY table safe to wipe: nothing references it, so
    // recreating rows cannot orphan anything.
    //
    // topics / papers / sources are deliberately NOT deleted. They are the
    // targets of ON DELETE SET NULL foreign keys (questions.topic_id,
    // questions.paper_id, attempts.paper_id, ...), so deleting and reinserting
    // them silently nulls those columns and permanently detaches the question
    // bank from its taxonomy — which is exactly what the old seeder did on
    // every re-run. They are upserted on their natural keys instead, which
    // preserves row IDs and therefore every existing reference.
    execute("DELETE FROM resources");

    // ---- Topics (taxonomy D) ----
    // Upsert on the natural key so IDs survive a re-seed.
    const topicInsert = `
      INSERT INTO topics (exam_id, area, subtopic, parent_id) VALUES (?,?,?,NULL)
      ON CONFLICT(exam_id, area, subtopic) DO NOTHING`;
    for (const t of TMUA_TOPICS) execute(topicInsert, [tmuaId, t.area, t.subtopic]);
    for (const t of SAT_TOPICS) execute(topicInsert, [satId, t.area, t.subtopic]);

    // Drop taxonomy entries that are no longer in the seed list — but only when
    // nothing points at them, so a renamed topic never takes user data with it.
    const validTopicIds = new Set<number>();
    for (const [examId, list] of [
      [tmuaId, TMUA_TOPICS],
      [satId, SAT_TOPICS],
    ] as const) {
      for (const t of list) {
        const row = queryOne<{ id: number }>(
          "SELECT id FROM topics WHERE exam_id = ? AND area = ? AND subtopic = ?",
          [examId, t.area, t.subtopic],
        );
        if (row) validTopicIds.add(row.id);
      }
    }
    let prunedTopics = 0;
    let keptStaleTopics = 0;
    for (const { id } of query<{ id: number }>("SELECT id FROM topics")) {
      if (validTopicIds.has(id)) continue;
      const refs =
        queryOne<{ n: number }>(
          `SELECT (SELECT COUNT(*) FROM questions  WHERE topic_id = ?)
                + (SELECT COUNT(*) FROM mistakes   WHERE topic_id = ?)
                + (SELECT COUNT(*) FROM study_plan WHERE topic_id = ?)
                + (SELECT COUNT(*) FROM progress   WHERE topic_id = ?)
                + (SELECT COUNT(*) FROM srs_cards  WHERE topic_id = ?) AS n`,
          [id, id, id, id, id],
        )?.n ?? 0;
      if (refs === 0) {
        execute("DELETE FROM topics WHERE id = ?", [id]);
        prunedTopics += 1;
      } else {
        keptStaleTopics += 1;
      }
    }
    console.log(
      `  ✓ Topics: ${TMUA_TOPICS.length} TMUA + ${SAT_TOPICS.length} SAT` +
        (prunedTopics ? `; pruned ${prunedTopics} stale` : "") +
        (keptStaleTopics ? `; kept ${keptStaleTopics} stale but referenced` : ""),
    );

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
      // Upsert on (exam_id, title): keeps the paper's id stable so questions
      // and attempts already linked to it stay linked across re-seeds.
      const mk = (which: 1 | 2, pdf: string) =>
        execute(
          `INSERT INTO papers
            (source_id, exam_id, title, year, kind, time_limit_min, num_questions,
             difficulty, pdf_url, relevance_to_target, note)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(exam_id, title) DO UPDATE SET
             source_id           = excluded.source_id,
             year                = excluded.year,
             kind                = excluded.kind,
             time_limit_min      = excluded.time_limit_min,
             num_questions       = excluded.num_questions,
             difficulty          = excluded.difficulty,
             pdf_url             = excluded.pdf_url,
             relevance_to_target = excluded.relevance_to_target,
             note                = excluded.note`,
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

  // ---- Sample questions (J) ----
  // Re-imported on every seed. Un-attempted sample rows are cleared first so a
  // re-seed also HEALS rows that the old delete-topics behaviour orphaned
  // (topic_id nulled, and therefore invisible to drills, mastery and
  // analytics). Sample questions you have actually answered are never touched
  // — losing a response is worse than leaving one row untagged.
  {
    const del = execute(
      `DELETE FROM questions
       WHERE source_label LIKE 'Original (sample)%'
         AND id NOT IN (SELECT DISTINCT question_id FROM responses)`,
    );
    const kept = queryOne<{ n: number }>(
      "SELECT COUNT(*) AS n FROM questions WHERE source_label LIKE 'Original (sample)%'",
    )?.n ?? 0;
    if (del.changes > 0 || kept > 0) {
      console.log(
        `  • Sample questions: cleared ${del.changes} un-attempted` +
          (kept ? `, kept ${kept} already-attempted` : ""),
      );
    }

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
  }

  console.log("✓ Seed complete.");
}

main();

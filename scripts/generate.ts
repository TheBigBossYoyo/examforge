/**
 * ExamForge AI question generator (section J — AI originals).
 *   npm run generate -- [--exam TMUA|SAT|all] [--per-topic N]
 *                       [--topic "substring"] [--model name] [--dry-run]
 *
 * Generates ORIGINAL practice questions per topic using the same provider
 * wiring as the AI tutor (Gemini by default — a FREE key from
 * https://aistudio.google.com/app/apikey), then inserts them with
 * origin='ai_generated'. It NEVER reproduces copyrighted exam questions —
 * it asks the model for fresh, original problems in the official style.
 *
 * Requires the DB to be seeded first (npm run seed) so topics exist.
 * Reads keys from .env.local / .env (or the ambient environment).
 */
import fs from "node:fs";
import path from "node:path";
import { getDb, query, queryOne } from "../lib/db";
import { TMUA_TOPICS, SAT_TOPICS, type SeedTopic } from "../lib/seed/taxonomy";
import { importQuestions, type ImportQuestion } from "../lib/importer";
import { identityText, screenBatch } from "../lib/question-quality";
import { parseModelArray } from "../lib/llm-json";

// ---- Minimal .env loader (no new dependency) ----------------------------
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

// ---- Provider resolution (mirrors app/api/tutor/route.ts) ----------------
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

interface ProviderConfig {
  provider: "gemini" | "openai";
  url: string;
  apiKey: string;
  model: string;
}

function resolveProvider(modelOverride?: string): ProviderConfig | null {
  const provider = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const genericKey = process.env.AI_API_KEY;
  const model = (m: string) => modelOverride || process.env.AI_MODEL || m;

  if (provider === "gemini" || provider === "google") {
    const apiKey = geminiKey ?? genericKey;
    if (!apiKey) return null;
    return { provider: "gemini", url: GEMINI_URL, apiKey, model: model("gemini-2.0-flash") };
  }
  if (provider === "openai") {
    const apiKey = openaiKey ?? genericKey;
    if (!apiKey) return null;
    return { provider: "openai", url: OPENAI_URL, apiKey, model: model("gpt-4o-mini") };
  }
  if (geminiKey) return { provider: "gemini", url: GEMINI_URL, apiKey: geminiKey, model: model("gemini-2.0-flash") };
  if (openaiKey) return { provider: "openai", url: OPENAI_URL, apiKey: openaiKey, model: model("gpt-4o-mini") };
  if (genericKey) return { provider: "openai", url: OPENAI_URL, apiKey: genericKey, model: model("gpt-4o-mini") };
  return null;
}

// ---- CLI args -----------------------------------------------------------
interface Args {
  exam: "TMUA" | "SAT" | "all";
  perTopic: number;
  topicFilter?: string;
  model?: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { exam: "all", perTopic: 10, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--exam") {
      const v = (next() ?? "all").toUpperCase();
      args.exam = v === "TMUA" ? "TMUA" : v === "SAT" ? "SAT" : "all";
    } else if (a === "--per-topic") {
      args.perTopic = Math.max(1, parseInt(next() ?? "10", 10) || 10);
    } else if (a === "--topic") {
      args.topicFilter = (next() ?? "").toLowerCase();
    } else if (a === "--model") {
      args.model = next();
    } else if (a === "--dry-run") {
      args.dryRun = true;
    }
  }
  return args;
}

// ---- Prompt building ----------------------------------------------------
const EXAM_GUIDANCE: Record<string, string> = {
  TMUA:
    "TMUA is a non-calculator pure-maths admissions test. NEVER set desmos_recommended to true for TMUA, " +
    "and NEVER produce a free-response question — every TMUA item is multiple choice. " +
    "Paper 1 (area 'P1') tests applications of mathematical knowledge (algebra, calculus, trig, logs, " +
    "sequences, coordinate geometry, number, combinatorics). Paper 2 (area 'P2') tests mathematical " +
    "reasoning and logic (proof techniques, necessary vs sufficient, quantifiers, flawed proofs, " +
    "counterexamples).",
  SAT:
    "Digital SAT. For area 'Math', a graphing calculator (Desmos) is available on EVERY question. " +
    "For area 'RW' (Reading & Writing) there is no calculator and every item is multiple choice with " +
    "exactly 4 options.",
};

/** Per-area shape requirements, mirroring how each section really works. */
function shapeRules(exam: string, topic: SeedTopic, n: number): string[] {
  const rules: string[] = [];

  if (exam === "SAT" && topic.area === "Math") {
    // ~25% of real digital SAT Math is student-produced response.
    const spr = Math.max(1, Math.round(n * 0.25));
    rules.push(
      `- Make exactly ${spr} of the ${n} questions STUDENT-PRODUCED RESPONSE: set "choices" to null and`,
      `  give "correct_answer" as a plain number ("7", "-3", "0.5" or "1/2"). No units, no % or $ signs.`,
      `  The remaining ${n - spr} are multiple choice with exactly 4 options.`,
      `- For every question where a graphing calculator genuinely saves time, set "desmos_recommended": true`,
      `  AND supply "faster_method_md" describing the keystroke-level Desmos route (what to type, what to`,
      `  click). A question with "desmos_recommended": true and no "faster_method_md" will be REJECTED.`,
      `- Aim for at least half the questions to carry a "faster_method_md".`,
    );
  } else if (exam === "SAT" && topic.area === "RW") {
    rules.push(
      `- Every question is multiple choice with exactly 4 options; "choices" must never be null.`,
      `- Put the stimulus in "passage_md" and ONLY the question stem in "prompt_md". Do not repeat the`,
      `  passage inside prompt_md.`,
      `- "passage_md" must be a realistic 50-150 word passage in the style of the digital SAT.`,
      `- "desmos_recommended" must be false.`,
    );
  } else {
    rules.push(
      `- Every question is multiple choice. Use 4-5 plausible options; "choices" must never be null.`,
      `- "desmos_recommended" must be false.`,
    );
  }

  return rules;
}

function buildPrompt(exam: string, topic: SeedTopic, n: number): string {
  return [
    `Generate ${n} ORIGINAL ${exam} practice questions for this exact topic:`,
    `  exam: ${exam}`,
    `  area: ${topic.area}`,
    `  subtopic: ${topic.subtopic}`,
    ``,
    EXAM_GUIDANCE[exam] ?? "",
    ``,
    `STRICT RULES:`,
    `- Output ONLY a JSON array (no prose, no markdown fences) of ${n} objects.`,
    `- Each object MUST have these keys: "exam", "area", "subtopic", "prompt_md", "choices",`,
    `  "correct_answer", "solution_md", "difficulty", "desmos_recommended", "hint1_md",`,
    `  "hint2_md", "hint3_md". Optional: "passage_md", "faster_method_md", "desmos_state_json".`,
    `- "exam" must equal "${exam}", "area" must equal "${topic.area}", "subtopic" must equal "${topic.subtopic}".`,
    ...shapeRules(exam, topic, n),
    `- When "choices" is provided, "correct_answer" MUST be EXACTLY one of those strings, and the four`,
    `  options must all be DIFFERENT values. Repeated options are rejected.`,
    `- Use LaTeX in $...$ for all maths (e.g. "$x^2 - 6x + 5$"). Every $ must be paired.`,
    `- "difficulty" is one of: "easy", "med", "hard", "1600level".`,
    `- "solution_md" must be a real worked solution of at least 25 characters showing the steps.`,
    `  VERIFY the answer key is actually correct by working the problem through.`,
    `- hint1/2/3 are a graduated ladder of nudges (general -> specific), not the full answer.`,
    `- Questions must be ORIGINAL — do NOT copy real past-paper questions, and do NOT produce`,
    `  variations of the same problem with different numbers. Each must test something distinct.`,
    `- Spread difficulty across the ${n} questions (some easy, some hard).`,
    `Return the JSON array now.`,
  ].join("\n");
}

// ---- Model call + parse -------------------------------------------------
async function callModel(cfg: ProviderConfig, prompt: string): Promise<string> {
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        {
          role: "system",
          content:
            "You are an expert TMUA and Digital SAT item writer. You produce original, exam-accurate " +
            "multiple-choice questions with verified answer keys and clear worked solutions. " +
            "You output strict JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      // A batch of 10 questions with LaTeX solutions and three hints each runs
      // well past 4k, and newer models spend part of the budget on reasoning
      // tokens before emitting anything.
      max_tokens: 16384,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    const hint =
      res.status === 429
        ? "\n    Quota exhausted for this model. Try --model gemini-flash-latest, or wait for the daily free-tier reset."
        : res.status === 404
          ? "\n    That model is not available to this key. Run with a different --model."
          : "";
    throw new Error(`${cfg.provider} API error (${res.status}): ${txt.slice(0, 200)}${hint}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string }; finish_reason?: string }[];
  };
  const choice = data.choices?.[0];

  // A truncated reply surfaces as a JSON syntax error hundreds of characters
  // in, which reads like a malformed model rather than an exhausted budget.
  // Name it here instead.
  if (choice?.finish_reason === "length") {
    throw new Error(
      "model response was truncated (finish_reason=length) — lower --per-topic, " +
        "or the model spent its budget on reasoning tokens",
    );
  }

  return choice?.message?.content ?? "";
}

// Extraction and LaTeX-safe repair live in lib/llm-json.ts, where they are
// unit-tested. See the note there on why `\frac` needs rescuing even though it
// parses "successfully" as JSON.
function extractJsonArray(raw: string): unknown[] {
  return parseModelArray(raw).items;
}

function coerce(
  obj: Record<string, unknown>,
  exam: string,
  topic: SeedTopic,
): ImportQuestion | null {
  const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const prompt_md = str(obj.prompt_md).trim();
  const correct_answer = str(obj.correct_answer).trim();
  // An empty array means "no choices" (free response), not "zero options".
  const rawChoices = Array.isArray(obj.choices) ? obj.choices.map(str) : null;
  const choices = rawChoices && rawChoices.length > 0 ? rawChoices : null;
  if (!prompt_md || !correct_answer) return null;
  const desmos =
    exam === "SAT" && topic.area === "Math" ? Boolean(obj.desmos_recommended) : false;
  return {
    exam,
    area: topic.area,
    subtopic: topic.subtopic,
    prompt_md,
    passage_md: obj.passage_md ? str(obj.passage_md) : null,
    choices,
    correct_answer,
    solution_md: obj.solution_md ? str(obj.solution_md) : null,
    // Keep the Desmos route whenever the model supplies one, not only when it
    // also set the flag — a dual-solution breakdown is useful either way.
    faster_method_md: obj.faster_method_md ? str(obj.faster_method_md) : null,
    difficulty: str(obj.difficulty) || "med",
    desmos_recommended: desmos,
    desmos_state_json: desmos && obj.desmos_state_json ? str(obj.desmos_state_json) : null,
    hint1_md: obj.hint1_md ? str(obj.hint1_md) : null,
    hint2_md: obj.hint2_md ? str(obj.hint2_md) : null,
    hint3_md: obj.hint3_md ? str(obj.hint3_md) : null,
    source_label: "AI Original",
  };
}

// ---- Main ---------------------------------------------------------------
async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const cfg = resolveProvider(args.model);
  if (!cfg) {
    console.error(
      "✗ No AI key found. Add a FREE Gemini key to .env.local:\n" +
        "    AI_PROVIDER=gemini\n    GEMINI_API_KEY=your-key   (https://aistudio.google.com/app/apikey)",
    );
    process.exit(1);
  }
  getDb(); // ensure schema exists

  const topics: { exam: string; topic: SeedTopic }[] = [];
  if (args.exam === "TMUA" || args.exam === "all")
    for (const t of TMUA_TOPICS) topics.push({ exam: "TMUA", topic: t });
  if (args.exam === "SAT" || args.exam === "all")
    for (const t of SAT_TOPICS) topics.push({ exam: "SAT", topic: t });

  const selected = args.topicFilter
    ? topics.filter((t) => t.topic.subtopic.toLowerCase().includes(args.topicFilter as string))
    : topics;

  console.log(
    `→ Generating ${args.perTopic} questions for ${selected.length} topic(s) ` +
      `via ${cfg.provider} (${cfg.model})${args.dryRun ? " [dry-run]" : ""}...`,
  );

  let inserted = 0;
  let failed = 0;
  let rejectedTotal = 0;
  const rejectionCounts: Record<string, number> = {};
  for (const { exam, topic } of selected) {
    const label = `${exam}/${topic.area}/${topic.subtopic}`;
    // Skip topics with no DB row (DB not seeded for this exam/topic).
    const examRow = queryOne<{ id: number }>("SELECT id FROM exams WHERE name = ?", [exam]);
    if (!examRow) {
      console.warn(`  ! ${label}: exam not in DB — run 'npm run seed' first. Skipped.`);
      failed += args.perTopic;
      continue;
    }
    try {
      const raw = await callModel(cfg, buildPrompt(exam, topic, args.perTopic));
      const arr = extractJsonArray(raw);
      const rows: ImportQuestion[] = [];
      for (const item of arr) {
        if (item && typeof item === "object") {
          const q = coerce(item as Record<string, unknown>, exam, topic);
          if (q) rows.push(q);
        }
      }
      if (rows.length === 0) {
        console.warn(`  ! ${label}: model returned no parseable questions.`);
        failed += args.perTopic;
        continue;
      }

      // Screen against the quality gate, de-duplicating within the batch and
      // against everything already banked for this topic.
      const existing = query<{ prompt_md: string; passage_md: string | null }>(
        `SELECT q.prompt_md, q.passage_md FROM questions q
           JOIN topics t ON t.id = q.topic_id
          WHERE t.exam_id = ? AND t.area = ? AND t.subtopic = ?`,
        [examRow.id, topic.area, topic.subtopic],
      ).map((r) => identityText(r));

      const report = screenBatch(rows, existing);
      rejectedTotal += report.rejected.length;
      for (const [code, n] of Object.entries(report.byCode)) {
        rejectionCounts[code] = (rejectionCounts[code] ?? 0) + n;
      }

      const reasons = Object.entries(report.byCode)
        .map(([c, n]) => `${c}×${n}`)
        .join(", ");

      if (report.accepted.length === 0) {
        console.warn(`  ! ${label}: all ${rows.length} rejected (${reasons}).`);
        failed += args.perTopic;
        continue;
      }

      if (args.dryRun) {
        console.log(
          `  • ${label}: ${report.accepted.length} accepted` +
            (reasons ? `, ${report.rejected.length} rejected (${reasons})` : "") +
            " (dry-run, not inserted).",
        );
        inserted += report.accepted.length;
      } else {
        const res = importQuestions(report.accepted, "ai_generated");
        inserted += res.inserted;
        console.log(
          `  ✓ ${label}: +${res.inserted}` +
            (reasons ? ` · ${report.rejected.length} rejected (${reasons})` : "") +
            (res.rejected.length ? ` · ${res.rejected.length} unmapped` : ""),
        );
      }
    } catch (err) {
      failed += args.perTopic;
      console.warn(`  ! ${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(
    `\n${args.dryRun ? "Dry-run" : "Done"}: ${inserted} questions ${
      args.dryRun ? "accepted" : "inserted"
    }${rejectedTotal ? `, ${rejectedTotal} rejected by the quality gate` : ""}${
      failed ? `, ~${failed} not produced` : ""
    }.`,
  );
  if (rejectedTotal > 0) {
    console.log("  Rejections by reason:");
    for (const [code, n] of Object.entries(rejectionCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(n).padStart(4)}  ${code}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

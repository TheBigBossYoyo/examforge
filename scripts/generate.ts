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
import { getDb, queryOne } from "../lib/db";
import { TMUA_TOPICS, SAT_TOPICS, type SeedTopic } from "../lib/seed/taxonomy";
import { importQuestions, type ImportQuestion } from "../lib/importer";

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
    "TMUA is a non-calculator pure-maths admissions test. NEVER set desmos_recommended to true for TMUA. " +
    "Paper 1 (area 'P1') tests applications of mathematical knowledge (algebra, calculus, trig, logs, " +
    "sequences, coordinate geometry, number, combinatorics). Paper 2 (area 'P2') tests mathematical " +
    "reasoning and logic (proof techniques, necessary vs sufficient, quantifiers, flawed proofs, " +
    "counterexamples). Questions are 5-option multiple choice in the real test; use 4-5 plausible options.",
  SAT:
    "Digital SAT. For area 'Math', a graphing calculator (Desmos) is allowed on ALL questions: when Desmos " +
    "meaningfully speeds up the solve, set desmos_recommended to true, add a faster_method_md describing the " +
    "Desmos approach, and where useful include a desmos_state_json (a JSON string of an expressions list). " +
    "For area 'RW' (Reading & Writing) NEVER recommend Desmos; these are language questions — include a short " +
    "self-contained passage inside prompt_md when needed. Use 4 options (SAT style).",
};

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
    `  "hint2_md", "hint3_md". Optional: "faster_method_md", "desmos_state_json".`,
    `- "exam" must equal "${exam}", "area" must equal "${topic.area}", "subtopic" must equal "${topic.subtopic}".`,
    `- "choices" is an array of 4-5 strings. "correct_answer" MUST be EXACTLY one of the strings in "choices".`,
    `- Use LaTeX in $...$ for all maths (e.g. "$x^2 - 6x + 5$").`,
    `- "difficulty" is one of: "easy", "med", "hard", "1600level", "real".`,
    `- "solution_md" gives a correct, concise worked solution. VERIFY the answer key is correct.`,
    `- hint1/2/3 are a graduated ladder of nudges (general -> specific), not the full answer.`,
    `- Questions must be ORIGINAL — do NOT copy real past-paper questions.`,
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
      max_tokens: 4096,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${cfg.provider} API error (${res.status}): ${txt.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

function extractJsonArray(raw: string): unknown[] {
  let text = raw.trim();
  // Strip ```json ... ``` fences if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // Fall back to the first '[' .. last ']' slice.
  if (!text.startsWith("[")) {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start !== -1 && end > start) text = text.slice(start, end + 1);
  }
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("Model did not return a JSON array");
  return parsed;
}

function coerce(
  obj: Record<string, unknown>,
  exam: string,
  topic: SeedTopic,
): ImportQuestion | null {
  const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const prompt_md = str(obj.prompt_md).trim();
  const correct_answer = str(obj.correct_answer).trim();
  const choices = Array.isArray(obj.choices) ? obj.choices.map(str) : null;
  if (!prompt_md || !correct_answer) return null;
  if (choices && !choices.includes(correct_answer)) return null; // key must be a choice
  const desmos =
    exam === "SAT" && topic.area === "Math" ? Boolean(obj.desmos_recommended) : false;
  return {
    exam,
    area: topic.area,
    subtopic: topic.subtopic,
    prompt_md,
    choices,
    correct_answer,
    solution_md: obj.solution_md ? str(obj.solution_md) : null,
    faster_method_md: desmos && obj.faster_method_md ? str(obj.faster_method_md) : null,
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
        console.warn(`  ! ${label}: model returned no valid questions.`);
        failed += args.perTopic;
        continue;
      }
      if (args.dryRun) {
        console.log(`  • ${label}: ${rows.length} valid questions (dry-run, not inserted).`);
        inserted += rows.length;
      } else {
        const res = importQuestions(rows, "ai_generated");
        inserted += res.inserted;
        if (res.rejected.length)
          console.warn(`  ! ${label}: ${res.rejected.length} rejected (${res.rejected[0]?.reason}).`);
        console.log(`  ✓ ${label}: +${res.inserted}`);
      }
    } catch (err) {
      failed += args.perTopic;
      console.warn(`  ! ${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(
    `\n${args.dryRun ? "Dry-run" : "Done"}: ${inserted} questions ${
      args.dryRun ? "valid" : "inserted"
    }${failed ? `, ~${failed} not produced` : ""}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

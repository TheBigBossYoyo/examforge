import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_PROMPT = `You are an expert TMUA and Digital SAT tutor. You explain mathematical methods clearly and concisely, always highlighting the fastest approach. For SAT Math, you show how and when to use Desmos (graphing, sliders, regression tables, intersection-finding) to dramatically cut solve time. For TMUA, you focus on proof techniques, necessary vs sufficient conditions, logic, and pure maths rigour. You NEVER reproduce copyrighted exam questions verbatim — you explain methods, strategies and worked examples using original problems only. Always be encouraging, precise, and exam-focused.`;

/** Resolved upstream config. All supported providers speak the OpenAI-compatible
 *  Chat Completions shape, so only the URL / key / default model differ. */
interface ProviderConfig {
  provider: "gemini" | "openai";
  url: string;
  apiKey: string;
  model: string;
}

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Pick the AI backend from env. Gemini is the recommended no-cost option: a
 * FREE key from https://aistudio.google.com/app/apikey (no billing/card needed).
 * Keys are read server-side only and never sent to the client.
 */
function resolveProvider(): ProviderConfig | null {
  const provider = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const genericKey = process.env.AI_API_KEY;

  // Explicit selection via AI_PROVIDER.
  if (provider === "gemini" || provider === "google") {
    const apiKey = geminiKey ?? genericKey;
    if (!apiKey) return null;
    return { provider: "gemini", url: GEMINI_URL, apiKey, model: process.env.AI_MODEL || "gemini-2.0-flash" };
  }
  if (provider === "openai") {
    const apiKey = openaiKey ?? genericKey;
    if (!apiKey) return null;
    return { provider: "openai", url: OPENAI_URL, apiKey, model: process.env.AI_MODEL || "gpt-4o-mini" };
  }

  // No explicit provider: auto-detect from whichever key is present (Gemini first).
  if (geminiKey) {
    return { provider: "gemini", url: GEMINI_URL, apiKey: geminiKey, model: process.env.AI_MODEL || "gemini-2.0-flash" };
  }
  if (openaiKey) {
    return { provider: "openai", url: OPENAI_URL, apiKey: openaiKey, model: process.env.AI_MODEL || "gpt-4o-mini" };
  }
  if (genericKey) {
    // Generic key with no provider hint — assume OpenAI shape by default.
    return { provider: "openai", url: OPENAI_URL, apiKey: genericKey, model: process.env.AI_MODEL || "gpt-4o-mini" };
  }
  return null;
}

const OFFLINE_REPLY =
  "**AI Tutor is offline.**\n\n" +
  "The easiest **free** way to switch it on is Google **Gemini** (no billing, no card):\n\n" +
  "1. Open https://aistudio.google.com/app/apikey and sign in with your Google account.\n" +
  "2. Click **Get API key** → copy it.\n" +
  "3. Add it to `.env.local`:\n\n" +
  "```\nAI_PROVIDER=gemini\nGEMINI_API_KEY=your-free-key\n```\n\n" +
  "Then restart the dev server (`npm run dev`) and the tutor is live. " +
  "In the meantime, use the **Hints** system on any practice question for step-by-step guidance.";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages: ChatMessage[]; exam?: string };
    const { messages } = body;

    const config = resolveProvider();

    if (!config) {
      return NextResponse.json({ ok: true, reply: OFFLINE_REPLY, offline: true });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages must be a non-empty array" }, { status: 400 });
    }

    const allMessages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: allMessages,
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        {
          ok: false,
          reply: `${config.provider} API error (${response.status}): ${errText.slice(0, 300)}`,
        },
        { status: 200 },
      );
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const reply = data.choices?.[0]?.message?.content ?? "No response received from the model.";
    return NextResponse.json({ ok: true, reply });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reply: err instanceof Error ? err.message : "Tutor request failed." },
      { status: 200 },
    );
  }
}

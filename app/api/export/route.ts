import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const exams = query("SELECT * FROM exams");
    const questions = query("SELECT * FROM questions");
    const attempts = query("SELECT * FROM attempts");
    const responses = query("SELECT * FROM responses");
    const mistakes = query("SELECT * FROM mistakes");
    const settings = query("SELECT * FROM settings");

    const payload = {
      exportedAt: new Date().toISOString(),
      exams,
      questions,
      attempts,
      responses,
      mistakes,
      settings,
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="examforge-export.json"',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Export failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

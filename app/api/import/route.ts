import { NextResponse } from "next/server";
import { importQuestions, parseQuestionsCsv } from "@/lib/importer";
import type { ImportQuestion } from "@/lib/importer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { format: "json" | "csv"; data: string };
    const { format, data } = body;

    if (!data || typeof data !== "string") {
      return NextResponse.json({ error: "Missing or invalid data field" }, { status: 400 });
    }

    let rows: ImportQuestion[];

    if (format === "csv") {
      rows = parseQuestionsCsv(data);
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        return NextResponse.json({ error: "data is not valid JSON" }, { status: 400 });
      }

      if (Array.isArray(parsed)) {
        rows = parsed as ImportQuestion[];
      } else if (
        typeof parsed === "object" &&
        parsed !== null &&
        Array.isArray((parsed as Record<string, unknown>).questions)
      ) {
        rows = (parsed as { questions: ImportQuestion[] }).questions;
      } else {
        return NextResponse.json(
          { error: "JSON must be an array of questions or { questions: [...] }" },
          { status: 400 },
        );
      }
    }

    const result = importQuestions(rows, "user_import");
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 400 },
    );
  }
}

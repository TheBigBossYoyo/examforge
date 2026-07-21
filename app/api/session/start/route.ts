import { NextRequest, NextResponse } from "next/server";
import { startSection } from "@/lib/test-session";
import type { AttemptMode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES: AttemptMode[] = ["exam", "diagnostic", "untimed", "drill", "redo"];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      examId?: number;
      section?: string;
      mode?: AttemptMode;
    };

    if (!Number.isFinite(body?.examId) || typeof body?.section !== "string") {
      return NextResponse.json({ error: "examId and section are required" }, { status: 400 });
    }
    const mode: AttemptMode = body.mode && MODES.includes(body.mode) ? body.mode : "exam";

    const handle = startSection({
      examId: Number(body.examId),
      section: body.section,
      mode,
    });
    return NextResponse.json(handle);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start section" },
      { status: 400 },
    );
  }
}

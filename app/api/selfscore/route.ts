import { NextRequest, NextResponse } from "next/server";
import { recordManualScore, type ManualScoreInput } from "@/lib/attempts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ManualScoreInput;
    if (!body?.examId || typeof body.rawScore !== "number" || typeof body.maxRaw !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const result = recordManualScore(body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record score" },
      { status: 500 },
    );
  }
}

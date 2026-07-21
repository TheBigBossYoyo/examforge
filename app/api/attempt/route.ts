import { NextRequest, NextResponse } from "next/server";
import { submitAttempt, type SubmitAttemptInput } from "@/lib/attempts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SubmitAttemptInput;
    if (!body?.examId || !Array.isArray(body.responses)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const result = submitAttempt(body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit attempt" },
      { status: 500 },
    );
  }
}

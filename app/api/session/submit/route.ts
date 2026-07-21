import { NextRequest, NextResponse } from "next/server";
import { submitModule, type SubmitModuleInput } from "@/lib/test-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SubmitModuleInput;

    if (
      !Number.isFinite(body?.sessionId) ||
      !Number.isFinite(body?.attemptId) ||
      !Array.isArray(body?.responses)
    ) {
      return NextResponse.json(
        { error: "sessionId, attemptId and responses are required" },
        { status: 400 },
      );
    }

    const result = submitModule({
      sessionId: Number(body.sessionId),
      attemptId: Number(body.attemptId),
      // Clamp: the client reports its own elapsed time, so a tampered or
      // clock-skewed value should not land in the database unbounded.
      secondsTotal: Math.max(0, Math.min(24 * 3600, Math.round(body.secondsTotal || 0))),
      responses: body.responses,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit module" },
      { status: 400 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { triageMistake } from "@/lib/insights";
import { ROOT_CAUSES, type RootCause } from "@/lib/error-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      mistakeId?: number;
      rootCause?: string;
      note?: string;
    };

    if (!Number.isFinite(body?.mistakeId)) {
      return NextResponse.json({ error: "mistakeId is required" }, { status: 400 });
    }
    if (!body.rootCause || !ROOT_CAUSES.includes(body.rootCause as RootCause)) {
      return NextResponse.json(
        { error: `rootCause must be one of: ${ROOT_CAUSES.join(", ")}` },
        { status: 400 },
      );
    }

    triageMistake(Number(body.mistakeId), body.rootCause as RootCause, body.note);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record triage" },
      { status: 400 },
    );
  }
}

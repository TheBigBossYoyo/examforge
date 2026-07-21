import { NextRequest, NextResponse } from "next/server";
import { setSetting } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { complete?: boolean };
    setSetting("onboarding_complete", body?.complete === false ? "false" : "true");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

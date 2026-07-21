import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MistakePatch {
  id: number;
  action: "resolve" | "unresolve" | "note" | "errorType";
  note_md?: string;
  error_type?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MistakePatch;
    if (!body?.id || !body.action) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    switch (body.action) {
      case "resolve":
        execute("UPDATE mistakes SET resolved = 1 WHERE id = ?", [body.id]);
        break;
      case "unresolve":
        execute("UPDATE mistakes SET resolved = 0 WHERE id = ?", [body.id]);
        break;
      case "note":
        execute("UPDATE mistakes SET note_md = ? WHERE id = ?", [body.note_md ?? null, body.id]);
        break;
      case "errorType":
        if (!body.error_type) return NextResponse.json({ error: "error_type required" }, { status: 400 });
        execute("UPDATE mistakes SET error_type = ? WHERE id = ?", [body.error_type, body.id]);
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update mistake" },
      { status: 500 },
    );
  }
}

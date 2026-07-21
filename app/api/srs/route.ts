import { NextRequest, NextResponse } from "next/server";
import { gradeCard, seedSrsFromWeakTopics } from "@/lib/srs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SrsBody {
  action?: "grade" | "seed";
  cardId?: number;
  grade?: 0 | 1 | 2 | 3;
  examId?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SrsBody;
    // Grading is the overwhelmingly common call, so a body carrying a cardId
    // and a grade is unambiguous without an explicit action.
    const action = body.action ?? (body.cardId !== undefined ? "grade" : undefined);

    if (action === "grade") {
      if (!body.cardId || body.grade === undefined) {
        return NextResponse.json({ error: "cardId and grade required" }, { status: 400 });
      }
      const card = gradeCard(body.cardId, body.grade);
      return NextResponse.json({ ok: true, card });
    }

    if (action === "seed") {
      if (!body.examId) {
        return NextResponse.json({ error: "examId required" }, { status: 400 });
      }
      const created = seedSrsFromWeakTopics(body.examId);
      return NextResponse.json({ ok: true, created });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update SRS" },
      { status: 500 },
    );
  }
}

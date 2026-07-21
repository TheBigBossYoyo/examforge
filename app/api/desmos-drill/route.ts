import { NextRequest, NextResponse } from "next/server";
import { recordDrillAttempt } from "@/lib/drill-stats";
import { getDrill } from "@/lib/desmos-drills";
import { isAnswerCorrect } from "@/lib/answer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mark and record one drill attempt. Marking happens here rather than in the
 * browser so the drill answers never ship to the client — the same reason exam
 * questions are stripped before they are sent.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      drillCode?: string;
      answer?: string | null;
      seconds?: number;
    };

    const drill = body.drillCode ? getDrill(body.drillCode) : undefined;
    if (!drill) {
      return NextResponse.json({ error: "Unknown drill" }, { status: 400 });
    }

    const correct = isAnswerCorrect(body.answer ?? null, drill.correct_answer);
    const seconds = Math.max(0, Math.min(3600, Number(body.seconds) || 0));

    recordDrillAttempt({
      drillCode: drill.code,
      correct,
      seconds,
      parSeconds: drill.par_seconds,
    });

    return NextResponse.json({
      correct,
      seconds,
      parSeconds: drill.par_seconds,
      beatPar: correct && seconds <= drill.par_seconds,
      correctAnswer: drill.correct_answer,
      method_md: drill.method_md,
      tradeoff_md: drill.tradeoff_md,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record drill" },
      { status: 400 },
    );
  }
}

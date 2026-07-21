import { NextRequest, NextResponse } from "next/server";
import { generatePlan, setTaskDone, REALLOCATE_KEY } from "@/lib/planner";
import { setSetting } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PlanBody {
  action: "generate" | "toggle" | "reallocate";
  examId?: number;
  daysAhead?: number;
  id?: number;
  done?: boolean;
  confirmed?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PlanBody;
    if (body.action === "generate") {
      if (!body.examId) {
        return NextResponse.json({ error: "examId required" }, { status: 400 });
      }
      const result = generatePlan(body.examId, { daysAhead: body.daysAhead });
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "toggle") {
      if (!body.id || typeof body.done !== "boolean") {
        return NextResponse.json({ error: "id and done required" }, { status: 400 });
      }
      setTaskDone(body.id, body.done);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "reallocate") {
      // Phase 2: confirm (or revoke) reallocating freed SAT blocks to TMUA.
      // Never silent — this only flips the flag; the caller regenerates the plan.
      setSetting(REALLOCATE_KEY, body.confirmed ? "true" : "false");
      return NextResponse.json({ ok: true, reallocateConfirmed: Boolean(body.confirmed) });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update plan" },
      { status: 500 },
    );
  }
}

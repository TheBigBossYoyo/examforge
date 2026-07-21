import { describe, expect, it } from "vitest";
import { REPLAN_THRESHOLD_DAYS, assessDrift, type DriftTask } from "./drift";

const TODAY = "2026-07-21";
const DAILY = 120; // two hours of study a day

const task = (date: string, estMinutes: number, done = false): DriftTask => ({
  date,
  estMinutes,
  done,
});

describe("assessDrift", () => {
  it("reports on_track when the plan matches reality", () => {
    const d = assessDrift(
      [task("2026-07-19", 60, true), task("2026-07-20", 60, true), task("2026-07-22", 60)],
      TODAY,
      DAILY,
    );
    expect(d.status).toBe("on_track");
    expect(d.shouldReplan).toBe(false);
    expect(d.backlogMinutes).toBe(0);
  });

  it("counts only past-dated incomplete work as backlog", () => {
    const d = assessDrift(
      [
        task("2026-07-19", 60), // overdue
        task("2026-07-20", 60), // overdue
        task("2026-07-25", 90), // future, not yet due — not backlog
      ],
      TODAY,
      DAILY,
    );
    expect(d.backlogMinutes).toBe(120);
  });

  it("does not treat today's unfinished work as backlog", () => {
    // The day is not over; counting it would nag every morning.
    const d = assessDrift([task(TODAY, 120)], TODAY, DAILY);
    expect(d.backlogMinutes).toBe(0);
    expect(d.status).toBe("on_track");
  });

  it("flags behind once drift passes the threshold", () => {
    const d = assessDrift(
      [task("2026-07-17", 120), task("2026-07-18", 120)], // 2 days of work undone
      TODAY,
      DAILY,
    );
    expect(d.netDays).toBeCloseTo(2);
    expect(d.status).toBe("behind");
    expect(d.shouldReplan).toBe(true);
    expect(d.reason).toMatch(/behind/i);
  });

  it("does not flag a small slip", () => {
    const d = assessDrift([task("2026-07-20", 60)], TODAY, DAILY); // half a day
    expect(d.netDays).toBeLessThan(REPLAN_THRESHOLD_DAYS);
    expect(d.status).toBe("on_track");
    expect(d.shouldReplan).toBe(false);
  });

  it("flags ahead when future work is already done", () => {
    const d = assessDrift(
      [task("2026-07-23", 120, true), task("2026-07-24", 120, true)],
      TODAY,
      DAILY,
    );
    expect(d.status).toBe("ahead");
    expect(d.shouldReplan).toBe(true);
    expect(d.netDays).toBeLessThan(0);
    expect(d.reason).toMatch(/ahead/i);
  });

  it("nets backlog against work done early", () => {
    const d = assessDrift(
      [task("2026-07-18", 120), task("2026-07-25", 120, true)],
      TODAY,
      DAILY,
    );
    // One day behind, one day ahead — they cancel.
    expect(d.netDays).toBeCloseTo(0);
    expect(d.status).toBe("on_track");
  });

  it("handles an empty plan without dividing by zero", () => {
    const d = assessDrift([], TODAY, 0);
    expect(d.netDays).toBe(0);
    expect(d.status).toBe("on_track");
    expect(Number.isFinite(d.netDays)).toBe(true);
  });

  it("ignores malformed minute values rather than throwing", () => {
    const d = assessDrift(
      [task("2026-07-19", Number.NaN), task("2026-07-19", -50)],
      TODAY,
      DAILY,
    );
    expect(Number.isFinite(d.backlogMinutes)).toBe(true);
    expect(d.backlogMinutes).toBe(0);
  });

  it("tolerates a full ISO timestamp as the date", () => {
    const d = assessDrift([task("2026-07-19T09:00:00", 120)], TODAY, DAILY);
    expect(d.backlogMinutes).toBe(120);
  });
});

import { describe, expect, it } from "vitest";
import { buildDailyPlan, buildRevisionQueue, calculateReadiness } from "./studyEngine";
import type { Chapter } from "@/data/jee";

const chapters: Chapter[] = [
  { id: "phy-1", title: "Rotational Motion", subject: "Physics", stage: "revising", targetWeek: 1, flagged: true },
  { id: "che-1", title: "Thermodynamics", subject: "Chemistry", stage: "revised", targetWeek: 9 },
  { id: "mat-1", title: "Definite Integration", subject: "Mathematics", stage: "not_started", targetWeek: 9 },
];

describe("studyEngine", () => {
  it("prioritizes an explicitly flagged chapter in the revision queue", () => {
    expect(buildRevisionQueue(chapters, [], { "card-1": "shaky" }, { "card-1": "phy-1" })[0]?.chapter.id).toBe("phy-1");
  });

  it("builds a bounded, non-random daily plan from the student signals", () => {
    const plan = buildDailyPlan({ chapters, mocks: [], reviews: {}, cardChapterIds: {}, availableMinutes: 180, preferredSubjects: ["Physics"], intensity: "focused" });
    expect(plan.length).toBeGreaterThan(0);
    expect(plan[0]?.subject).toBe("Physics");
    expect(plan.reduce((sum, item) => sum + item.minutes, 0)).toBeLessThanOrEqual(180);
  });

  it("keeps readiness bounded to a useful percentage", () => {
    const score = calculateReadiness(chapters, [{ physics: 50, chemistry: 60, mathematics: 40, total: 150, attemptedAt: new Date() }], { "x": "known" }, [{ minutes: 120, focus: "Revision", completedAt: new Date() }]);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

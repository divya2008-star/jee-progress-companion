import { describe, expect, it } from "vitest";
import { buildStudentStudyContext } from "./aiContext";

describe("buildStudentStudyContext", () => {
  it("uses saved study records to create a personalized, bounded AI context", () => {
    const now = new Date("2026-08-26T10:00:00Z");
    const context = buildStudentStudyContext({
      profile: { dailyGoalMinutes: 180, targetExamDate: new Date("2027-01-21T00:00:00Z") },
      chapters: [{ chapterId: "phy-6", subject: "Physics", stage: "revising", targetWeek: 4, notes: "Sign errors in torque", flagged: true, starred: false }],
      sessions: [{ minutes: 90, focus: "Rotational Motion", completedAt: now, difficulty: "difficult", notes: "Torque setup felt slow" }],
      mocks: [{ physics: 56, chemistry: 61, mathematics: 45, total: 162, attemptedAt: now }],
      flashcards: [{ cardId: "p-rot-1", status: "shaky" }],
    }, now);

    expect(context).toContain("today completed: 90 minutes");
    expect(context).toContain("Latest mock: 162/300");
    expect(context).toContain("phy-6");
    expect(context).toContain("shaky cards: 1");
    expect(context).toContain("Torque setup felt slow");
  });

  it("does not invent data when a student has not recorded progress", () => {
    const context = buildStudentStudyContext({ profile: null, chapters: [], sessions: [], mocks: [], flashcards: [] }, new Date("2026-08-26T10:00:00Z"));
    expect(context).toContain("No saved mock attempts yet.");
    expect(context).toContain("No mistake notes logged.");
  });
});

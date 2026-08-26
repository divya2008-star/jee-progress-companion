import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getStudentDashboard: vi.fn(),
  setDailyGoal: vi.fn(),
  saveChapterProgress: vi.fn(),
  addStudySession: vi.fn(),
  addMockTest: vi.fn(),
  saveFlashcardReview: vi.fn(),
}));

import { addMockTest, addStudySession, saveChapterProgress, saveFlashcardReview, setDailyGoal } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext {
  return {
    user: { id: 7, openId: "student-7", name: "Student", email: "student@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("student record procedures", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves the daily goal for the authenticated student", async () => {
    await appRouter.createCaller(context()).student.setDailyGoal({ minutes: 210 });
    expect(setDailyGoal).toHaveBeenCalledWith(7, 210);
  });

  it("saves a full chapter-progress record with user ownership", async () => {
    await appRouter.createCaller(context()).student.saveChapter({ chapterId: "phy-6", subject: "Physics", stage: "revising", targetWeek: 5, notes: "Recheck torque signs", starred: true, flagged: true });
    expect(saveChapterProgress).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, chapterId: "phy-6", notes: "Recheck torque signs", flagged: true }));
  });

  it("saves a study session, mock attempt, and flashcard review", async () => {
    const caller = appRouter.createCaller(context());
    const completedAt = new Date("2026-08-26T09:00:00Z");
    await caller.student.addSession({ minutes: 90, focus: "Rotational Motion", completedAt });
    await caller.student.addMock({ physics: 56, chemistry: 61, mathematics: 45, attemptedAt: completedAt });
    await caller.student.reviewFlashcard({ cardId: "p-rot-1", status: "shaky" });

    expect(addStudySession).toHaveBeenCalledWith(7, 90, "Rotational Motion", completedAt);
    expect(addMockTest).toHaveBeenCalledWith(7, 56, 61, 45, completedAt);
    expect(saveFlashcardReview).toHaveBeenCalledWith(7, "p-rot-1", "shaky");
  });

  it("rejects an invalid daily goal before attempting to save it", async () => {
    await expect(appRouter.createCaller(context()).student.setDailyGoal({ minutes: 0 })).rejects.toThrow();
    expect(setDailyGoal).not.toHaveBeenCalled();
  });
});

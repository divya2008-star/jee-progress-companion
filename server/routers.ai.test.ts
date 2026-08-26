import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getStudentDashboard: vi.fn(),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { getStudentDashboard } from "./db";
import { invokeLLM } from "./_core/llm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "jee-student",
      name: "Aspirant",
      email: "aspirant@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("ai guidance procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStudentDashboard).mockResolvedValue({
      profile: { dailyGoalMinutes: 180, targetExamDate: new Date("2027-01-21T00:00:00Z") },
      chapters: [{ chapterId: "phy-6", subject: "Physics", stage: "revising", targetWeek: 3, notes: "Torque sign errors", flagged: true, starred: false, id: 1, userId: 42, updatedAt: new Date() }],
      sessions: [{ id: 1, userId: 42, minutes: 90, focus: "Rotational Motion", completedAt: new Date() }],
      mocks: [{ id: 1, userId: 42, physics: 56, chemistry: 61, mathematics: 45, total: 162, attemptedAt: new Date() }],
      flashcards: [{ id: 1, userId: 42, cardId: "p-rot-1", status: "shaky", reviewedAt: new Date() }],
    });
    vi.mocked(invokeLLM).mockResolvedValue({
      id: "response", created: 1, model: "claude-haiku-4-5", finish_reason: null,
      choices: [{ index: 0, message: { role: "assistant", content: "Work on rotational motion." }, finish_reason: "stop" }],
    });
  });

  it("uses authenticated saved records when generating chat guidance", async () => {
    const result = await appRouter.createCaller(context()).ai.chat({ message: "What should I study today?" });

    expect(result).toBe("Work on rotational motion.");
    expect(getStudentDashboard).toHaveBeenCalledWith(42);
    expect(invokeLLM).toHaveBeenCalledWith(expect.objectContaining({
      model: "claude-haiku-4-5",
      messages: expect.arrayContaining([
        expect.objectContaining({ content: expect.stringContaining("Authenticated JEE student") }),
        expect.objectContaining({ content: expect.stringContaining("Torque sign errors") }),
      ]),
    }));
  });

  it("keeps the insight input limited to a selected analysis type", async () => {
    const result = await appRouter.createCaller(context()).ai.insight({ kind: "mistake-pattern analysis" });
    expect(result).toBe("Work on rotational motion.");
    expect(getStudentDashboard).toHaveBeenCalledWith(42);
  });
});

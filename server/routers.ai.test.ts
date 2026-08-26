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
import { canAdvancePractice, getOptionFeedback } from "../shared/practiceFlow";
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

  it("cleans raw Markdown from visible Copilot guidance", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      id: "formatted", created: 1, model: "claude-haiku-4-5", finish_reason: null,
      choices: [{ index: 0, message: { role: "assistant", content: "## Action for today\n- **Revise** torque signs" }, finish_reason: "stop" }],
    } as never);

    const result = await appRouter.createCaller(context()).ai.insight({ kind: "next action" });

    expect(result).toContain("🎯 Action for today");
    expect(result).toContain("• Revise torque signs");
    expect(result).not.toMatch(/[#*]/);
  });

  it("sanitizes the response used by every visible Copilot guidance route", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({
      id: "clean-all", created: 1, model: "claude-haiku-4-5", finish_reason: null,
      choices: [{ index: 0, message: { role: "assistant", content: "## Next step\n- **Log** one timed set" }, finish_reason: "stop" }],
    } as never);
    const caller = appRouter.createCaller(context());
    const responses = await Promise.all([
      caller.ai.chat({ message: "What should I do?" }),
      caller.ai.insight({ kind: "coach note" }),
      caller.ai.chapter({ chapter: "Rotational Motion", question: "Explain simply." }),
      caller.ai.mockPostMortem({ mockTotal: 162, wrong: "Torque", guessed: "", skipped: "", difficultCorrect: "" }),
    ]);

    responses.forEach((response) => {
      expect(response).toContain("➡️ Next step");
      expect(response).toContain("• Log one timed set");
      expect(response).not.toMatch(/[#*]/);
    });
  });

  it("connects a generated MCQ set to gated answer feedback", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      id: "practice-flow", created: 1, model: "claude-haiku-4-5", finish_reason: null,
      choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify({ title: "Physics drill", questions: Array.from({ length: 3 }, (_, index) => ({ question: `Question ${index + 1}: Which unit is used for this quantity?`, options: ["A", "B", "C", "D"], correctIndex: 2, explanation: "Option C is the correct unit." })) }) }, finish_reason: "stop" }],
    } as never);
    const test = await appRouter.createCaller(context()).ai.practice({ subject: "Physics", chapter: "Units & Dimensions", difficulty: "foundation", count: 3 });

    expect(test.questions).toHaveLength(3);
    expect(canAdvancePractice(null)).toBe(false);
    expect(getOptionFeedback(1, 1, test.questions[0]!.correctIndex)).toBe("incorrect");
    expect(getOptionFeedback(1, test.questions[0]!.correctIndex, test.questions[0]!.correctIndex)).toBe("correct");
    expect(canAdvancePractice(1)).toBe(true);
  });

  it("grounds chapter, practice, and mock-analysis requests in the authenticated study context", async () => {
    const caller = appRouter.createCaller(context());
    await caller.ai.chapter({ chapter: "Rotational Motion", question: "Explain this chapter simply." });
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      id: "practice", created: 1, model: "claude-haiku-4-5", finish_reason: null,
      choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify({ title: "Rotational Motion · Medium", questions: Array.from({ length: 5 }, (_, index) => ({ question: `Question ${index + 1}: A rotating body has an angular speed of 2 rad/s.`, options: ["2", "4", "6", "8"], correctIndex: 1, explanation: "Use the stated rotational relation." })) }) }, finish_reason: "stop" }],
    } as never);
    const practice = await caller.ai.practice({ subject: "Physics", chapter: "Rotational Motion", difficulty: "medium", count: 5 });
    await caller.ai.mockPostMortem({ mockTotal: 162, wrong: "Torque sign", guessed: "", skipped: "", difficultCorrect: "" });

    expect(practice.questions).toHaveLength(5);
    expect(practice.questions[0]).toMatchObject({ options: ["2", "4", "6", "8"], correctIndex: 1 });
    expect(getStudentDashboard).toHaveBeenCalledTimes(3);
    expect(invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ response_format: expect.objectContaining({ type: "json_schema" }) }));
    expect(invokeLLM).toHaveBeenLastCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([expect.objectContaining({ content: expect.stringContaining("Torque sign") })]),
    }));
  });
});

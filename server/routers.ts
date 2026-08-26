import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { buildStudentStudyContext } from "./aiContext";
import { cleanCopilotText } from "../shared/copilotText";
import * as db from "./db";

const chapterInput = z.object({
  chapterId: z.string().min(1).max(80),
  subject: z.enum(["Physics", "Chemistry", "Mathematics"]),
  stage: z.enum(["not_started", "revising", "revised", "test_ready"]),
  targetWeek: z.number().int().min(1).max(52),
  notes: z.string().max(5000),
  starred: z.boolean(),
  flagged: z.boolean(),
});

const guidanceContext = z.string().min(10).max(14000);
const planItemInput = z.object({
  id: z.string().min(1).max(80),
  subject: z.enum(["Physics", "Chemistry", "Mathematics", "Revision"]),
  chapterId: z.string().max(80).optional(),
  chapter: z.string().min(1).max(120),
  task: z.string().min(1).max(240),
  minutes: z.number().int().min(5).max(360),
  reason: z.string().min(1).max(500),
  completed: z.boolean().optional(),
});

const practiceQuestionSchema = z.object({
  question: z.string().min(12).max(700),
  options: z.array(z.string().min(1).max(280)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(8).max(700),
});

const practiceSetSchema = z.object({
  title: z.string().min(1).max(160),
  questions: z.array(practiceQuestionSchema).min(3).max(10),
});

async function generateGuidance(kind: string, message: string, context: string) {
  const prompt = kind === "chat"
    ? `Student message: ${message}`
    : `Create a ${kind} insight for this student. Give concise, specific, actionable advice. Do not invent results or weaknesses not present in the data.`;
  const response = await invokeLLM({
    model: "claude-haiku-4-5",
    maxTokens: 1200,
    messages: [
      {
        role: "system",
        content: "You are JEE Copilot, an encouraging but rigorous study coach for Indian JEE aspirants. Use only the supplied progress context. Give structured practical study advice, name chapters only when justified by data, and clearly say when more data is needed. Never claim to know a student's private information beyond the context.",
      },
      { role: "user", content: `${prompt}\n\nStudent progress context:\n${context}` },
    ],
  });
  const content = response.choices[0]?.message.content;
  return typeof content === "string" && content.trim() ? cleanCopilotText(content) : "I could not generate guidance right now. Please try again.";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  student: router({
    dashboard: protectedProcedure.query(({ ctx }) => db.getStudentDashboard(ctx.user.id)),
    setDailyGoal: protectedProcedure.input(z.object({ minutes: z.number().int().min(15).max(720) })).mutation(({ ctx, input }) => db.setDailyGoal(ctx.user.id, input.minutes)),
    saveChapter: protectedProcedure.input(chapterInput).mutation(({ ctx, input }) => db.saveChapterProgress({ userId: ctx.user.id, ...input })),
    addSession: protectedProcedure.input(z.object({ minutes: z.number().int().min(5).max(720), focus: z.string().min(1).max(120), completedAt: z.date(), notes: z.string().max(2000).optional(), difficulty: z.enum(["easy", "okay", "difficult", "very_difficult"]).optional() })).mutation(({ ctx, input }) => db.addStudySession(ctx.user.id, input.minutes, input.focus, input.completedAt, input.notes, input.difficulty)),
    addMock: protectedProcedure.input(z.object({ physics: z.number().int().min(0).max(100), chemistry: z.number().int().min(0).max(100), mathematics: z.number().int().min(0).max(100), attemptedAt: z.date() })).mutation(({ ctx, input }) => db.addMockTest(ctx.user.id, input.physics, input.chemistry, input.mathematics, input.attemptedAt)),
    reviewFlashcard: protectedProcedure.input(z.object({ cardId: z.string().min(1).max(100), status: z.enum(["known", "shaky"]) })).mutation(({ ctx, input }) => db.saveFlashcardReview(ctx.user.id, input.cardId, input.status)),
    saveDailyPlan: protectedProcedure.input(z.object({ availableMinutes: z.number().int().min(30).max(840), intensity: z.enum(["steady", "focused", "sprint"]), preferredSubjects: z.array(z.enum(["Physics", "Chemistry", "Mathematics"])).min(1).max(3), items: z.array(planItemInput).min(1).max(8) })).mutation(({ ctx, input }) => db.saveDailyPlan({ userId: ctx.user.id, availableMinutes: input.availableMinutes, intensity: input.intensity, preferredSubjects: input.preferredSubjects, items: input.items })),
  }),
  ai: router({
    chat: protectedProcedure.input(z.object({ message: z.string().trim().min(1).max(1000) })).mutation(async ({ ctx, input }) => {
      const snapshot = await db.getStudentDashboard(ctx.user.id);
      return generateGuidance("chat", input.message, buildStudentStudyContext(snapshot));
    }),
    insight: protectedProcedure.input(z.object({ kind: z.enum(["next action", "coach note", "mistake-pattern analysis"]) })).mutation(async ({ ctx, input }) => {
      const snapshot = await db.getStudentDashboard(ctx.user.id);
      return generateGuidance(input.kind, "", buildStudentStudyContext(snapshot));
    }),
    chapter: protectedProcedure.input(z.object({ chapter: z.string().min(1).max(120), question: z.string().min(1).max(500) })).mutation(async ({ ctx, input }) => {
      const snapshot = await db.getStudentDashboard(ctx.user.id);
      return generateGuidance("chapter guide", `Selected chapter: ${input.chapter}. ${input.question}. Explain progressively: simple idea, intuition, formulas or concept, a compact example, one JEE-style application, then a quick self-check. Keep it concise.`, buildStudentStudyContext(snapshot));
    }),
    mockPostMortem: protectedProcedure.input(z.object({ mockTotal: z.number().int().min(0).max(300), wrong: z.string().max(2400), guessed: z.string().max(2400), skipped: z.string().max(2400), difficultCorrect: z.string().max(2400) })).mutation(async ({ ctx, input }) => {
      const snapshot = await db.getStudentDashboard(ctx.user.id);
      const observation = `Latest mock total: ${input.mockTotal}/300. Wrong questions or concepts: ${input.wrong || "not logged"}. Guessed: ${input.guessed || "not logged"}. Skipped: ${input.skipped || "not logged"}. Correct but difficult: ${input.difficultCorrect || "not logged"}. Create a concise post-mortem with what went well, evidence-supported issues, chapters to revisit if justified, and one change for the next mock. Never invent numeric accuracy or error counts.`;
      return generateGuidance("mock post-mortem", observation, buildStudentStudyContext(snapshot));
    }),
    practice: protectedProcedure.input(z.object({ subject: z.enum(["Physics", "Chemistry", "Mathematics"]), chapter: z.string().min(1).max(120), difficulty: z.enum(["foundation", "medium", "challenge"]), count: z.number().int().min(3).max(10) })).mutation(async ({ ctx, input }) => {
      const snapshot = await db.getStudentDashboard(ctx.user.id);
      const response = await invokeLLM({
        model: "claude-haiku-4-5",
        maxTokens: 5200,
        messages: [
          { role: "system", content: "You create accurate, self-contained JEE multiple-choice practice. Return only JSON matching the schema. Every question must have exactly four plausible options, one correctIndex from 0 to 3, and a concise explanation. Never use Markdown or mention the student record." },
          { role: "user", content: `Create exactly ${input.count} ${input.difficulty} JEE MCQs for ${input.subject}, chapter ${input.chapter}. Keep numerical values complete and internally consistent. Student context may guide topic selection only; do not mention it:\n${buildStudentStudyContext(snapshot)}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "jee_practice_set",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                      correctIndex: { type: "integer", minimum: 0, maximum: 3 },
                      explanation: { type: "string" },
                    },
                    required: ["question", "options", "correctIndex", "explanation"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["title", "questions"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = response.choices[0]?.message.content;
      if (typeof content !== "string") throw new Error("Practice generation returned no text content.");
      const parsed = practiceSetSchema.parse(JSON.parse(content));
      if (parsed.questions.length !== input.count) throw new Error("Practice question count did not match the request.");
      return parsed;
    }),
  }),
});

export type AppRouter = typeof appRouter;

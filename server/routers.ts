import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { buildStudentStudyContext } from "./aiContext";
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
  return typeof content === "string" && content.trim() ? content : "I could not generate guidance right now. Please try again.";
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
    addSession: protectedProcedure.input(z.object({ minutes: z.number().int().min(5).max(720), focus: z.string().min(1).max(120), completedAt: z.date() })).mutation(({ ctx, input }) => db.addStudySession(ctx.user.id, input.minutes, input.focus, input.completedAt)),
    addMock: protectedProcedure.input(z.object({ physics: z.number().int().min(0).max(100), chemistry: z.number().int().min(0).max(100), mathematics: z.number().int().min(0).max(100), attemptedAt: z.date() })).mutation(({ ctx, input }) => db.addMockTest(ctx.user.id, input.physics, input.chemistry, input.mathematics, input.attemptedAt)),
    reviewFlashcard: protectedProcedure.input(z.object({ cardId: z.string().min(1).max(100), status: z.enum(["known", "shaky"]) })).mutation(({ ctx, input }) => db.saveFlashcardReview(ctx.user.id, input.cardId, input.status)),
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
  }),
});

export type AppRouter = typeof appRouter;

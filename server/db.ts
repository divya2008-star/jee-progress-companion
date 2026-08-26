import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  chapterProgress,
  dailyPlans,
  flashcardReviews,
  InsertUser,
  mockTests,
  studentProfiles,
  studySessions,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getMockTotal } from "./studyLogic";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getStudentDashboard(userId: number) {
  const db = await getDb();
  if (!db) {
    return { profile: null, chapters: [], sessions: [], mocks: [], flashcards: [], dailyPlan: null };
  }
  const planDate = new Date().toISOString().slice(0, 10);
  const [profile, chapters, sessions, mocks, flashcards, dailyPlan] = await Promise.all([
    db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1),
    db.select().from(chapterProgress).where(eq(chapterProgress.userId, userId)),
    db.select().from(studySessions).where(eq(studySessions.userId, userId)).orderBy(desc(studySessions.completedAt)).limit(90),
    db.select().from(mockTests).where(eq(mockTests.userId, userId)).orderBy(desc(mockTests.attemptedAt)).limit(30),
    db.select().from(flashcardReviews).where(eq(flashcardReviews.userId, userId)),
    db.select().from(dailyPlans).where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, planDate))).limit(1),
  ]);
  return { profile: profile[0] ?? null, chapters, sessions, mocks, flashcards, dailyPlan: dailyPlan[0] ?? null };
}

export async function setDailyGoal(userId: number, dailyGoalMinutes: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(studentProfiles).values({ userId, dailyGoalMinutes, targetExamDate: new Date("2027-01-21T00:00:00Z") }).onDuplicateKeyUpdate({
    set: { dailyGoalMinutes, updatedAt: new Date() },
  });
}

export async function saveChapterProgress(input: {
  userId: number; chapterId: string; subject: "Physics" | "Chemistry" | "Mathematics";
  stage: "not_started" | "revising" | "revised" | "test_ready"; targetWeek: number;
  notes: string; starred: boolean; flagged: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(chapterProgress).values(input).onDuplicateKeyUpdate({
    set: { stage: input.stage, targetWeek: input.targetWeek, notes: input.notes, starred: input.starred, flagged: input.flagged, updatedAt: new Date() },
  });
}

export async function addStudySession(userId: number, minutes: number, focus: string, completedAt: Date, notes?: string, difficulty?: "easy" | "okay" | "difficult" | "very_difficult") {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(studySessions).values({ userId, minutes, focus, completedAt, notes, difficulty });
}

export async function addMockTest(userId: number, physics: number, chemistry: number, mathematics: number, attemptedAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(mockTests).values({ userId, physics, chemistry, mathematics, total: getMockTotal(physics, chemistry, mathematics), attemptedAt });
}

export async function saveFlashcardReview(userId: number, cardId: string, status: "known" | "shaky") {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const existing = await db.select().from(flashcardReviews).where(and(eq(flashcardReviews.userId, userId), eq(flashcardReviews.cardId, cardId))).limit(1);
  const intervalDays = status === "known" ? Math.min(Math.max(existing[0]?.intervalDays ?? 2, 2) * 2, 21) : 1;
  const nextReviewAt = new Date(Date.now() + intervalDays * 86400000);
  await db.insert(flashcardReviews).values({ userId, cardId, status, intervalDays, nextReviewAt }).onDuplicateKeyUpdate({ set: { status, intervalDays, nextReviewAt, reviewedAt: new Date() } });
}

export type DailyPlanItem = { id: string; subject: "Physics" | "Chemistry" | "Mathematics" | "Revision"; chapterId?: string; chapter: string; task: string; minutes: number; reason: string; completed?: boolean };

export async function saveDailyPlan(input: { userId: number; availableMinutes: number; intensity: "steady" | "focused" | "sprint"; preferredSubjects: string[]; items: DailyPlanItem[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const planDate = new Date().toISOString().slice(0, 10);
  await db.insert(dailyPlans).values({
    userId: input.userId,
    planDate,
    availableMinutes: input.availableMinutes,
    intensity: input.intensity,
    preferredSubjects: JSON.stringify(input.preferredSubjects),
    planItems: JSON.stringify(input.items),
  }).onDuplicateKeyUpdate({
    set: { availableMinutes: input.availableMinutes, intensity: input.intensity, preferredSubjects: JSON.stringify(input.preferredSubjects), planItems: JSON.stringify(input.items), updatedAt: new Date() },
  });
}

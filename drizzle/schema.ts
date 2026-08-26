import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const studentProfiles = mysqlTable("studentProfiles", {
  userId: int("userId").notNull().primaryKey(),
  targetExamDate: timestamp("targetExamDate").defaultNow().notNull(),
  dailyGoalMinutes: int("dailyGoalMinutes").default(180).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const chapterProgress = mysqlTable(
  "chapterProgress",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    chapterId: varchar("chapterId", { length: 80 }).notNull(),
    subject: mysqlEnum("subject", ["Physics", "Chemistry", "Mathematics"]).notNull(),
    stage: mysqlEnum("stage", ["not_started", "revising", "revised", "test_ready"]).default("not_started").notNull(),
    targetWeek: int("targetWeek").default(1).notNull(),
    notes: text("notes").notNull(),
    starred: boolean("starred").default(false).notNull(),
    flagged: boolean("flagged").default(false).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("chapter_user_unique").on(table.userId, table.chapterId)]
);

export const studySessions = mysqlTable("studySessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  minutes: int("minutes").notNull(),
  focus: varchar("focus", { length: 120 }).default("Focused revision").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export const mockTests = mysqlTable("mockTests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  physics: int("physics").notNull(),
  chemistry: int("chemistry").notNull(),
  mathematics: int("mathematics").notNull(),
  total: int("total").notNull(),
  attemptedAt: timestamp("attemptedAt").defaultNow().notNull(),
});

export const flashcardReviews = mysqlTable(
  "flashcardReviews",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    cardId: varchar("cardId", { length: 100 }).notNull(),
    status: mysqlEnum("status", ["known", "shaky"]).notNull(),
    reviewedAt: timestamp("reviewedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("flashcard_user_unique").on(table.userId, table.cardId)]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

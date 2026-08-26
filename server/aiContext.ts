type ChapterRecord = {
  subject: "Physics" | "Chemistry" | "Mathematics";
  stage: "not_started" | "revising" | "revised" | "test_ready";
  notes: string;
  flagged: boolean;
  starred: boolean;
  targetWeek: number;
  chapterId: string;
};

type SessionRecord = { minutes: number; focus: string; completedAt: Date; notes?: string | null; difficulty?: "easy" | "okay" | "difficult" | "very_difficult" | null };
type MockRecord = { physics: number; chemistry: number; mathematics: number; total: number; attemptedAt: Date };
type FlashcardRecord = { cardId: string; status: "known" | "shaky" };

export type StudentStudySnapshot = {
  profile: { dailyGoalMinutes: number; targetExamDate: Date } | null;
  chapters: ChapterRecord[];
  sessions: SessionRecord[];
  mocks: MockRecord[];
  flashcards: FlashcardRecord[];
};

const stagePoints = { not_started: 0, revising: 1, revised: 2, test_ready: 3 } as const;

export function buildStudentStudyContext(snapshot: StudentStudySnapshot, now = new Date()) {
  const target = snapshot.profile?.targetExamDate ?? new Date("2027-01-21T00:00:00Z");
  const daysLeft = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86_400_000));
  const dailyGoal = snapshot.profile?.dailyGoalMinutes ?? 180;
  const subjectSummary = (["Physics", "Chemistry", "Mathematics"] as const).map((subject) => {
    const chapters = snapshot.chapters.filter((chapter) => chapter.subject === subject);
    const score = chapters.length === 0 ? 0 : Math.round(chapters.reduce((sum, chapter) => sum + stagePoints[chapter.stage], 0) / (chapters.length * 3) * 100);
    return `${subject}: ${score}% mastery across ${chapters.length} saved chapters`;
  }).join("; ");
  const today = now.toDateString();
  const todayMinutes = snapshot.sessions.filter((session) => new Date(session.completedAt).toDateString() === today).reduce((sum, session) => sum + session.minutes, 0);
  const recentMocks = [...snapshot.mocks].sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime());
  const latestMock = recentMocks[0] ? `Latest mock: ${recentMocks[0].total}/300 (Physics ${recentMocks[0].physics}, Chemistry ${recentMocks[0].chemistry}, Mathematics ${recentMocks[0].mathematics}).` : "No saved mock attempts yet.";
  const flagged = snapshot.chapters.filter((chapter) => chapter.flagged).map((chapter) => chapter.chapterId).join(", ") || "none";
  const notes = snapshot.chapters.filter((chapter) => chapter.notes.trim()).map((chapter) => `${chapter.chapterId}: ${chapter.notes}`).join(" | ") || "No mistake notes logged.";
  const reflections = snapshot.sessions.filter((session) => session.difficulty || session.notes?.trim()).slice(0, 5).map((session) => `${session.focus}: ${session.difficulty ?? "unrated"}${session.notes?.trim() ? `; note: ${session.notes}` : ""}`).join(" | ") || "No focus reflections logged.";
  const shaky = snapshot.flashcards.filter((card) => card.status === "shaky").length;

  return `Authenticated JEE student. Target date: ${target.toISOString().slice(0, 10)}; ${daysLeft} days remain. Daily goal: ${dailyGoal} minutes; today completed: ${todayMinutes} minutes. ${subjectSummary}. ${latestMock} Flagged chapters: ${flagged}. Mistake notes: ${notes}. Focus reflections: ${reflections}. Flashcard records: ${snapshot.flashcards.length}; shaky cards: ${shaky}. Use only this saved record; when it is sparse, say what the student should log next.`;
}

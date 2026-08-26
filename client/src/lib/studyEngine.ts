import { stageMeta, type Chapter, type Subject } from "@/data/jee";

export type PlannerIntensity = "steady" | "focused" | "sprint";
export type PlanItem = { id: string; subject: Subject | "Revision"; chapterId?: string; chapter: string; task: string; minutes: number; reason: string; completed?: boolean };
export type MockScore = { physics: number; chemistry: number; mathematics: number; total: number; attemptedAt: Date };
export type StudySession = { minutes: number; focus: string; completedAt: Date; notes?: string | null; difficulty?: "easy" | "okay" | "difficult" | "very_difficult" | null };

const mockKey: Record<Subject, "physics" | "chemistry" | "mathematics"> = { Physics: "physics", Chemistry: "chemistry", Mathematics: "mathematics" };

function subjectScore(subject: Subject, mocks: MockScore[]) {
  if (!mocks.length) return 55;
  return mocks.reduce((sum, mock) => sum + mock[mockKey[subject]], 0) / mocks.length;
}

export function buildRevisionQueue(chapters: Chapter[], mocks: MockScore[], reviews: Record<string, "known" | "shaky">, cardChapterIds: Record<string, string>, sessions: StudySession[] = []) {
  const shakyByChapter = Object.entries(reviews).reduce<Record<string, number>>((acc, [cardId, status]) => {
    if (status === "shaky" && cardChapterIds[cardId]) acc[cardChapterIds[cardId]] = (acc[cardChapterIds[cardId]] ?? 0) + 1;
    return acc;
  }, {});
  const week = Math.max(1, Math.ceil((new Date().getMonth() + 1) / 1));
  return chapters.map((chapter) => {
    const recentSession = sessions.filter((session) => session.focus.toLowerCase().includes(chapter.title.toLowerCase())).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
    const daysSinceRevision = recentSession ? Math.floor((Date.now() - new Date(recentSession.completedAt).getTime()) / 86400000) : null;
    const stagePenalty = 3 - stageMeta[chapter.stage].value;
    const mockPenalty = (100 - subjectScore(chapter.subject, mocks)) / 18;
    const targetPenalty = chapter.targetWeek <= week ? 2 : 0;
    const recencyPenalty = daysSinceRevision === null ? 1 : daysSinceRevision >= 7 ? 2 : 0;
    const difficultyPenalty = recentSession?.difficulty === "very_difficult" ? 3 : recentSession?.difficulty === "difficult" ? 2 : 0;
    const shaky = shakyByChapter[chapter.id] ?? 0;
    const priority = stagePenalty + mockPenalty + targetPenalty + recencyPenalty + difficultyPenalty + shaky * 2 + (chapter.flagged ? 4 : 0);
    const reason = chapter.flagged ? "Flagged by you for targeted repair." : shaky > 0 ? `${shaky} shaky formula${shaky > 1 ? "s" : ""} need retrieval practice.` : difficultyPenalty > 0 ? `Your latest focus reflection marked this chapter ${recentSession?.difficulty?.replace("_", " ")}.` : daysSinceRevision !== null && daysSinceRevision >= 7 ? `No focused revision logged for ${daysSinceRevision} days.` : chapter.targetWeek <= week ? "Target week is active or overdue." : `${stageMeta[chapter.stage].label} stage needs another revision touch.`;
    return { chapter, priority, reason, shaky };
  }).sort((a, b) => b.priority - a.priority).slice(0, 6);
}

export function buildDailyPlan(input: { chapters: Chapter[]; mocks: MockScore[]; reviews: Record<string, "known" | "shaky">; cardChapterIds: Record<string, string>; sessions?: StudySession[]; availableMinutes: number; preferredSubjects: Subject[]; intensity: PlannerIntensity }) {
  const queue = buildRevisionQueue(input.chapters, input.mocks, input.reviews, input.cardChapterIds, input.sessions);
  const preferred = input.preferredSubjects.length ? input.preferredSubjects : (["Physics", "Chemistry", "Mathematics"] as Subject[]);
  const focused = queue.filter((item) => preferred.includes(item.chapter.subject));
  const pool = focused.length ? focused : queue;
  const total = Math.max(30, input.availableMinutes);
  const blocks = input.intensity === "sprint" ? 4 : input.intensity === "focused" ? 3 : 3;
  const workMinutes = Math.max(25, Math.floor((total - (blocks - 1) * 10) / blocks));
  const selected = Array.from({ length: blocks }, (_, index) => pool[index % Math.max(pool.length, 1)]).filter(Boolean);
  const plan: PlanItem[] = selected.map((entry, index) => ({
    id: `plan-${entry.chapter.id}-${index}`,
    subject: entry.chapter.subject,
    chapterId: entry.chapter.id,
    chapter: entry.chapter.title,
    task: index === 0 ? "Concept reset + formula recall" : index === 1 ? "Timed PYQ practice" : "Mistake review + self-check",
    minutes: workMinutes,
    reason: entry.reason,
  }));
  const used = plan.reduce((sum, item) => sum + item.minutes, 0);
  if (total - used >= 20) plan.push({ id: "plan-revision", subject: "Revision", chapter: "Formula recovery", task: "Review due and shaky formula cards", minutes: total - used, reason: "Protect retention before ending the day." });
  return plan;
}

export function calculateReadiness(chapters: Chapter[], mocks: MockScore[], reviews: Record<string, "known" | "shaky">, sessions: StudySession[]) {
  const mastery = chapters.length ? chapters.reduce((sum, chapter) => sum + stageMeta[chapter.stage].value, 0) / (chapters.length * 3) : 0;
  const mockScore = mocks.length ? mocks.reduce((sum, mock) => sum + mock.total, 0) / (mocks.length * 300) : 0;
  const consistency = Math.min(sessions.filter((session) => Date.now() - new Date(session.completedAt).getTime() < 7 * 86400000).reduce((sum, session) => sum + session.minutes, 0) / 900, 1);
  const cards = Object.values(reviews);
  const retention = cards.length ? cards.filter((status) => status === "known").length / cards.length : 0.5;
  return Math.round((mastery * 0.4 + mockScore * 0.3 + consistency * 0.17 + retention * 0.13) * 100);
}

export function buildSmartAlerts(chapters: Chapter[], mocks: MockScore[], sessions: StudySession[]) {
  const alerts: { title: string; body: string; tone: "amber" | "pink" | "lime" }[] = [];
  const due = chapters.filter((chapter) => chapter.flagged || chapter.stage === "revising").slice(0, 2);
  if (due.length) alerts.push({ title: "Revision signal", body: `${due.map((chapter) => chapter.title).join(" and ")} need a deliberate touch before your next mock.`, tone: "amber" });
  const recent = mocks.slice(-2);
  if (recent.length === 2 && recent[1].physics < recent[0].physics) alerts.push({ title: "Physics trend", body: "Your latest Physics section fell versus the prior mock. Repair a weak Physics chapter before adding new content.", tone: "pink" });
  const today = sessions.some((session) => new Date(session.completedAt).toDateString() === new Date().toDateString());
  if (!today) alerts.push({ title: "Gentle reset", body: "No focus block logged yet today. Start with one short, specific study task.", tone: "lime" });
  return alerts.slice(0, 3);
}

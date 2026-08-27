import { useAuth } from "@/_core/hooks/useAuth";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { FormulaFilterBar } from "@/components/FormulaFilterBar";
import { ChapterDetail } from "@/components/ChapterDetail";
import { WeakTopicReport } from "@/components/WeakTopicReport";
import { TodayCommandCenter } from "@/components/TodayCommandCenter";
import { FocusMode } from "@/components/FocusMode";
import { PracticeStudio } from "@/components/PracticeStudio";
import { MockPostMortem } from "@/components/MockPostMortem";
import { ProgressSignals } from "@/components/ProgressSignals";
import { MarksLossAnalysis } from "@/components/MarksLossAnalysis";
import { startLogin } from "@/const";
import { flashcards, initialChapters, stageMeta, type Chapter, type Stage, type Subject } from "@/data/jee";
import { trpc } from "@/lib/trpc";
import { buildDailyPlan, buildRevisionQueue, buildSmartAlerts, calculateReadiness, type PlanItem, type PlannerIntensity } from "@/lib/studyEngine";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BookMarked,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Plus,
  Sparkles,
  StickyNote,
  Target,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Section = "today" | "overview" | "syllabus" | "analytics" | "formulas" | "practice";
type Modal = "session" | "mock" | null;
const targetDateValues = ["2027-01-21", "2027-01-22", "2027-01-23", "2027-01-24", "2027-01-28"] as const;
type TargetExamDate = (typeof targetDateValues)[number];
type ExamDateOption = { id: TargetExamDate; label: string; date: Date };
const jeeMainJanuaryDateOptions: ExamDateOption[] = [
  { id: "2027-01-21", label: "21 Jan", date: new Date("2027-01-21T12:00:00.000Z") },
  { id: "2027-01-22", label: "22 Jan", date: new Date("2027-01-22T12:00:00.000Z") },
  { id: "2027-01-23", label: "23 Jan", date: new Date("2027-01-23T12:00:00.000Z") },
  { id: "2027-01-24", label: "24 Jan", date: new Date("2027-01-24T12:00:00.000Z") },
  { id: "2027-01-28", label: "28 Jan", date: new Date("2027-01-28T12:00:00.000Z") },
];

type Session = { id: number; minutes: number; focus: string; completedAt: Date; notes?: string | null; difficulty?: "easy" | "okay" | "difficult" | "very_difficult" | null };
type Mock = { id: number; physics: number; chemistry: number; mathematics: number; total: number; attemptedAt: Date };

const demoSessions: Session[] = [
  { id: 1, minutes: 135, focus: "Rotational Motion PYQs", completedAt: new Date() },
  { id: 2, minutes: 170, focus: "Chemical Equilibrium", completedAt: new Date(Date.now() - 86400000) },
  { id: 3, minutes: 150, focus: "Definite Integration", completedAt: new Date(Date.now() - 2 * 86400000) },
  { id: 4, minutes: 95, focus: "Electrostatics revision", completedAt: new Date(Date.now() - 3 * 86400000) },
];

const demoMocks: Mock[] = [
  { id: 1, physics: 46, chemistry: 54, mathematics: 38, total: 138, attemptedAt: new Date(Date.now() - 21 * 86400000) },
  { id: 2, physics: 52, chemistry: 57, mathematics: 41, total: 150, attemptedAt: new Date(Date.now() - 14 * 86400000) },
  { id: 3, physics: 56, chemistry: 61, mathematics: 45, total: 162, attemptedAt: new Date(Date.now() - 7 * 86400000) },
];

const navigation = [
  { id: "today" as const, label: "Today", icon: Sparkles },
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
  { id: "syllabus" as const, label: "Syllabus", icon: BookOpen },
  { id: "analytics" as const, label: "Mock analytics", icon: TrendingUp },
  { id: "formulas" as const, label: "Formula lab", icon: BookMarked },
  { id: "practice" as const, label: "Practice", icon: BrainCircuit },
];

const stageOrder: Stage[] = ["not_started", "revising", "revised", "test_ready"];

function subjectTint(subject: Subject) {
  if (subject === "Physics") return { solid: "#89563C", wash: "#F4E6DA", label: "P" };
  if (subject === "Chemistry") return { solid: "#C58A42", wash: "#FAEDDA", label: "C" };
  return { solid: "#5E6253", wash: "#E7E9DF", label: "M" };
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(date);
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [section, setSection] = useState<Section>(() => {
    const requested = new URLSearchParams(window.location.search).get("view") as Section | null;
    return requested && navigation.some((item) => item.id === requested) ? requested : "today";
  });
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [sessions, setSessions] = useState<Session[]>(demoSessions);
  const [mocks, setMocks] = useState<Mock[]>(demoMocks);
  const [reviews, setReviews] = useState<Record<string, "known" | "shaky">>({ "p-rot-1": "shaky", "c-thermo-1": "known" });
  const [reviewSchedule, setReviewSchedule] = useState<Record<string, { intervalDays: number; nextReviewAt: Date }>>({
    "p-rot-1": { intervalDays: 1, nextReviewAt: new Date() },
    "c-thermo-1": { intervalDays: 5, nextReviewAt: new Date(Date.now() + 5 * 86400000) },
  });
  const [modal, setModal] = useState<Modal>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chapterSearch, setChapterSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<Subject | "All">("All");
  const [starredOnly, setStarredOnly] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(() => {
    const requestedChapter = new URLSearchParams(window.location.search).get("chapter");
    if (requestedChapter === "first") return initialChapters[0] ?? null;
    return initialChapters.find((chapter) => chapter.id === requestedChapter) ?? null;
  });
  const [cardChapterFilter, setCardChapterFilter] = useState("All chapters");
  const [shakyOnly, setShakyOnly] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [dailyGoal, setDailyGoal] = useState(180);
  const [targetDateId, setTargetDateId] = useState<TargetExamDate>("2027-01-21");
  const [todayPlan, setTodayPlan] = useState<PlanItem[]>([]);
  const [planMeta, setPlanMeta] = useState<{ availableMinutes: number; intensity: PlannerIntensity; preferredSubjects: Subject[] }>({ availableMinutes: 300, intensity: "focused", preferredSubjects: ["Physics", "Chemistry", "Mathematics"] });
  const [focusTask, setFocusTask] = useState<PlanItem | null>(null);

  const serverDashboard = trpc.student.dashboard.useQuery(undefined, { enabled: isAuthenticated });
  const saveChapter = trpc.student.saveChapter.useMutation();
  const addSession = trpc.student.addSession.useMutation();
  const addMock = trpc.student.addMock.useMutation();
  const reviewFlashcard = trpc.student.reviewFlashcard.useMutation();
  const saveDailyPlan = trpc.student.saveDailyPlan.useMutation();
  const saveExamDate = trpc.student.setExamDate.useMutation();
  const chat = trpc.ai.chat.useMutation({
    onSuccess: (reply) => setChatMessages((messages) => [...messages, { role: "assistant", content: reply }]),
    onError: () => {
      setChatMessages((messages) => [...messages, { role: "assistant", content: "I could not reach JEE Copilot right now. Please retry in a moment." }]);
    },
  });
  const insight = trpc.ai.insight.useMutation({
    onSuccess: setAiInsight,
    onError: () => setAiInsight("I could not generate a personalized insight right now. Your dashboard data is still saved and ready for the next try."),
  });

  useEffect(() => {
    const saved = serverDashboard.data;
    if (!saved) return;

    if (saved.profile?.dailyGoalMinutes) setDailyGoal(saved.profile.dailyGoalMinutes);
    if (saved.profile?.targetExamDate) {
      const savedTargetDate = new Date(saved.profile.targetExamDate).toISOString().slice(0, 10);
      if ((targetDateValues as readonly string[]).includes(savedTargetDate)) setTargetDateId(savedTargetDate as TargetExamDate);
    }
    if (saved.chapters.length > 0) {
      setChapters((items) => items.map((chapter) => {
        const persisted = saved.chapters.find((item) => item.chapterId === chapter.id);
        return persisted ? {
          ...chapter,
          stage: persisted.stage,
          targetWeek: persisted.targetWeek,
          notes: persisted.notes,
          starred: persisted.starred,
          flagged: persisted.flagged,
        } : chapter;
      }));
    }
    if (saved.sessions.length > 0) {
      setSessions(saved.sessions.map((item) => ({ ...item, completedAt: new Date(item.completedAt) })));
    }
    if (saved.mocks.length > 0) {
      setMocks(saved.mocks.map((item) => ({ ...item, attemptedAt: new Date(item.attemptedAt) })));
    }
    if (saved.flashcards.length > 0) {
      setReviews(Object.fromEntries(saved.flashcards.map((item) => [item.cardId, item.status])));
      setReviewSchedule(Object.fromEntries(saved.flashcards.map((item) => [item.cardId, { intervalDays: item.intervalDays ?? 1, nextReviewAt: item.nextReviewAt ? new Date(item.nextReviewAt) : new Date() }])));
    }
    if (saved.dailyPlan?.planItems) {
      try {
        setTodayPlan(JSON.parse(saved.dailyPlan.planItems) as PlanItem[]);
        setPlanMeta({ availableMinutes: saved.dailyPlan.availableMinutes, intensity: saved.dailyPlan.intensity, preferredSubjects: JSON.parse(saved.dailyPlan.preferredSubjects) as Subject[] });
      } catch { setTodayPlan([]); }
    }
  }, [serverDashboard.data]);

  const selectedExamDate = jeeMainJanuaryDateOptions.find((option) => option.id === targetDateId) ?? jeeMainJanuaryDateOptions[0];
  const daysLeft = Math.max(0, Math.ceil((selectedExamDate.date.getTime() - Date.now()) / 86400000));
  const daySessions = sessions.filter((session) => session.completedAt.toDateString() === new Date().toDateString());
  const todayMinutes = daySessions.reduce((total, session) => total + session.minutes, 0);
  const weeklyMinutes = sessions
    .filter((session) => Date.now() - session.completedAt.getTime() < 7 * 86400000)
    .reduce((total, session) => total + session.minutes, 0);

  const heatmapDays = useMemo(() => Array.from({ length: 28 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (27 - index));
    const minutes = sessions
      .filter((session) => session.completedAt.toDateString() === date.toDateString())
      .reduce((total, session) => total + session.minutes, 0);
    return { date, minutes };
  }), [sessions]);

  const streak = useMemo(() => {
    let count = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (sessions.some((session) => session.completedAt.toDateString() === cursor.toDateString())) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [sessions]);

  const statistics = useMemo(() => {
    const bySubject = (["Physics", "Chemistry", "Mathematics"] as Subject[]).map((subject) => {
      const items = chapters.filter((chapter) => chapter.subject === subject);
      const score = Math.round(items.reduce((sum, chapter) => sum + stageMeta[chapter.stage].value, 0) / (items.length * 3) * 100);
      return { subject, score, chapters: items };
    });
    const overall = Math.round(bySubject.reduce((sum, item) => sum + item.score, 0) / bySubject.length);
    return { bySubject, overall };
  }, [chapters]);

  const filteredChapters = chapters.filter((chapter) => {
    const matchesSearch = chapter.title.toLowerCase().includes(chapterSearch.toLowerCase());
    const matchesSubject = subjectFilter === "All" || chapter.subject === subjectFilter;
    return matchesSearch && matchesSubject && (!starredOnly || chapter.starred);
  });

  const filteredCards = flashcards.filter((card) => {
    const matchesSubject = subjectFilter === "All" || card.subject === subjectFilter;
    const matchesChapter = cardChapterFilter === "All chapters" || card.chapter === cardChapterFilter;
    const matchesReview = !shakyOnly || reviews[card.id] === "shaky";
    return matchesSubject && matchesChapter && matchesReview;
  });
  const shownCard = filteredCards.length > 0 ? filteredCards[activeCard % filteredCards.length] : flashcards[0];
  const currentMock = mocks[mocks.length - 1];
  const bestMock = mocks.reduce((best, mock) => Math.max(best, mock.total), 0);
  const weakSubject = [...statistics.bySubject].sort((a, b) => a.score - b.score)[0];
  const mockKeyBySubject: Record<Subject, "physics" | "chemistry" | "mathematics"> = { Physics: "physics", Chemistry: "chemistry", Mathematics: "mathematics" };
  const weakMockSubject = (["Physics", "Chemistry", "Mathematics"] as Subject[])
    .map((subject) => ({ subject, average: mocks.length ? mocks.reduce((sum, mock) => sum + mock[mockKeyBySubject[subject]], 0) / mocks.length : 100 }))
    .sort((a, b) => a.average - b.average)[0].subject;
  const nextChapter = chapters.find((chapter) => chapter.flagged) ?? chapters.find((chapter) => chapter.stage === "revising") ?? chapters[0];
  const weakTopic = chapters
    .filter((chapter) => chapter.subject === weakMockSubject && (chapter.flagged || chapter.stage === "not_started" || chapter.stage === "revising"))
    .sort((a, b) => Number(b.flagged) - Number(a.flagged) || stageMeta[a.stage].value - stageMeta[b.stage].value)[0] ?? nextChapter;

  const chartData = mocks.map((mock, index) => ({ attempt: `Mock ${index + 1}`, score: mock.total, physics: mock.physics, chemistry: mock.chemistry, mathematics: mock.mathematics }));
  const radarData = statistics.bySubject.map((item) => ({ subject: item.subject.slice(0, 4), mastery: item.score }));
  const cardChapterIds = useMemo(() => Object.fromEntries(flashcards.map((card) => [card.id, card.chapterId])), []);
  const revisionQueue = useMemo(() => buildRevisionQueue(chapters, mocks, reviews, cardChapterIds, sessions), [chapters, mocks, reviews, cardChapterIds, sessions]);
  const readiness = useMemo(() => calculateReadiness(chapters, mocks, reviews, sessions), [chapters, mocks, reviews, sessions]);
  const smartAlerts = useMemo(() => buildSmartAlerts(chapters, mocks, sessions), [chapters, mocks, sessions]);
  const reviewBuckets = useMemo(() => {
    const now = Date.now();
    return Object.entries(reviews).reduce((buckets, [cardId, status]) => {
      const schedule = reviewSchedule[cardId];
      if (!schedule || schedule.nextReviewAt.getTime() <= now) buckets.due += 1;
      else if (schedule.nextReviewAt.getTime() <= now + 3 * 86400000) buckets.soon += 1;
      else if (status === "known" && schedule.intervalDays >= 14) buckets.mastered += 1;
      else buckets.later += 1;
      return buckets;
    }, { due: 0, soon: 0, later: 0, mastered: 0 });
  }, [reviewSchedule, reviews]);

  useEffect(() => {
    if (todayPlan.length > 0) return;
    setTodayPlan(buildDailyPlan({ chapters, mocks, reviews, cardChapterIds, sessions, availableMinutes: 300, preferredSubjects: ["Physics", "Chemistry", "Mathematics"], intensity: "focused" }));
  }, [cardChapterIds, chapters, mocks, reviews, todayPlan.length]);

  function generateTodayPlan(availableMinutes: number, intensity: PlannerIntensity, preferredSubjects: Subject[]) {
    const plan = buildDailyPlan({ chapters, mocks, reviews, cardChapterIds, sessions, availableMinutes, preferredSubjects, intensity });
    setTodayPlan(plan);
    setPlanMeta({ availableMinutes, intensity, preferredSubjects });
    if (isAuthenticated) saveDailyPlan.mutate({ availableMinutes, intensity, preferredSubjects, items: plan });
    toast.success("A data-derived study plan is ready.");
  }

  function togglePlanTask(id: string) {
    const updated = todayPlan.map((item) => item.id === id ? { ...item, completed: !item.completed } : item);
    setTodayPlan(updated);
    if (isAuthenticated) saveDailyPlan.mutate({ ...planMeta, items: updated });
  }

  function updatePlanTask(id: string, patch: Partial<Pick<PlanItem, "task" | "minutes">>) {
    const updated = todayPlan.map((item) => item.id === id ? { ...item, ...patch } : item);
    setTodayPlan(updated);
    if (isAuthenticated) saveDailyPlan.mutate({ ...planMeta, items: updated });
  }

  function chooseExamDate(targetDate: TargetExamDate) {
    const selected = jeeMainJanuaryDateOptions.find((option) => option.id === targetDate);
    if (!selected) return;
    setTargetDateId(targetDate);
    if (isAuthenticated) saveExamDate.mutate({ targetDate });
    toast.success(`Your JEE Main target date is set to ${selected.label} 2027.`);
  }

  function finishFocus(notes: string, difficulty: "easy" | "okay" | "difficult" | "very_difficult") {
    if (!focusTask) return;
    const session = { id: Date.now(), minutes: focusTask.minutes, focus: `${focusTask.chapter}: ${focusTask.task}`, notes, difficulty, completedAt: new Date() };
    setSessions((items) => [session, ...items]);
    if (isAuthenticated) addSession.mutate({ minutes: session.minutes, focus: session.focus, completedAt: session.completedAt, notes, difficulty });
    setTodayPlan((items) => items.map((item) => item.id === focusTask.id ? { ...item, completed: true } : item));
    setFocusTask(null);
    toast.success("Focus session saved. Your next recommendation will use this reflection.");
  }

  function persistChapter(chapter: Chapter) {
    if (!isAuthenticated) return;
    saveChapter.mutate({
      chapterId: chapter.id,
      subject: chapter.subject,
      stage: chapter.stage,
      targetWeek: chapter.targetWeek,
      notes: chapter.notes ?? "",
      starred: Boolean(chapter.starred),
      flagged: Boolean(chapter.flagged),
    });
  }

  function updateChapter(id: string, patch: Partial<Chapter>) {
    setChapters((items) => items.map((chapter) => {
      if (chapter.id !== id) return chapter;
      const updated = { ...chapter, ...patch };
      persistChapter(updated);
      return updated;
    }));
  }

  function advanceChapter(chapter: Chapter) {
    const next = stageOrder[(stageOrder.indexOf(chapter.stage) + 1) % stageOrder.length];
    updateChapter(chapter.id, { stage: next });
    toast.success(`${chapter.title} is now ${stageMeta[next].label.toLowerCase()}.`);
  }

  function addFocusSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const minutes = Number(form.get("minutes"));
    const focus = String(form.get("focus") || "Focused revision");
    const session = { id: Date.now(), minutes, focus, completedAt: new Date() };
    setSessions((items) => [session, ...items]);
    if (isAuthenticated) addSession.mutate({ minutes, focus, completedAt: session.completedAt });
    setModal(null);
    toast.success(`${minutes} focused minutes added to your streak.`);
  }

  function addNewMock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const physics = Number(form.get("physics"));
    const chemistry = Number(form.get("chemistry"));
    const mathematics = Number(form.get("mathematics"));
    const mock = { id: Date.now(), physics, chemistry, mathematics, total: physics + chemistry + mathematics, attemptedAt: new Date() };
    setMocks((items) => [...items, mock]);
    if (isAuthenticated) addMock.mutate({ physics, chemistry, mathematics, attemptedAt: mock.attemptedAt });
    setModal(null);
    toast.success(`Mock score logged: ${mock.total}/300.`);
  }

  function markCard(status: "known" | "shaky") {
    if (!shownCard) return;
    setReviews((items) => ({ ...items, [shownCard.id]: status }));
    setReviewSchedule((items) => {
      const intervalDays = status === "known" ? Math.min(Math.max(items[shownCard.id]?.intervalDays ?? 2, 2) * 2, 21) : 1;
      return { ...items, [shownCard.id]: { intervalDays, nextReviewAt: new Date(Date.now() + intervalDays * 86400000) } };
    });
    if (isAuthenticated) reviewFlashcard.mutate({ cardId: shownCard.id, status });
    setFlipped(false);
    setActiveCard((index) => index + 1);
  }

  function sendMessage(message: string) {
    setChatMessages((messages) => [...messages, { role: "user", content: message }]);
    if (!isAuthenticated) {
      setChatMessages((messages) => [...messages, { role: "assistant", content: "Sign in to unlock advice grounded in your saved study sessions, chapter progress, mock scores, and formula reviews." }]);
      return;
    }
    chat.mutate({ message });
  }

  function requestInsight(kind: "next action" | "coach note" | "mistake-pattern analysis") {
    setAiInsight("");
    if (!isAuthenticated) {
      setAiInsight("Sign in to generate insights from your own saved study record.");
      return;
    }
    insight.mutate({ kind });
  }

  return (
    <div className="min-h-screen bg-[#08090F] text-[#F6F4FF]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[258px] flex-col border-r border-white/10 bg-[#0D0F18] px-5 py-7 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="grid size-10 place-items-center rounded-2xl bg-[#C7FF3C] text-[#11121B] shadow-[0_10px_25px_rgba(199,255,60,.18)]"><GraduationCap className="size-5" /></div>
          <div><p className="jee-title text-xl leading-none text-white">Momentum</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#C7FF3C]">JEE study OS</p></div>
        </div>
        <nav className="mt-12 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return <button key={item.id} onClick={() => setSection(item.id)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${active ? "bg-[#C7FF3C] text-[#11121B] shadow-[0_10px_22px_rgba(199,255,60,.15)]" : "text-white/55 hover:bg-white/[.06] hover:text-white"}`}><Icon className="size-[18px]" />{item.label}</button>;
          })}
        </nav>
        <div className="mt-auto rounded-[1.5rem] border border-white/10 bg-white/[.04] p-4">
          <div className="flex items-center gap-2 text-white"><Flame className="size-4 fill-[#FF4FA7] text-[#FF4FA7]" /><span className="text-sm font-bold">{streak}-day rhythm</span></div>
          <p className="mt-2 text-xs leading-5 text-white/45">Build a clean signal for your future self today.</p>
          <button onClick={() => setModal("session")} className="mt-4 w-full rounded-xl bg-[#FF4FA7] py-2 text-xs font-bold text-white transition-transform active:scale-[0.97]">Log a session</button>
        </div>
        <div className="mt-5 flex items-center gap-3 px-2 text-sm"><div className="grid size-9 place-items-center rounded-full bg-[#63C8FF] font-bold text-[#11121B]">{user?.name?.charAt(0).toUpperCase() ?? "A"}</div><div className="min-w-0"><p className="truncate font-bold text-white">{user?.name ?? "Demo aspirant"}</p><p className="truncate text-xs text-white/40">{isAuthenticated ? "Synced workspace" : "Local demo workspace"}</p></div></div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#08090F]/90 px-4 py-3 backdrop-blur lg:ml-[258px] lg:border-none lg:bg-transparent lg:px-9 lg:pt-7">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden"><button onClick={() => setMenuOpen(!menuOpen)} className="grid size-10 place-items-center rounded-xl bg-white/10 text-white shadow-sm"><Menu className="size-5" /></button><div><p className="jee-title text-xl text-white">Momentum</p><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#C7FF3C]">JEE study OS</p></div></div>
          <div className="hidden lg:block"><p className="today-kicker text-[#C7FF3C]">Your preparation space</p><h1 className="jee-title mt-1 text-3xl text-white">Good afternoon, {user?.name?.split(" ")[0] ?? "Aspirant"}.</h1></div>
          <div className="flex items-center gap-3"><div className="hidden rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-semibold text-white/60 sm:flex sm:items-center sm:gap-2"><CalendarDays className="size-3.5" />{formatDay(new Date())}</div>{!isAuthenticated && <button onClick={() => startLogin()} className="rounded-full bg-[#C7FF3C] px-4 py-2.5 text-xs font-bold text-[#11121B] shadow-sm transition-transform active:scale-[0.97]">Save my progress</button>}</div>
        </div>
        {menuOpen && <div className="absolute left-4 right-4 top-[68px] rounded-2xl border border-white/10 bg-[#121421] p-2 shadow-xl lg:hidden">{navigation.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => { setSection(item.id); setMenuOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${section === item.id ? "bg-[#C7FF3C] text-[#11121B]" : "text-white/60"}`}><Icon className="size-4" />{item.label}</button>; })}</div>}
      </header>

      <main className="mx-auto max-w-[1500px] px-4 pb-28 pt-5 lg:ml-[258px] lg:px-9 lg:pb-12 lg:pt-4">
        {section === "today" && <div className="space-y-6"><TodayCommandCenter plan={todayPlan} readiness={readiness} queue={revisionQueue} alerts={smartAlerts} weeklyMinutes={weeklyMinutes} sessionsCount={sessions.length} reviewBuckets={reviewBuckets} onGenerate={generateTodayPlan} onStartFocus={setFocusTask} onToggleTask={togglePlanTask} onUpdateTask={updatePlanTask} /><ProgressSignals chapters={chapters} mocks={mocks} sessions={sessions} reviews={reviews} streak={streak} /></div>}
        {section === "overview" && <Overview
          daysLeft={daysLeft} examDate={selectedExamDate} examDateOptions={jeeMainJanuaryDateOptions} dailyGoal={dailyGoal} todayMinutes={todayMinutes} weeklyMinutes={weeklyMinutes} streak={streak} heatmapDays={heatmapDays} statistics={statistics} nextChapter={nextChapter} sessions={sessions} chartData={chartData} radarData={radarData} aiInsight={aiInsight} insightLoading={insight.isPending} chatMessages={chatMessages} chatLoading={chat.isPending} onAddSession={() => setModal("session")} onAddMock={() => setModal("mock")} onAdvance={() => advanceChapter(nextChapter)} onSelectExamDate={chooseExamDate} onSendChat={sendMessage} onAskInsight={requestInsight} onOpenSyllabus={() => setSection("syllabus")} />}
        {section === "syllabus" && <Syllabus chapters={filteredChapters} search={chapterSearch} setSearch={setChapterSearch} subject={subjectFilter} setSubject={setSubjectFilter} starredOnly={starredOnly} setStarredOnly={setStarredOnly} onUpdate={updateChapter} onAdvance={advanceChapter} onOpenChapter={setSelectedChapter} overall={statistics.overall} />}
        {section === "analytics" && <div className="space-y-6"><Analytics chartData={chartData} radarData={radarData} currentMock={currentMock} bestMock={bestMock} weakSubject={weakSubject} weakTopic={weakTopic} onAddMock={() => setModal("mock")} onAskInsight={() => requestInsight("mistake-pattern analysis")} aiInsight={aiInsight} loading={insight.isPending} /><WeakTopicReport topic={weakTopic} /><MarksLossAnalysis mocks={mocks} /><MockPostMortem total={currentMock.total} mockCount={mocks.length} /></div>}
        {section === "formulas" && <div className="space-y-4"><FormulaFilterBar subject={subjectFilter} setSubject={(value: Subject | "All") => { setSubjectFilter(value); setCardChapterFilter("All chapters"); setActiveCard(0); }} chapterFilter={cardChapterFilter} setChapterFilter={(value: string) => { setCardChapterFilter(value); setActiveCard(0); }} shakyOnly={shakyOnly} setShakyOnly={(value: boolean) => { setShakyOnly(value); setActiveCard(0); }} chapterOptions={Array.from(new Set(flashcards.filter((card) => subjectFilter === "All" || card.subject === subjectFilter).map((card) => card.chapter)))} /><FormulaLab card={shownCard} total={filteredCards.length} index={activeCard % Math.max(filteredCards.length, 1)} flipped={flipped} setFlipped={setFlipped} subject={subjectFilter} setSubject={(value) => { setSubjectFilter(value); setCardChapterFilter("All chapters"); setActiveCard(0); }} reviews={reviews} onMark={markCard} onShuffle={() => { if (filteredCards.length) { setActiveCard(Math.floor(Math.random() * filteredCards.length)); setFlipped(false); } }} /></div>}
        {section === "practice" && <PracticeStudio chapters={chapters} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-white/10 bg-[#0D0F18]/95 px-2 py-2 backdrop-blur lg:hidden">
        {navigation.map((item) => { const Icon = item.icon; const active = section === item.id; return <button key={item.id} onClick={() => setSection(item.id)} className={`flex min-w-[56px] flex-col items-center gap-1 rounded-xl py-1.5 text-[9px] font-bold ${active ? "text-[#C7FF3C]" : "text-white/40"}`}><Icon className={`size-[18px] ${active ? "fill-[#C7FF3C]/20" : ""}`} />{item.label.split(" ")[0]}</button>; })}
      </nav>

      {modal && <ModalForm modal={modal} onClose={() => setModal(null)} onSession={addFocusSession} onMock={addNewMock} />}
      {selectedChapter && <ChapterDetail chapter={selectedChapter} onClose={() => setSelectedChapter(null)} onUpdate={updateChapter} onAdvance={advanceChapter} />}
      {focusTask && <FocusMode task={focusTask} onClose={() => setFocusTask(null)} onFinish={finishFocus} />}
      {serverDashboard.isError && isAuthenticated && <p className="fixed bottom-20 right-4 z-40 rounded-xl bg-[#4D2A1D] px-4 py-3 text-xs text-white shadow-xl">Your local dashboard is ready; saved data will retry automatically.</p>}
    </div>
  );
}

function Overview(props: {
  daysLeft: number; examDate: ExamDateOption; examDateOptions: ExamDateOption[]; dailyGoal: number; todayMinutes: number; weeklyMinutes: number; streak: number; heatmapDays: { date: Date; minutes: number }[]; statistics: { bySubject: { subject: Subject; score: number; chapters: Chapter[] }[]; overall: number }; nextChapter: Chapter; sessions: Session[]; chartData: { attempt: string; score: number; physics: number; chemistry: number; mathematics: number }[]; radarData: { subject: string; mastery: number }[]; aiInsight: string; insightLoading: boolean; chatMessages: Message[]; chatLoading: boolean; onAddSession: () => void; onAddMock: () => void; onAdvance: () => void; onSelectExamDate: (targetDate: TargetExamDate) => void; onSendChat: (message: string) => void; onAskInsight: (kind: "next action" | "coach note" | "mistake-pattern analysis") => void; onOpenSyllabus: () => void;
}) {
  const goalPercent = Math.min(100, Math.round(props.todayMinutes / props.dailyGoal * 100));
  const phase = props.daysLeft > 200 ? 1 : props.daysLeft > 120 ? 2 : props.daysLeft > 55 ? 3 : 4;
  return <div className="space-y-6 lg:space-y-7">
    <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#4D2A1D] px-6 py-7 text-[#FFF8EC] shadow-[0_24px_50px_rgba(79,42,28,0.22)] sm:px-8 sm:py-8">
        <div className="absolute -right-10 -top-12 size-52 rounded-full border border-[#9F755D]/35" /><div className="absolute -bottom-16 right-28 size-44 rounded-full border border-[#9F755D]/25" />
        <div className="relative"><p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#F2CC8B]">JEE Main 2027 · selected slot {props.examDate.label}</p><div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1"><h2 className="jee-title text-6xl leading-none sm:text-7xl">{props.daysLeft}</h2><p className="mb-1 text-sm text-[#E8CDB0]">days left to make it count</p></div><p className="mt-5 max-w-md text-sm leading-6 text-[#EFDCCC]">Progress is not perfection. Build your score, one focused block and one honest mock at a time.</p><div className="mt-6 rounded-2xl border border-[#9A725D]/70 bg-black/10 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F2CC8B]">Choose your expected January session date</p><div className="mt-2 flex flex-wrap gap-1.5">{props.examDateOptions.map((option) => <button key={option.id} onClick={() => props.onSelectExamDate(option.id)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${option.id === props.examDate.id ? "bg-[#F1C47B] text-[#4D2A1D] shadow-sm" : "border border-[#A47A62] text-[#FFF8EC] hover:bg-white/10"}`}>{option.label}</button>)}</div><p className="mt-2 text-[10px] text-[#E8CDB0]">Confirm your allotted date with your NTA admit card when it is issued.</p></div><div className="mt-5 flex items-center gap-2"><button onClick={props.onAddSession} className="rounded-full bg-[#F1C47B] px-4 py-2.5 text-xs font-bold text-[#4D2A1D] transition-transform active:scale-[0.97]"><Plus className="mr-1 inline size-3.5" />Log focus</button><button onClick={props.onOpenSyllabus} className="rounded-full border border-[#9A725D] px-4 py-2.5 text-xs font-bold text-[#FFF8EC] transition-colors hover:bg-white/10">See syllabus</button></div></div>
      </div>
      <div className="jee-panel flex flex-col justify-between p-6"><div className="flex items-start justify-between"><div><p className="jee-kicker">Today’s focus</p><h2 className="jee-title mt-2 text-2xl">Your steady pace.</h2></div><div className="grid size-12 place-items-center rounded-2xl bg-[#F5E4CE] text-[#A26235]"><Target className="size-5" /></div></div><div className="mt-5 flex items-end justify-between"><div><p className="text-3xl font-bold tracking-tight">{props.todayMinutes}<span className="text-base font-medium text-[#AA8B78]"> / {props.dailyGoal} min</span></p><p className="mt-1 text-xs text-[#977665]">{props.weeklyMinutes} minutes this week</p></div><div className="grid size-20 place-items-center rounded-full" style={{ background: `conic-gradient(#C78A4B ${goalPercent * 3.6}deg, #F4E8DB 0deg)` }}><div className="grid size-14 place-items-center rounded-full bg-[#FFFDF9] text-xs font-bold">{goalPercent}%</div></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#F3E5D6]"><div className="h-full rounded-full bg-[#C78A4B] transition-all" style={{ width: `${goalPercent}%` }} /></div></div>
    </section>

    <section className="jee-panel p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="jee-kicker">Preparation route</p><h2 className="jee-title mt-1 text-2xl">Know your current season.</h2></div><span className="rounded-full bg-[#F5E4CE] px-3 py-1.5 text-xs font-bold text-[#865435]">Phase {phase} of 4</span></div><div className="relative mt-7 grid gap-4 md:grid-cols-4">{["Concept Revision", "PYQs + Tests", "Full Mocks", "Final Revision"].map((name, index) => { const active = index + 1 === phase; const complete = index + 1 < phase; return <div key={name} className="relative"><div className={`mb-3 grid size-8 place-items-center rounded-full text-xs font-bold ${active ? "bg-[#4D2A1D] text-white ring-4 ring-[#EFCB9D]/60" : complete ? "bg-[#C78A4B] text-white" : "bg-[#F0E4D8] text-[#9F806E]"}`}>{complete ? <Check className="size-4" /> : index + 1}</div>{active && <span className="absolute -top-5 left-0 text-[9px] font-bold uppercase tracking-wider text-[#9B5F3D]">You are here</span>}<p className="text-sm font-bold">{name}</p><p className="mt-1 text-xs text-[#9E7E6B]">{index === 0 ? "Build clarity" : index === 1 ? "Build accuracy" : index === 2 ? "Build stamina" : "Build calm"}</p>{index < 3 && <div className="absolute left-8 top-4 hidden h-px w-[calc(100%-1.5rem)] bg-[#E8D8C8] md:block" />}</div>; })}</div></section>

    <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr_0.85fr]"><div className="jee-panel p-6"><div className="flex items-start justify-between"><div><p className="jee-kicker">Syllabus pulse</p><h2 className="jee-title mt-1 text-2xl">{props.statistics.overall}% in motion.</h2></div><button onClick={props.onOpenSyllabus} className="rounded-full p-2 text-[#8C6047] hover:bg-[#F4E8DC]"><ArrowUpRight className="size-4" /></button></div><div className="mt-6 space-y-4">{props.statistics.bySubject.map((item) => { const tint = subjectTint(item.subject); return <div key={item.subject}><div className="mb-2 flex justify-between text-xs"><span className="font-bold" style={{ color: tint.solid }}>{item.subject}</span><span className="font-bold text-[#846958]">{item.score}%</span></div><div className="h-2 overflow-hidden rounded-full" style={{ background: tint.wash }}><div className="h-full rounded-full" style={{ width: `${item.score}%`, background: tint.solid }} /></div></div>; })}</div><div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#FBF2E6] p-3"><Trophy className="size-5 text-[#C78A4B]" /><p className="text-xs leading-5 text-[#755442]"><b>Next milestone:</b> reach 50% mastered to unlock a more test-heavy weekly plan.</p></div></div>
      <div className="jee-panel overflow-hidden p-6"><div className="flex justify-between"><div><p className="jee-kicker">Your rhythm</p><h2 className="jee-title mt-1 text-2xl">{props.streak} {props.streak === 1 ? "day" : "days"} steady.</h2></div><Flame className="size-5 fill-[#D2823D] text-[#D2823D]" /></div><div className="mt-6 grid grid-cols-7 gap-2">{props.heatmapDays.map((day) => { const tone = day.minutes >= 150 ? "bg-[#965D3D]" : day.minutes >= 60 ? "bg-[#D7A563]" : day.minutes > 0 ? "bg-[#EBCB9A]" : "bg-[#F2E7DB]"; return <div key={day.date.toISOString()} title={`${day.date.toLocaleDateString()}: ${day.minutes} min`} className={`aspect-square rounded-md ${tone}`} />; })}</div><div className="mt-4 flex justify-between text-[10px] font-bold uppercase tracking-wider text-[#AD8D7A]"><span>4-week view</span><span>{props.weeklyMinutes} min this week</span></div></div>
      <div className="jee-panel relative overflow-hidden p-6"><div className="absolute -right-7 -top-6 size-28 rounded-full bg-[#F4DFC0]" /><div className="relative"><div className="flex justify-between"><div><p className="jee-kicker">Suggested next</p><h2 className="jee-title mt-1 text-2xl">{props.nextChapter.title}</h2></div><BrainCircuit className="size-5 text-[#A56742]" /></div><p className="mt-4 text-xs leading-5 text-[#886A58]">Your flagged chapter is active in revision. Convert the weak points into a 35-minute formula + PYQ block.</p><button onClick={props.onAdvance} className="mt-5 w-full rounded-xl bg-[#4D2A1D] py-2.5 text-xs font-bold text-white transition-transform active:scale-[0.97]">Move it forward <ChevronRight className="ml-1 inline size-3.5" /></button></div></div></section>

    <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"><div className="jee-panel p-6"><div className="flex flex-wrap justify-between gap-3"><div><p className="jee-kicker">Mock momentum</p><h2 className="jee-title mt-1 text-2xl">Improvement you can see.</h2></div><button onClick={props.onAddMock} className="rounded-full border border-[#E6D4C2] px-3 py-2 text-xs font-bold text-[#6D4937] hover:bg-[#FAF1E7]"><Plus className="mr-1 inline size-3.5" />Add mock</button></div><div className="mt-6 h-[225px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={props.chartData} margin={{ top: 10, left: -22, right: 4, bottom: 0 }}><defs><linearGradient id="scoreFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#C78A4B" stopOpacity={0.34} /><stop offset="100%" stopColor="#C78A4B" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#F0E2D5" /><XAxis dataKey="attempt" axisLine={false} tickLine={false} tick={{ fill: "#9C7A68", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#9C7A68", fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #E5D3C2", boxShadow: "0 10px 24px rgba(79,42,28,.1)" }} /><Area type="monotone" dataKey="score" stroke="#815138" strokeWidth={3} fill="url(#scoreFill)" /></AreaChart></ResponsiveContainer></div></div>
      <div className="jee-panel p-6"><p className="jee-kicker">JEE Copilot</p><h2 className="jee-title mt-1 text-2xl">Ask what matters now.</h2><p className="mt-2 text-xs leading-5 text-[#947461]">It reads your local goal, syllabus pulse, mock trend, notes, and formula review state.</p><div className="mt-5"><AIChatBox messages={props.chatMessages} onSendMessage={props.onSendChat} isLoading={props.chatLoading} height="270px" placeholder="I’m struggling with thermodynamics…" emptyStateMessage="Your personal study guide is ready." suggestedPrompts={["What should I study today?", "How can I improve Physics?", "Help me plan my next mock."]} className="!rounded-[1.25rem] !border-[#EADCCD] !shadow-none" /></div></div></section>

    <section className="rounded-[1.8rem] border border-[#E5D0B7] bg-[#F8E9D6] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="jee-kicker">Adaptive study intelligence</p><h2 className="jee-title mt-1 text-2xl">Make your data teach you something.</h2></div><div className="flex flex-wrap gap-2"><button onClick={() => props.onAskInsight("next action")} className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#795039] shadow-sm">Next action</button><button onClick={() => props.onAskInsight("coach note")} className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#795039] shadow-sm">Coach note</button><button onClick={() => props.onAskInsight("mistake-pattern analysis")} className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#795039] shadow-sm">Mistake patterns</button></div></div>{props.insightLoading && <p className="mt-5 text-sm text-[#8B634B]"><Sparkles className="mr-2 inline size-4 animate-pulse" />Reading your learning signals…</p>}{props.aiInsight && <div className="mt-5 rounded-2xl border border-white/80 bg-white/70 p-4 text-sm leading-6 text-[#684735] whitespace-pre-wrap">{props.aiInsight}</div>}{!props.aiInsight && !props.insightLoading && <p className="mt-5 text-sm leading-6 text-[#8B634B]">Ask for a recommendation after you log a focus block or mock. The guidance stays grounded in your recorded study data.</p>}</section>
  </div>;
}

function Syllabus({ chapters, search, setSearch, subject, setSubject, starredOnly, setStarredOnly, onUpdate, onAdvance, onOpenChapter, overall }: { chapters: Chapter[]; search: string; setSearch: (value: string) => void; subject: Subject | "All"; setSubject: (value: Subject | "All") => void; starredOnly: boolean; setStarredOnly: (value: boolean) => void; onUpdate: (id: string, patch: Partial<Chapter>) => void; onAdvance: (chapter: Chapter) => void; onOpenChapter: (chapter: Chapter) => void; overall: number }) {
  return <div className="space-y-6"><section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="jee-kicker">54-chapter roadmap</p><h2 className="jee-title mt-1 text-4xl">Syllabus, made visible.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#8D6E5C]">Choose the next honest stage for every chapter. The four-bubble method turns vague revision into a concrete plan.</p></div><div className="rounded-2xl bg-[#4D2A1D] px-5 py-3 text-[#FFF7EB]"><p className="text-[10px] font-bold uppercase tracking-wider text-[#EFCF99]">Overall mastered</p><p className="jee-title mt-1 text-3xl">{overall}%</p></div></section><section className="jee-panel p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search chapters…" className="h-11 flex-1 rounded-xl border border-[#E8D7C6] bg-[#FFFDFC] px-4 text-sm outline-none focus:ring-2 focus:ring-[#D6A56E]/50" /><div className="flex flex-wrap gap-2">{(["All", "Physics", "Chemistry", "Mathematics"] as const).map((value) => <button key={value} onClick={() => setSubject(value)} className={`rounded-full px-3 py-2 text-xs font-bold ${subject === value ? "bg-[#4D2A1D] text-white" : "bg-[#F8EDE1] text-[#866553]"}`}>{value}</button>)}<button onClick={() => setStarredOnly(!starredOnly)} className={`rounded-full px-3 py-2 text-xs font-bold ${starredOnly ? "bg-[#D59D56] text-white" : "bg-[#F8EDE1] text-[#866553]"}`}>Starred only</button></div></div></section><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{chapters.map((chapter) => <ChapterCard key={chapter.id} chapter={chapter} onUpdate={onUpdate} onAdvance={onAdvance} onOpenChapter={onOpenChapter} />)}</section>{chapters.length === 0 && <div className="jee-panel p-12 text-center text-sm text-[#9C7A68]">No chapter matches this view. Try a different search or filter.</div>}</div>;
}

function ChapterCard({ chapter, onUpdate, onAdvance, onOpenChapter }: { chapter: Chapter; onUpdate: (id: string, patch: Partial<Chapter>) => void; onAdvance: (chapter: Chapter) => void; onOpenChapter: (chapter: Chapter) => void }) {
  const tint = subjectTint(chapter.subject);
  const stage = stageMeta[chapter.stage];
  return <article className="jee-panel group p-5 transition-transform hover:-translate-y-0.5">
    <div className="flex items-start justify-between gap-3">
      <button onClick={() => onOpenChapter(chapter)} className="flex min-w-0 items-center gap-3 text-left">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold" style={{ background: tint.wash, color: tint.solid }}>{tint.label}</div>
        <div className="min-w-0"><p className="truncate text-sm font-bold">{chapter.title}</p><p className="mt-1 text-[11px] text-[#9D7B69]">Target week {chapter.targetWeek} · open notes</p></div>
      </button>
      <button aria-label="Toggle chapter star" onClick={() => onUpdate(chapter.id, { starred: !chapter.starred })} className={`grid size-8 place-items-center rounded-full ${chapter.starred ? "bg-[#F5E2BC] text-[#C48638]" : "text-[#C1A697] hover:bg-[#F9F0E5]"}`}><Sparkles className={`size-3.5 ${chapter.starred ? "fill-current" : ""}`} /></button>
    </div>
    <div className="mt-5 flex items-center justify-between"><span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: tint.wash, color: tint.solid }}>{stage.label}</span>{chapter.flagged && <span className="rounded-full bg-[#F8DEDA] px-2 py-1 text-[10px] font-bold text-[#A74A3B]">Flagged</span>}</div>
    <div className="mt-5 flex gap-2">{stageOrder.map((item) => <button key={item} aria-label={`Mark ${stageMeta[item].label}`} onClick={() => onUpdate(chapter.id, { stage: item })} className={`size-6 rounded-full border-2 transition-all ${stageMeta[item].value <= stageMeta[chapter.stage].value ? "border-transparent" : "border-[#E5D8CD] bg-white"}`} style={stageMeta[item].value <= stageMeta[chapter.stage].value ? { background: stageMeta[item].color } : undefined} />)}</div>
    <div className="mt-5 flex items-center justify-between border-t border-[#F0E4D9] pt-4"><button onClick={() => onUpdate(chapter.id, { flagged: !chapter.flagged })} className="text-xs font-semibold text-[#9A735D]">{chapter.flagged ? "Unflag" : "Flag for review"}</button><button onClick={() => onAdvance(chapter)} className="text-xs font-bold" style={{ color: tint.solid }}>Advance <ChevronRight className="inline size-3" /></button></div>
  </article>;
}

function Analytics({ chartData, radarData, currentMock, bestMock, weakSubject, weakTopic, onAddMock, onAskInsight, aiInsight, loading }: { chartData: { attempt: string; score: number; physics: number; chemistry: number; mathematics: number }[]; radarData: { subject: string; mastery: number }[]; currentMock: Mock; bestMock: number; weakSubject: { subject: Subject; score: number }; weakTopic: Chapter; onAddMock: () => void; onAskInsight: () => void; aiInsight: string; loading: boolean }) {
  return <div className="space-y-6"><section className="flex flex-wrap items-end justify-between gap-4"><div><p className="jee-kicker">Assessment centre</p><h2 className="jee-title mt-1 text-4xl">Turn mocks into leverage.</h2><p className="mt-2 text-sm text-[#92735F]">Enter the score, then ask why it moved.</p></div><button onClick={onAddMock} className="rounded-full bg-[#4D2A1D] px-4 py-3 text-xs font-bold text-white"><Plus className="mr-1 inline size-3.5" />Log mock attempt</button></section><section className="grid gap-4 sm:grid-cols-3"><Metric label="Latest score" value={`${currentMock.total}/300`} caption="Most recent attempt" icon={<CircleDot className="size-5" />} /><Metric label="Best score" value={`${bestMock}/300`} caption="Across recorded mocks" icon={<Trophy className="size-5" />} /><Metric label="Priority signal" value={weakSubject.subject} caption={`${weakSubject.score}% syllabus mastery`} icon={<Target className="size-5" />} /></section><section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]"><div className="jee-panel p-6"><p className="jee-kicker">Score trend</p><h3 className="jee-title mt-1 text-2xl">Total marks rising.</h3><div className="mt-5 h-[290px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, left: -22, right: 8, bottom: 0 }}><defs><linearGradient id="mockFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#89563C" stopOpacity={0.35} /><stop offset="100%" stopColor="#89563C" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#F0E2D5" /><XAxis dataKey="attempt" axisLine={false} tickLine={false} tick={{ fill: "#9C7A68", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#9C7A68", fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #E5D3C2" }} /><Area type="monotone" dataKey="score" stroke="#815138" strokeWidth={3} fill="url(#mockFill)" /></AreaChart></ResponsiveContainer></div></div><div className="jee-panel p-6"><p className="jee-kicker">Mastery balance</p><h3 className="jee-title mt-1 text-2xl">Where to rebalance.</h3><div className="mt-4 h-[250px]"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData}><Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #E5D3C2" }} /><Radar dataKey="mastery" stroke="#8A573B" fill="#C78A4B" fillOpacity={0.35} /></RadarChart></ResponsiveContainer></div>{radarData.map((item) => <div key={item.subject} className="mb-2 flex justify-between text-xs"><span className="font-bold text-[#825D47]">{item.subject}</span><span>{item.mastery}%</span></div>)}</div></section><section className="rounded-[1.8rem] bg-[#4D2A1D] p-6 text-[#FFF7EA]"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#F2CA8A]">AI mistake patterns</p><h3 className="jee-title mt-1 text-2xl">Ask the data what to fix.</h3><p className="mt-3 max-w-2xl text-sm leading-6 text-[#E5CCB4]">JEE Copilot will look across your mock split, flag list, and mistake notes. It will say when there is not enough evidence rather than inventing a weakness.</p></div><button onClick={onAskInsight} className="rounded-full bg-[#F0C47D] px-4 py-2.5 text-xs font-bold text-[#4D2A1D]">Run analysis</button></div>{loading && <p className="mt-5 text-sm text-[#E6C69E]"><Sparkles className="mr-2 inline size-4 animate-pulse" />Analysing your recorded signals…</p>}{aiInsight && <div className="mt-5 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-[#FFF7EA] whitespace-pre-wrap">{aiInsight}</div>}</section></div>;
}

function Metric({ label, value, caption, icon }: { label: string; value: string; caption: string; icon: React.ReactNode }) { return <div className="jee-panel p-5"><div className="flex items-start justify-between"><div><p className="jee-kicker">{label}</p><p className="jee-title mt-2 text-3xl">{value}</p><p className="mt-2 text-xs text-[#9B7D6B]">{caption}</p></div><div className="grid size-10 place-items-center rounded-xl bg-[#F4E5D4] text-[#98613E]">{icon}</div></div></div>; }

function FormulaLab({ card, total, index, flipped, setFlipped, subject, setSubject, reviews, onMark, onShuffle }: { card: (typeof flashcards)[number]; total: number; index: number; flipped: boolean; setFlipped: (value: boolean) => void; subject: Subject | "All"; setSubject: (value: Subject | "All") => void; reviews: Record<string, "known" | "shaky">; onMark: (status: "known" | "shaky") => void; onShuffle: () => void }) {
  const known = Object.values(reviews).filter((status) => status === "known").length; const shaky = Object.values(reviews).filter((status) => status === "shaky").length;
  return <div className="space-y-6"><section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="jee-kicker">Formula & flashcard lab</p><h2 className="jee-title mt-1 text-4xl">Make recall automatic.</h2><p className="mt-2 text-sm leading-6 text-[#947461]">A growing core library of meaningful JEE formulas, grouped by subject and chapter.</p></div><div className="flex flex-wrap gap-2">{(["All", "Physics", "Chemistry", "Mathematics"] as const).map((value) => <button key={value} onClick={() => setSubject(value)} className={`rounded-full px-3 py-2 text-xs font-bold ${subject === value ? "bg-[#4D2A1D] text-white" : "bg-[#F7EBDD] text-[#84614D]"}`}>{value}</button>)}</div></section><section className="grid gap-5 xl:grid-cols-[1fr_0.55fr]"><div className="min-h-[390px] [perspective:1200px]"><button onClick={() => setFlipped(!flipped)} className="relative h-full min-h-[390px] w-full text-left [transform-style:preserve-3d] transition-transform duration-500" style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }} aria-label="Flip formula card"><div className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[#4D2A1D] p-7 text-[#FFF7EA] shadow-[0_22px_45px_rgba(79,42,28,0.25)] [backface-visibility:hidden]"><div className="absolute -right-14 -top-12 size-52 rounded-full border border-[#8D664E]" /><div className="relative flex justify-between"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">{card.subject}</span><span className="text-xs text-[#E9CBA8]">Tap to reveal</span></div><div className="relative"><p className="text-xs font-bold uppercase tracking-[.15em] text-[#E5C39B]">{card.chapter}</p><h3 className="jee-title mt-4 max-w-xl text-3xl leading-tight">{card.front}</h3></div><div className="relative flex items-center justify-between text-xs text-[#E8CDB0]"><span>{index + 1} / {total} formulas</span><Sparkles className="size-4" /></div></div><div className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[#EFCB92] p-7 text-[#4D2A1D] shadow-[0_22px_45px_rgba(79,42,28,0.18)] [backface-visibility:hidden] [transform:rotateY(180deg)]"><div className="flex justify-between"><span className="rounded-full bg-white/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">Answer</span><span className="text-xs font-bold">{card.chapter}</span></div><p className="jee-title text-3xl leading-tight">{card.back}</p><p className="text-xs leading-5 text-[#6F452E]">Say it in your own words, then mark the confidence level below.</p></div></button></div><div className="jee-panel flex flex-col p-6"><p className="jee-kicker">Recall status</p><h3 className="jee-title mt-1 text-2xl">Keep the hard ones close.</h3><div className="mt-6 grid grid-cols-3 gap-2"><div className="rounded-2xl bg-[#F7EBDD] p-3"><p className="text-xl font-bold text-[#815138]">{known}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#96745F]">Known</p></div><div className="rounded-2xl bg-[#F7DDD7] p-3"><p className="text-xl font-bold text-[#A64E3F]">{shaky}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#A66A5F]">Shaky</p></div><div className="rounded-2xl bg-[#EDF0E6] p-3"><p className="text-xl font-bold text-[#64705B]">{Math.max(0, total - known - shaky)}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#76806E]">New</p></div></div><div className="mt-auto space-y-3 pt-8"><button onClick={() => onMark("known")} className="w-full rounded-xl bg-[#4D2A1D] py-3 text-xs font-bold text-white"><Check className="mr-1 inline size-3.5" />I know this</button><button onClick={() => onMark("shaky")} className="w-full rounded-xl border border-[#E3C7BC] bg-[#FFF9F1] py-3 text-xs font-bold text-[#9C5042]">Still shaky</button><button onClick={onShuffle} className="w-full py-2 text-xs font-bold text-[#886551]">Shuffle cards</button></div></div></section></div>;
}

function ModalForm({ modal, onClose, onSession, onMock }: { modal: Modal; onClose: () => void; onSession: (event: React.FormEvent<HTMLFormElement>) => void; onMock: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const isSession = modal === "session"; return <div className="fixed inset-0 z-50 grid place-items-center bg-[#2E180F]/40 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[1.8rem] bg-[#FFFDF9] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="jee-kicker">{isSession ? "Focus log" : "Mock test log"}</p><h2 className="jee-title mt-1 text-3xl">{isSession ? "What moved today?" : "Record the evidence."}</h2></div><button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-[#F5E8DB]"><X className="size-4" /></button></div>{isSession ? <form onSubmit={onSession} className="mt-6 space-y-4"><label className="block text-xs font-bold text-[#7E5D4B]">Focus area<input required name="focus" defaultValue="Focused revision" className="mt-2 h-11 w-full rounded-xl border border-[#E8D7C6] bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#D6A56E]/50" /></label><label className="block text-xs font-bold text-[#7E5D4B]">Focused minutes<input required name="minutes" type="number" min="5" max="720" defaultValue="90" className="mt-2 h-11 w-full rounded-xl border border-[#E8D7C6] bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#D6A56E]/50" /></label><button className="w-full rounded-xl bg-[#4D2A1D] py-3 text-sm font-bold text-white">Add to today</button></form> : <form onSubmit={onMock} className="mt-6 space-y-4"><div className="grid grid-cols-3 gap-3">{(["physics", "chemistry", "mathematics"] as const).map((name) => <label key={name} className="block text-[10px] font-bold uppercase tracking-wider text-[#7E5D4B]">{name.slice(0, 4)}<input required name={name} type="number" min="0" max="100" defaultValue="0" className="mt-2 h-11 w-full rounded-xl border border-[#E8D7C6] bg-white px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#D6A56E]/50" /></label>)}</div><p className="rounded-xl bg-[#F8EBDD] p-3 text-xs leading-5 text-[#8C674F]">Use the marks you actually earned. Your total and trend will update automatically.</p><button className="w-full rounded-xl bg-[#4D2A1D] py-3 text-sm font-bold text-white">Save mock scores</button></form>}</div></div>;
}

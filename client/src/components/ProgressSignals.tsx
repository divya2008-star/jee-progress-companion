import { stageMeta, type Chapter, type Subject } from "@/data/jee";
import { Award, ChartNoAxesCombined, Flame, Flag, GraduationCap, Trophy } from "lucide-react";
import type { ReactNode } from "react";

type Mock = { total: number; attemptedAt: Date };
type Session = { minutes: number; completedAt: Date };

const subjectTint: Record<Subject, string> = {
  Physics: "#C7FF3C",
  Chemistry: "#FF4FA7",
  Mathematics: "#63C8FF",
};

export function ProgressSignals({ chapters, mocks, sessions, reviews, streak }: {
  chapters: Chapter[];
  mocks: Mock[];
  sessions: Session[];
  reviews: Record<string, "known" | "shaky">;
  streak: number;
}) {
  const subjects = (["Physics", "Chemistry", "Mathematics"] as Subject[]).map((subject) => ({
    subject,
    chapters: chapters
      .filter((chapter) => chapter.subject === subject)
      .sort((a, b) => Number(b.flagged) - Number(a.flagged) || stageMeta[a.stage].value - stageMeta[b.stage].value)
      .slice(0, 5),
  }));
  const testReady = chapters.filter((chapter) => chapter.stage === "test_ready").length;
  const known = Object.values(reviews).filter((status) => status === "known").length;
  const events = [
    ...mocks.slice(0, 3).map((mock) => ({ date: new Date(mock.attemptedAt), text: `Mock logged: ${mock.total}/300`, icon: ChartNoAxesCombined })),
    ...sessions.slice(0, 3).map((session) => ({ date: new Date(session.completedAt), text: `${session.minutes} focused minutes recorded`, icon: Flame })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 4);

  return <section className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
    <div className="today-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="today-kicker text-[#FF4FA7]"><Flag className="size-3.5" /> Weakness heatmap</p>
          <h3 className="today-heading mt-2">Where your marks are exposed.</h3>
          <p className="mt-3 text-sm leading-6 text-white/55">This map combines chapter stage and flags; it becomes more specific as you add mocks, reflections, and shaky formula reviews.</p>
        </div>
        <span className="rounded-full bg-[#FF4FA7]/15 px-3 py-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#FF4FA7]">Live signals</span>
      </div>
      <div className="mt-6 space-y-5">
        {subjects.map((row) => <div key={row.subject}>
          <div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold" style={{ color: subjectTint[row.subject] }}>{row.subject}</p><p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Higher glow = more attention</p></div>
          <div className="grid grid-cols-5 gap-2">
            {row.chapters.map((chapter) => {
              const attention = 3 - stageMeta[chapter.stage].value + (chapter.flagged ? 2 : 0);
              return <div key={chapter.id} title={`${chapter.title}: ${stageMeta[chapter.stage].label}`} className="min-h-20 rounded-xl border p-2" style={{ borderColor: `${subjectTint[row.subject]}${attention > 3 ? "80" : "24"}`, background: `${subjectTint[row.subject]}${attention > 3 ? "24" : attention > 1 ? "13" : "08"}` }}>
                <p className="line-clamp-2 text-[10px] font-bold leading-4 text-white/80">{chapter.title}</p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-wide" style={{ color: subjectTint[row.subject] }}>{chapter.flagged ? "flagged" : stageMeta[chapter.stage].label}</p>
              </div>;
            })}
            {Array.from({ length: Math.max(0, 5 - row.chapters.length) }).map((_, index) => <div key={index} className="rounded-xl border border-dashed border-white/10" />)}
          </div>
        </div>)}
      </div>
    </div>
    <div className="space-y-6">
      <div className="today-panel p-5 sm:p-6">
        <p className="today-kicker text-[#63C8FF]"><Award className="size-3.5" /> Quiet achievements</p>
        <div className="mt-4 grid grid-cols-3 gap-2"><Achievement label="Test ready" value={testReady} icon={<GraduationCap className="size-4" />} /><Achievement label="Focus streak" value={streak} icon={<Flame className="size-4" />} /><Achievement label="Formula wins" value={known} icon={<Trophy className="size-4" />} /></div>
      </div>
      <div className="today-panel p-5 sm:p-6">
        <p className="today-kicker text-[#C7FF3C]"><ChartNoAxesCombined className="size-3.5" /> Improvement timeline</p>
        <div className="mt-4 space-y-4">
          {events.length ? events.map((event, index) => {
            const Icon = event.icon;
            return <div key={`${event.text}-${index}`} className="flex gap-3"><div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#C7FF3C]/12 text-[#C7FF3C]"><Icon className="size-3.5" /></div><div><p className="text-xs font-bold text-white/80">{event.text}</p><p className="mt-1 text-[10px] text-white/35">{event.date.toLocaleDateString()}</p></div></div>;
          }) : <p className="text-sm leading-6 text-white/45">Your first sessions and mocks will become the story of your preparation.</p>}
        </div>
      </div>
    </div>
  </section>;
}

function Achievement({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3"><div className="flex items-center gap-1.5 text-[#C7FF3C]">{icon}<span className="text-lg font-black">{value}</span></div><p className="mt-2 text-[9px] font-bold uppercase tracking-[.1em] text-white/40">{label}</p></div>;
}

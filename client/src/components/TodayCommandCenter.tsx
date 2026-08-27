import type { Chapter, Subject } from "@/data/jee";
import type { PlanItem, PlannerIntensity } from "@/lib/studyEngine";
import { AlarmClock, ArrowUpRight, BrainCircuit, Check, ChevronRight, CircleDotDashed, Flame, Layers3, Pencil, Play, Sparkles, Target, TimerReset } from "lucide-react";
import { useState } from "react";

type QueueItem = { chapter: Chapter; priority: number; reason: string; shaky: number };
type AlertItem = { title: string; body: string; tone: "amber" | "pink" | "lime" };

const subjectColors: Record<Subject | "Revision", string> = { Physics: "#C7FF3C", Chemistry: "#FF4FA7", Mathematics: "#63C8FF", Revision: "#FFC84A" };

export function TodayCommandCenter({ plan, readiness, queue, alerts, weeklyMinutes, sessionsCount, reviewBuckets, onGenerate, onStartFocus, onToggleTask, onUpdateTask }: {
  plan: PlanItem[];
  readiness: number;
  queue: QueueItem[];
  alerts: AlertItem[];
  weeklyMinutes: number;
  sessionsCount: number;
  reviewBuckets: { due: number; soon: number; later: number; mastered: number };
  onGenerate: (availableMinutes: number, intensity: PlannerIntensity, subjects: Subject[]) => void;
  onStartFocus: (task: PlanItem) => void;
  onToggleTask: (id: string) => void;
  onUpdateTask: (id: string, patch: Partial<Pick<PlanItem, "task" | "minutes">>) => void;
}) {
  const [minutes, setMinutes] = useState(300);
  const [intensity, setIntensity] = useState<PlannerIntensity>("focused");
  const [subjects, setSubjects] = useState<Subject[]>(["Physics", "Chemistry", "Mathematics"]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const completed = plan.filter((item) => item.completed).length;

  function toggleSubject(subject: Subject) {
    setSubjects((items) => items.includes(subject) ? (items.length > 1 ? items.filter((item) => item !== subject) : items) : [...items, subject]);
  }

  return <div className="today-shell space-y-6 pb-10">
    <section className="today-hero overflow-hidden rounded-[2.25rem] p-6 sm:p-8 lg:p-10">
      <div className="today-grid absolute inset-0 opacity-35" />
      <div className="relative grid gap-8 xl:grid-cols-[1.25fr_.75fr] xl:items-end">
        <div>
          <p className="today-kicker"><CircleDotDashed className="size-3.5" /> Today’s command center</p>
          <h2 className="today-hero-title mt-4 max-w-3xl text-5xl font-black tracking-[-.07em] text-white sm:text-7xl">MAKE <span className="text-[#C7FF3C]">TODAY</span> COUNT.</h2>
          <p className="mt-5 max-w-xl text-sm leading-6 text-white/65 sm:text-base">Your plan is calculated from mastery stage, active target weeks, mock splits, revision signals, and the formula cards that need retrieval practice.</p>
          <p className="today-hero-hint mt-4 text-xs font-bold uppercase tracking-[.16em] text-white/45">Daily signals · smart sequencing · clear momentum</p>
          <div className="mt-7 flex flex-wrap gap-3"><div className="today-stat"><Flame className="size-4 text-[#FF4FA7]" /><span>{weeklyMinutes} minutes this week</span></div><div className="today-stat"><TimerReset className="size-4 text-[#63C8FF]" /><span>{sessionsCount} focus blocks logged</span></div></div>
        </div>
        <div className="rounded-[1.8rem] border border-white/12 bg-white/[.07] p-5 backdrop-blur-sm"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/45">JEE readiness</p><div className="mt-3 flex items-end justify-between"><p className="text-6xl font-black tracking-[-.08em] text-white">{readiness}<span className="text-2xl text-white/45">%</span></p><div className="grid size-16 place-items-center rounded-full border-[5px] border-[#C7FF3C] text-xs font-bold text-[#C7FF3C]">LIVE</div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#C7FF3C] via-[#63C8FF] to-[#FF4FA7]" style={{ width: `${readiness}%` }} /></div><p className="mt-4 text-xs leading-5 text-white/55">Internal preparation signal—not a rank prediction. It responds to coverage, mocks, revision rhythm, and formula retention.</p></div>
      </div>
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
      <div className="today-panel p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="today-kicker text-[#C7FF3C]"><Target className="size-3.5" /> Smart daily planner</p><h3 className="today-heading mt-2">A plan with a reason.</h3></div><button onClick={() => onGenerate(minutes, intensity, subjects)} className="today-action"><Sparkles className="size-4" /> Generate today</button></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-[.8fr_1.2fr]"><label className="today-field"><span>Available time</span><div className="flex items-center gap-2"><input value={minutes} min={30} max={840} step={15} type="number" onChange={(event) => setMinutes(Math.max(30, Math.min(840, Number(event.target.value))))} /><b>MIN</b></div></label><div className="grid grid-cols-3 gap-2">{(["steady", "focused", "sprint"] as PlannerIntensity[]).map((item) => <button key={item} onClick={() => setIntensity(item)} className={`today-choice ${intensity === item ? "is-selected" : ""}`}>{item}</button>)}</div></div>
        <div className="mt-3 flex flex-wrap gap-2">{(["Physics", "Chemistry", "Mathematics"] as Subject[]).map((subject) => <button key={subject} onClick={() => toggleSubject(subject)} className={`today-subject ${subjects.includes(subject) ? "is-selected" : ""}`} style={{ "--subject-color": subjectColors[subject] } as React.CSSProperties}>{subjects.includes(subject) && <Check className="size-3" />}{subject}</button>)}</div>
        <div className="mt-6 space-y-3">{plan.map((item, index) => <article key={item.id} className={`today-plan-item ${item.completed ? "is-complete" : ""}`}><div className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-black" style={{ background: `${subjectColors[item.subject]}20`, color: subjectColors[item.subject] }}>{index + 1}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-white">{item.chapter}</p><span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: `${subjectColors[item.subject]}20`, color: subjectColors[item.subject] }}>{item.subject}</span></div>{editingId === item.id ? <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_78px]"><input defaultValue={item.task} onBlur={(event) => onUpdateTask(item.id, { task: event.target.value || item.task })} className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white outline-none" /><input defaultValue={item.minutes} min={5} max={360} type="number" onBlur={(event) => onUpdateTask(item.id, { minutes: Math.max(5, Math.min(360, Number(event.target.value))) })} className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white outline-none" /></div> : <p className="mt-1 text-xs text-white/55">{item.task} · <span className="text-white/80">{item.minutes} min</span></p>}<p className="mt-2 text-[11px] leading-4 text-white/36">Why this block: {item.reason}</p></div><div className="flex shrink-0 gap-2"><button onClick={() => setEditingId(editingId === item.id ? null : item.id)} aria-label="Edit task" className="today-icon"><Pencil className="size-3.5" /></button><button onClick={() => onToggleTask(item.id)} aria-label="Toggle completion" className="today-icon"><Check className="size-4" /></button><button onClick={() => onStartFocus(item)} className="today-icon today-play" aria-label="Start focus"><Play className="size-4 fill-current" /></button></div></article>)}{!plan.length && <div className="rounded-2xl border border-dashed border-white/15 p-7 text-center text-sm text-white/45">Set your time and priorities, then generate a data-derived plan.</div>}</div>
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/40"><span>{completed}/{plan.length} blocks completed</span><span>{plan.reduce((sum, item) => sum + item.minutes, 0)} min planned</span></div>
      </div>
      <div className="space-y-6"><div className="today-panel p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="today-kicker text-[#FF4FA7]"><Layers3 className="size-3.5" /> Smart revision queue</p><h3 className="today-heading mt-2">Review before it leaks.</h3></div><ArrowUpRight className="size-5 text-white/35" /></div><div className="mt-5 space-y-3">{queue.slice(0, 4).map((item, index) => <div key={item.chapter.id} className="revision-line"><span className="text-sm font-black text-[#FF4FA7]">0{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{item.chapter.title}</p><p className="mt-1 text-[11px] leading-4 text-white/45">{item.reason}</p></div><ChevronRight className="size-4 text-white/30" /></div>)}</div></div>
        <div className="today-panel p-5 sm:p-6"><p className="today-kicker text-[#63C8FF]"><AlarmClock className="size-3.5" /> Retrieval schedule</p><div className="mt-4 grid grid-cols-4 gap-2">{Object.entries(reviewBuckets).map(([label, count]) => <div key={label} className="review-bucket"><b>{count}</b><span>{label}</span></div>)}</div></div>
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-3">{alerts.length ? alerts.map((alert) => <div key={alert.title} className={`today-alert is-${alert.tone}`}><p className="font-bold">{alert.title}</p><p>{alert.body}</p></div>) : <div className="today-alert is-lime md:col-span-3"><p className="font-bold">Your signals are quiet.</p><p>Keep logging focus blocks and mocks; new timely alerts will appear only when the data indicates a useful action.</p></div>}</section>
  </div>;
}

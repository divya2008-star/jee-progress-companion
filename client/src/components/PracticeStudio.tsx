import { trpc } from "@/lib/trpc";
import { canAdvancePractice, getOptionFeedback } from "@shared/practiceFlow";
import type { Chapter, Subject } from "@/data/jee";
import { ArrowRight, BookOpenCheck, BrainCircuit, Check, CircleCheck, CircleX, Sparkles, Timer } from "lucide-react";
import { useMemo, useState } from "react";

export function PracticeStudio({ chapters }: { chapters: Chapter[] }) {
  const [subject, setSubject] = useState<Subject>("Physics");
  const subjectChapters = useMemo(() => chapters.filter((item) => item.subject === subject), [chapters, subject]);
  const [chapter, setChapter] = useState(subjectChapters[0]?.title ?? "Rotational Motion");
  const [difficulty, setDifficulty] = useState<"foundation" | "medium" | "challenge">("medium");
  const [count, setCount] = useState(5);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [completed, setCompleted] = useState(false);
  const practice = trpc.ai.practice.useMutation();
  const test = practice.data;
  const current = test?.questions[questionIndex];
  const score = Object.values(answers).filter(Boolean).length;

  function switchSubject(next: Subject) {
    setSubject(next);
    setChapter(chapters.find((item) => item.subject === next)?.title ?? "");
  }

  function generate(isDaily = false) {
    const questionCount = isDaily ? 10 : count;
    setCount(questionCount);
    setQuestionIndex(0);
    setSelectedIndex(null);
    setAnswers({});
    setCompleted(false);
    practice.mutate({ subject, chapter, difficulty, count: questionCount });
  }

  function selectOption(index: number) {
    if (!current || selectedIndex !== null) return;
    setSelectedIndex(index);
    setAnswers((previous) => ({ ...previous, [questionIndex]: index === current.correctIndex }));
  }

  function nextQuestion() {
    if (!test || selectedIndex === null) return;
    if (questionIndex === test.questions.length - 1) {
      setCompleted(true);
      return;
    }
    setQuestionIndex((index) => index + 1);
    setSelectedIndex(null);
  }

  return <div className="today-shell space-y-6 pb-10">
    <section className="practice-hero rounded-[2.25rem] p-6 sm:p-8">
      <div className="relative z-10 grid gap-7 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
        <div>
          <p className="today-kicker text-[#63C8FF]"><BrainCircuit className="size-3.5" /> Practice studio</p>
          <h2 className="mt-4 text-5xl font-black tracking-[-.07em] text-white sm:text-6xl">TEST THE <span className="text-[#63C8FF]">GAPS.</span></h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/60">Build a real MCQ run, answer one question at a time, and get clear feedback before moving forward.</p>
        </div>
        <button onClick={() => generate(true)} className="rounded-[1.35rem] border border-[#63C8FF]/40 bg-[#63C8FF]/15 p-5 text-left transition hover:bg-[#63C8FF]/20">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#63C8FF]">Daily 10</p>
          <p className="mt-2 text-xl font-black text-white">Your fast weak-topic check.</p>
          <p className="mt-2 text-xs leading-5 text-white/55">Ten chapter-aware MCQs for a focused recovery block.</p>
        </button>
      </div>
    </section>

    <section className="grid gap-6 xl:grid-cols-[.78fr_1.22fr]">
      <aside className="today-panel p-5 sm:p-6">
        <p className="today-kicker text-[#FF4FA7]"><BookOpenCheck className="size-3.5" /> Build a drill</p>
        <h3 className="today-heading mt-2">Practice now.</h3>
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-3 gap-2">{(["Physics", "Chemistry", "Mathematics"] as Subject[]).map((item) => <button onClick={() => switchSubject(item)} key={item} className={`today-choice ${subject === item ? "is-selected" : ""}`}>{item.slice(0, 4)}</button>)}</div>
          <label className="today-field block"><span>Chapter</span><select value={chapter} onChange={(event) => setChapter(event.target.value)} className="mt-1 w-full bg-transparent text-sm font-bold text-white outline-none">{subjectChapters.map((item) => <option key={item.id} className="bg-[#161925]" value={item.title}>{item.title}</option>)}</select></label>
          <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/40">Difficulty</p><div className="grid grid-cols-3 gap-2">{(["foundation", "medium", "challenge"] as const).map((item) => <button key={item} onClick={() => setDifficulty(item)} className={`today-choice ${difficulty === item ? "is-selected" : ""}`}>{item}</button>)}</div></div>
          <label className="today-field block"><span>Questions</span><input min={3} max={10} value={count} type="number" onChange={(event) => setCount(Math.max(3, Math.min(10, Number(event.target.value))))} /></label>
          <button disabled={practice.isPending} onClick={() => generate(false)} className="today-action w-full justify-center">{practice.isPending ? <Sparkles className="size-4 animate-pulse" /> : <Timer className="size-4" />}{practice.isPending ? "Building MCQs…" : "Generate MCQ test"}</button>
        </div>
      </aside>

      <section className="today-panel min-h-[520px] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="today-kicker text-[#C7FF3C]">Interactive practice</p><h3 className="today-heading mt-2">{test ? test.title : (chapter || "Choose a chapter first.")}</h3></div>
          {test && <div className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/80">{completed ? <><Check className="mr-1 inline size-3.5 text-[#C7FF3C]" />{score}/{test.questions.length} correct</> : `Question ${questionIndex + 1} of ${test.questions.length}`}</div>}
        </div>

        {practice.isPending && <div className="mt-12 text-center text-sm text-white/45"><Sparkles className="mx-auto mb-3 size-6 animate-pulse text-[#C7FF3C]" />Building a self-contained MCQ set for this chapter…</div>}
        {practice.error && <div className="mt-8 rounded-2xl border border-[#FF4FA7]/35 bg-[#FF4FA7]/10 p-4 text-sm leading-6 text-white/70">This MCQ set could not be generated right now. Please try again; your study tracker is unaffected.</div>}

        {current && !completed && <div className="mt-6">
          <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#63C8FF] transition-all" style={{ width: `${((questionIndex + 1) / test!.questions.length) * 100}%` }} /></div>
          <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#63C8FF]">Question {questionIndex + 1} · {subject}</p>
          <p className="mt-3 text-lg font-bold leading-8 text-white">{current.question}</p>
          <div className="mt-6 space-y-3">{current.options.map((option, index) => {
            const isCorrect = index === current.correctIndex;
            const isSelected = index === selectedIndex;
            const feedback = getOptionFeedback(selectedIndex, index, current.correctIndex);
            const feedbackClass = feedback === "correct" ? "border-[#C7FF3C] bg-[#C7FF3C]/15 text-[#E6FFC0]" : feedback === "incorrect" ? "border-[#FF4FA7] bg-[#FF4FA7]/15 text-[#FFC3DF]" : feedback === "neutral" ? "border-white/10 bg-white/[.03] text-white/65" : "border-white/10 bg-white/[.03] text-white hover:border-[#63C8FF]/60 hover:bg-[#63C8FF]/[.06]";
            return <button disabled={selectedIndex !== null} onClick={() => selectOption(index)} key={option} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left text-sm font-semibold transition ${feedbackClass}`}><span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${isCorrect && selectedIndex !== null ? "bg-[#C7FF3C] text-[#11121B]" : isSelected && selectedIndex !== null ? "bg-[#FF4FA7] text-white" : "bg-white/10 text-white/60"}`}>{String.fromCharCode(65 + index)}</span><span>{option}</span>{isCorrect && selectedIndex !== null && <CircleCheck className="ml-auto size-5 text-[#C7FF3C]" />}{isSelected && !isCorrect && <CircleX className="ml-auto size-5 text-[#FF4FA7]" />}</button>;
          })}</div>
          {selectedIndex !== null && <div className={`mt-5 rounded-2xl border p-4 ${selectedIndex === current.correctIndex ? "border-[#C7FF3C]/35 bg-[#C7FF3C]/[.08]" : "border-[#FF4FA7]/35 bg-[#FF4FA7]/[.08]"}`}><p className="font-bold text-white">{selectedIndex === current.correctIndex ? "✅ Correct — nice work." : "❌ Not quite — the correct option is highlighted in green."}</p><p className="mt-2 text-sm leading-6 text-white/65">{current.explanation}</p></div>}
          {canAdvancePractice(selectedIndex) && <button onClick={nextQuestion} className="today-action mt-5 ml-auto">{questionIndex === test!.questions.length - 1 ? "Finish test" : "Next question"}<ArrowRight className="size-4" /></button>}
        </div>}

        {completed && test && <div className="mt-12 rounded-[1.5rem] border border-[#C7FF3C]/35 bg-[#C7FF3C]/[.08] p-8 text-center"><CircleCheck className="mx-auto size-9 text-[#C7FF3C]" /><h4 className="mt-4 text-2xl font-black text-white">Test complete.</h4><p className="mt-2 text-sm leading-6 text-white/60">You got {score} of {test.questions.length} right. Revisit any red answer before generating the next drill.</p><button onClick={() => generate(false)} className="today-action mx-auto mt-5">Generate another set <Sparkles className="size-4" /></button></div>}
        {!test && !practice.isPending && !practice.error && <div className="mt-12 rounded-[1.5rem] border border-dashed border-white/15 p-8 text-center text-sm leading-6 text-white/40">Choose the chapter and difficulty, then generate a real MCQ test. You will answer one question before the next one unlocks.</div>}
      </section>
    </section>
  </div>;
}

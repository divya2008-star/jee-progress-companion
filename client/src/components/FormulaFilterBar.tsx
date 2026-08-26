import type { Subject } from "@/data/jee";

export function FormulaFilterBar({ subject, setSubject, chapterFilter, setChapterFilter, shakyOnly, setShakyOnly, chapterOptions }: { subject: Subject | "All"; setSubject: (value: Subject | "All") => void; chapterFilter: string; setChapterFilter: (value: string) => void; shakyOnly: boolean; setShakyOnly: (value: boolean) => void; chapterOptions: string[] }) {
  return <div className="jee-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
    <p className="text-xs font-bold text-[#77523E]">Refine your review</p>
    <select value={chapterFilter} onChange={(event) => setChapterFilter(event.target.value)} className="h-10 flex-1 rounded-xl border border-[#E8D7C6] bg-white px-3 text-xs font-semibold text-[#76523D] outline-none">
      <option value="All chapters">All chapters</option>
      {chapterOptions.map((chapter) => <option key={chapter} value={chapter}>{chapter}</option>)}
    </select>
    <button onClick={() => setShakyOnly(!shakyOnly)} className={`rounded-xl px-3 py-2.5 text-xs font-bold ${shakyOnly ? "bg-[#A65343] text-white" : "bg-[#F9E9E3] text-[#985342]"}`}>{shakyOnly ? "Showing shaky only" : "Review shaky cards"}</button>
  </div>;
}

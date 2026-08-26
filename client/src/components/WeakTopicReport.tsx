import { stageMeta, type Chapter } from "@/data/jee";
import { Target } from "lucide-react";

export function WeakTopicReport({ topic }: { topic: Chapter }) {
  const urgency = topic.flagged ? "flagged for review" : `${stageMeta[topic.stage].label.toLowerCase()} stage`;
  return <section className="mt-5 rounded-[1.6rem] border border-[#E5D0B7] bg-[#F8E9D6] p-5">
    <div className="flex items-start gap-3"><div className="grid size-10 place-items-center rounded-xl bg-white text-[#9B623E]"><Target className="size-5" /></div><div><p className="jee-kicker">Weak-topic signal</p><h3 className="jee-title mt-1 text-2xl">{topic.title}</h3><p className="mt-2 text-sm leading-6 text-[#7B5946]">This {topic.subject} chapter is the clearest focus point because it is {urgency}. Prioritise a short concept refresh, then a timed PYQ set before the next mock.</p></div></div>
  </section>;
}

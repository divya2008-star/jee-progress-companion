import { cn } from "@/lib/utils";
import { cleanCopilotText } from "@shared/copilotText";
import React from "react";

export { cleanCopilotText } from "@shared/copilotText";

export function CopilotResponse({ content, className }: { content: string; className?: string }) {
  const lines = cleanCopilotText(content).split("\n");
  return <div className={cn("space-y-2 text-sm leading-6", className)}>{lines.map((line, index) => line ? <p key={`${line}-${index}`}>{line}</p> : <div key={`space-${index}`} className="h-1" />)}</div>;
}

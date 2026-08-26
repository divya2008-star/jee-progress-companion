const headingEmojis: Record<string, string> = {
  "mistake-pattern insight": "🔎",
  "action for today": "🎯",
  "what to log next": "📝",
  "priority": "⚡",
  "next step": "➡️",
  "quick self-check": "🧠",
  "revision plan": "📚",
};

export function cleanCopilotText(content: string) {
  return content
    .replace(/\r/g, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .split("\n")
    .map((rawLine) => {
      const line = rawLine.trim();
      if (!line) return "";
      const plain = line.replace(/^[-•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
      const key = plain.toLowerCase().replace(/:$/, "");
      if (headingEmojis[key]) return `${headingEmojis[key]} ${plain}`;
      if (/^[-•]\s|^\d+[.)]\s/.test(line)) return `• ${plain}`;
      return plain;
    })
    .filter((line, index, lines) => line || (index > 0 && lines[index - 1] !== ""))
    .join("\n");
}

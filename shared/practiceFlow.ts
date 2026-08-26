export type OptionFeedback = "idle" | "correct" | "incorrect" | "neutral";

export function getOptionFeedback(selectedIndex: number | null, optionIndex: number, correctIndex: number): OptionFeedback {
  if (selectedIndex === null) return "idle";
  if (optionIndex === correctIndex) return "correct";
  if (optionIndex === selectedIndex) return "incorrect";
  return "neutral";
}

export function canAdvancePractice(selectedIndex: number | null) {
  return selectedIndex !== null;
}

import { describe, expect, it } from "vitest";
import { canAdvancePractice, getOptionFeedback } from "../shared/practiceFlow";

describe("sequential MCQ practice flow", () => {
  it("keeps the next question locked until a student chooses an option", () => {
    expect(canAdvancePractice(null)).toBe(false);
    expect(canAdvancePractice(2)).toBe(true);
  });

  it("marks the correct answer green and a chosen incorrect answer red", () => {
    expect(getOptionFeedback(2, 2, 2)).toBe("correct");
    expect(getOptionFeedback(1, 1, 2)).toBe("incorrect");
    expect(getOptionFeedback(1, 2, 2)).toBe("correct");
    expect(getOptionFeedback(1, 3, 2)).toBe("neutral");
  });
});


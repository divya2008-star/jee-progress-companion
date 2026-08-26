import { describe, expect, it } from "vitest";
import { cleanCopilotText } from "@shared/copilotText";

describe("cleanCopilotText", () => {
  it("removes raw Markdown markers while preserving readable lists and study cues", () => {
    const cleaned = cleanCopilotText("## Action for today\n- **Revise** torque signs\n- Solve 5 *timed* PYQs");

    expect(cleaned).toContain("🎯 Action for today");
    expect(cleaned).toContain("• Revise torque signs");
    expect(cleaned).toContain("• Solve 5 timed PYQs");
    expect(cleaned).not.toMatch(/[#*]/);
  });
});

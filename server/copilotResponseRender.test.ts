import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CopilotResponse } from "../client/src/components/CopilotResponse";

describe("CopilotResponse", () => {
  it("renders clean study guidance with a helpful visual cue and no raw Markdown", () => {
    const html = renderToStaticMarkup(createElement(CopilotResponse, { content: "## Action for today\n- **Revise** torque signs" }));

    expect(html).toContain("🎯 Action for today");
    expect(html).toContain("• Revise torque signs");
    expect(html).not.toMatch(/[#*]/);
  });
});

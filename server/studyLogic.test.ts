import { describe, expect, it } from "vitest";
import { getMasteryPercent, getMockTotal, getNextStage } from "./studyLogic";

describe("JEE study calculations", () => {
  it("calculates total marks from three subject scores", () => {
    expect(getMockTotal(56, 61, 45)).toBe(162);
  });

  it("expresses chapter stages as a mastery percentage", () => {
    expect(getMasteryPercent(["not_started", "revising", "revised", "test_ready"])).toBe(50);
    expect(getMasteryPercent(["test_ready", "test_ready"])).toBe(100);
    expect(getMasteryPercent([])).toBe(0);
  });

  it("cycles a chapter through the four revision stages", () => {
    expect(getNextStage("not_started")).toBe("revising");
    expect(getNextStage("revised")).toBe("test_ready");
    expect(getNextStage("test_ready")).toBe("not_started");
  });
});

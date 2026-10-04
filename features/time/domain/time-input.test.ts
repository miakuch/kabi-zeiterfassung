import { describe, expect, it } from "vitest";
import { completeTimeWithZeroMinutes } from "./time-input";

describe("time input completion", () => {
  it("adds zero minutes when only an hour was entered", () => {
    expect(completeTimeWithZeroMinutes("", "16")).toBe("16:00");
    expect(completeTimeWithZeroMinutes("", "6")).toBe("06:00");
  });

  it("keeps complete times unchanged", () => {
    expect(completeTimeWithZeroMinutes("16:30", "16")).toBe("16:30");
  });

  it("does not complete missing or invalid hours", () => {
    expect(completeTimeWithZeroMinutes("", "")).toBe("");
    expect(completeTimeWithZeroMinutes("", "24")).toBe("");
  });
});

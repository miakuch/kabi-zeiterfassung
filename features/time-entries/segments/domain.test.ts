import { describe, expect, it } from "vitest";
import { validateTimeEntrySegments } from "./domain";

describe("validateTimeEntrySegments", () => {
  it("adds separated periods without counting the gap", () => {
    expect(
      validateTimeEntrySegments([
        { startTime: "10:15", endTime: "11:45" },
        { startTime: "15:03", endTime: "15:57" },
      ]),
    ).toEqual({
      ok: true,
      value: {
        startTime: "10:15:00",
        endTime: "15:57:00",
        durationMinutes: 144,
        segments: [
          {
            startTime: "10:15:00",
            endTime: "11:45:00",
            durationMinutes: 90,
          },
          {
            startTime: "15:03:00",
            endTime: "15:57:00",
            durationMinutes: 54,
          },
        ],
      },
    });
  });

  it("sorts periods chronologically", () => {
    const result = validateTimeEntrySegments([
      { startTime: "15:03", endTime: "15:57" },
      { startTime: "10:15", endTime: "11:45" },
    ]);

    expect(result.ok && result.value.segments.map((segment) => segment.startTime)).toEqual([
      "10:15:00",
      "15:03:00",
    ]);
  });

  it("rejects overlapping periods", () => {
    expect(
      validateTimeEntrySegments([
        { startTime: "10:15", endTime: "11:45" },
        { startTime: "11:30", endTime: "12:00" },
      ]),
    ).toEqual({
      ok: false,
      reason: "overlapping-segments",
      segmentErrors: {
        0: { endTime: "overlap" },
        1: { startTime: "overlap" },
      },
    });
  });

  it("allows adjacent periods", () => {
    const result = validateTimeEntrySegments([
      { startTime: "10:15", endTime: "11:45" },
      { startTime: "11:45", endTime: "12:00" },
    ]);

    expect(result.ok && result.value.durationMinutes).toBe(105);
  });

  it("requires at least one period", () => {
    expect(validateTimeEntrySegments([])).toEqual({
      ok: false,
      reason: "no-segments",
      segmentErrors: {},
    });
  });
});

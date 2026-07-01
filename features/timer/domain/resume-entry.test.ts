import { describe, expect, it } from "vitest";
import { mergeResumedTimeEntry } from "./resume-entry";

describe("mergeResumedTimeEntry", () => {
  it("adds resumed timer minutes to the existing entry", () => {
    expect(
      mergeResumedTimeEntry({
        existingEntry: {
          workDate: "2026-06-14",
          startTime: "15:40:00",
          endTime: "15:41:00",
          durationMinutes: 1,
        },
        segment: {
          workDate: "2026-06-14",
          startTime: "15:42",
          endTime: "15:47",
          durationMinutes: 5,
        },
      }),
    ).toEqual({
      workDate: "2026-06-14",
      startTime: "15:40",
      endTime: "15:47",
      durationMinutes: 6,
    });
  });

  it("keeps the original displayed range when a resumed segment is on another date", () => {
    expect(
      mergeResumedTimeEntry({
        existingEntry: {
          workDate: "2026-06-14",
          startTime: "15:40:00",
          endTime: "15:41:00",
          durationMinutes: 1,
        },
        segment: {
          workDate: "2026-06-15",
          startTime: "09:00",
          endTime: "09:05",
          durationMinutes: 5,
        },
      }),
    ).toEqual({
      workDate: "2026-06-14",
      startTime: "15:40:00",
      endTime: "15:41:00",
      durationMinutes: 6,
    });
  });
});

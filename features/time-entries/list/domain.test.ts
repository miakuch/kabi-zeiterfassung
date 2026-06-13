import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatGermanDate,
  groupTimeEntriesByDate,
} from "./domain";

describe("time entry list domain", () => {
  it("formats durations as HH:mm", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(75)).toBe("01:15");
  });

  it("formats ISO dates as German dates", () => {
    expect(formatGermanDate("2026-06-13")).toBe("13.06.2026");
  });

  it("groups entries by date with day totals", () => {
    expect(
      groupTimeEntriesByDate([
        { id: "1", workDate: "2026-06-13", durationMinutes: 30 },
        { id: "2", workDate: "2026-06-13", durationMinutes: 45 },
        { id: "3", workDate: "2026-06-12", durationMinutes: 60 },
      ]),
    ).toEqual([
      {
        workDate: "2026-06-13",
        totalDurationMinutes: 75,
        entries: [
          { id: "1", workDate: "2026-06-13", durationMinutes: 30 },
          { id: "2", workDate: "2026-06-13", durationMinutes: 45 },
        ],
      },
      {
        workDate: "2026-06-12",
        totalDurationMinutes: 60,
        entries: [{ id: "3", workDate: "2026-06-12", durationMinutes: 60 }],
      },
    ]);
  });
});

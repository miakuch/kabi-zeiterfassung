import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatGermanDate,
  groupTimeEntryDaysByWeek,
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

  it("groups day totals by ISO week with week totals", () => {
    const days = groupTimeEntriesByDate([
      { id: "1", workDate: "2026-07-24", durationMinutes: 120 },
      { id: "2", workDate: "2026-07-23", durationMinutes: 90 },
      { id: "3", workDate: "2026-07-17", durationMinutes: 60 },
    ]);

    expect(groupTimeEntryDaysByWeek(days)).toEqual([
      {
        weekKey: "2026-W30",
        weekLabel: "KW 30",
        dateRangeLabel: "20.07.-26.07.2026",
        totalDurationMinutes: 210,
        days: [
          {
            workDate: "2026-07-24",
            totalDurationMinutes: 120,
            entries: [{ id: "1", workDate: "2026-07-24", durationMinutes: 120 }],
          },
          {
            workDate: "2026-07-23",
            totalDurationMinutes: 90,
            entries: [{ id: "2", workDate: "2026-07-23", durationMinutes: 90 }],
          },
        ],
      },
      {
        weekKey: "2026-W29",
        weekLabel: "KW 29",
        dateRangeLabel: "13.07.-19.07.2026",
        totalDurationMinutes: 60,
        days: [
          {
            workDate: "2026-07-17",
            totalDurationMinutes: 60,
            entries: [{ id: "3", workDate: "2026-07-17", durationMinutes: 60 }],
          },
        ],
      },
    ]);
  });

  it("uses the ISO week year around New Year", () => {
    const days = groupTimeEntriesByDate([
      { id: "1", workDate: "2027-01-03", durationMinutes: 30 },
      { id: "2", workDate: "2026-12-31", durationMinutes: 45 },
    ]);

    expect(groupTimeEntryDaysByWeek(days)).toEqual([
      {
        weekKey: "2026-W53",
        weekLabel: "KW 53",
        dateRangeLabel: "28.12.-03.01.2027",
        totalDurationMinutes: 75,
        days,
      },
    ]);
  });
});

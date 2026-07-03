import { describe, expect, it } from "vitest";
import {
  buildProjectMonthExportData,
  formatExportDate,
  formatExportDecimalHours,
  getMonthDateRange,
  parseExportMonth,
  sortExportEntries,
  type ExportTimeEntry,
} from "./export-data";

const baseEntry: ExportTimeEntry = {
  id: "entry-1",
  workDate: "2026-06-13",
  startTime: "09:00:00",
  endTime: "10:30:00",
  durationMinutes: 90,
  durationDecimalHours: 1.5,
  description: "Workshop",
  employeeName: "Mia",
  employeeEmail: "mia@example.com",
  customerName: "NDR",
  projectCode: "NDR-24",
  projectName: "Relaunch",
  taskName: "Konzeption",
  billable: true,
};

describe("project month export data", () => {
  it("parses valid export months", () => {
    expect(parseExportMonth("2026-06")).toEqual({
      ok: true,
      value: {
        year: 2026,
        month: 6,
      },
    });
  });

  it("rejects invalid export months", () => {
    expect(parseExportMonth("2026-13")).toEqual({
      ok: false,
      reason: "invalid-month",
    });
  });

  it("resolves full calendar month ranges", () => {
    expect(getMonthDateRange({ year: 2024, month: 2 })).toEqual({
      startDate: "2024-02-01",
      endDate: "2024-02-29",
    });
  });

  it("sorts by date, start time and name", () => {
    const entries = [
      { ...baseEntry, id: "b", startTime: "10:00:00", employeeName: "B" },
      { ...baseEntry, id: "a", startTime: "09:00:00", employeeName: "A" },
      {
        ...baseEntry,
        id: "previous",
        workDate: "2026-06-12",
        startTime: "15:00:00",
      },
    ];

    expect(sortExportEntries(entries).map((entry) => entry.id)).toEqual([
      "previous",
      "a",
      "b",
    ]);
  });

  it("builds totals without financial data", () => {
    const data = buildProjectMonthExportData({
      project: {
        id: "project-1",
        customerName: "NDR",
        projectName: "Relaunch",
        projectCode: "NDR-24",
      },
      month: { year: 2026, month: 6 },
      filteredTaskNames: ["Konzeption"],
      entries: [baseEntry, { ...baseEntry, id: "entry-2", durationMinutes: 30 }],
    });

    expect(data).toMatchObject({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      totalMinutes: 120,
      totalDecimalHours: 2,
      filteredTaskNames: ["Konzeption"],
    });
    expect(JSON.stringify(data)).not.toContain("hourlyRate");
    expect(JSON.stringify(data)).not.toContain("amount");
  });

  it("formats dates and decimal hours for exports", () => {
    expect(formatExportDate("2026-06-13")).toBe("13.06.26");
    expect(formatExportDecimalHours(1.5)).toBe("1,50");
  });
});

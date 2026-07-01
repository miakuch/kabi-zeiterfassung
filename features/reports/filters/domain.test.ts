import { describe, expect, it } from "vitest";
import { parseReportFilters, resolveReportDateRange } from "./domain";

const now = new Date("2026-06-13T10:00:00.000Z");

describe("report date ranges", () => {
  it("resolves current month", () => {
    expect(resolveReportDateRange({ quickFilter: "current-month", now })).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
  });

  it("resolves last quarter across year boundaries", () => {
    expect(
      resolveReportDateRange({
        quickFilter: "last-quarter",
        now: new Date("2026-01-12T10:00:00.000Z"),
      }),
    ).toEqual({
      startDate: "2025-10-01",
      endDate: "2025-12-31",
    });
  });

  it("normalizes reversed custom ranges", () => {
    expect(
      resolveReportDateRange({
        quickFilter: "custom",
        customStartDate: "2026-06-30",
        customEndDate: "2026-06-01",
        now,
      }),
    ).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
  });
});

describe("report filter parsing", () => {
  it("falls back to safe defaults", () => {
    expect(parseReportFilters({ quick: "unknown", billable: "x" })).toMatchObject({
      quickFilter: "current-month",
      billable: "all",
      customerIds: [],
      projectIds: [],
      taskIds: [],
      employeeIds: [],
    });
  });

  it("parses repeated hierarchy filters", () => {
    expect(
      parseReportFilters({
        customer: ["c1", "c2", "c1"],
        project: ["p1", "p2"],
        task: "t1",
        employee: ["e1", "e2"],
      }),
    ).toMatchObject({
      customerIds: ["c1", "c2"],
      projectIds: ["p1", "p2"],
      taskIds: ["t1"],
      employeeIds: ["e1", "e2"],
    });
  });
});

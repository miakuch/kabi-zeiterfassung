import { describe, expect, it } from "vitest";
import {
  buildReportChartData,
  calculateReportSummary,
  formatReportAmount,
  formatReportHours,
  type ReportEntry,
} from "./domain";

const entries: ReportEntry[] = [
  {
    id: "1",
    employeeId: "e1",
    employeeName: "Mia",
    customerId: "c1",
    customerName: "NDR",
    projectId: "p1",
    projectName: "Relaunch",
    projectCode: "NDR-24",
    projectColor: "#2498ac",
    taskId: "t1",
    taskName: "Konzeption",
    description: "Workshop",
    workDate: "2026-06-13",
    startTime: "09:00:00",
    endTime: "11:00:00",
    durationMinutes: 120,
    billable: true,
    billableAmount: 300,
  },
  {
    id: "2",
    employeeId: "e2",
    employeeName: "Alex",
    customerId: "c1",
    customerName: "NDR",
    projectId: "p1",
    projectName: "Relaunch",
    projectCode: "NDR-24",
    projectColor: "#2498ac",
    taskId: "t2",
    taskName: "Review",
    description: "Review",
    workDate: "2026-06-14",
    startTime: "11:00:00",
    endTime: "11:30:00",
    durationMinutes: 30,
    billable: false,
    billableAmount: null,
  },
];

describe("report summary", () => {
  it("calculates hours and admin amount", () => {
    expect(calculateReportSummary({ entries, role: "admin" })).toEqual({
      totalMinutes: 150,
      billableMinutes: 120,
      nonBillableMinutes: 30,
      billableAmount: 300,
    });
  });

  it("hides amount for employees", () => {
    expect(calculateReportSummary({ entries, role: "employee" }).billableAmount).toBe(
      null,
    );
  });

  it("formats hours and amounts for German reports", () => {
    expect(formatReportHours(75)).toBe("1,25 h");
    expect(formatReportAmount(1200)).toBe("1.200,00 EUR");
  });
});

describe("report chart data", () => {
  it("groups by project", () => {
    expect(
      buildReportChartData({
        entries,
        grouping: "project",
        startDate: "2026-06-01",
        endDate: "2026-06-30",
      }),
    ).toEqual([
      {
        label: "NDR-24 - Relaunch",
        minutes: 150,
        hours: 2.5,
        color: "#2498ac",
      },
    ]);
  });

  it("builds daily time ranges with gaps", () => {
    expect(
      buildReportChartData({
        entries,
        grouping: "time",
        startDate: "2026-06-13",
        endDate: "2026-06-16",
      }),
    ).toEqual([
      {
        label: "2026-06-13",
        minutes: 120,
        hours: 2,
        projectSegments: [
          {
            key: "project_p1",
            label: "NDR-24 - Relaunch",
            color: "#2498ac",
            minutes: 120,
            hours: 2,
          },
        ],
      },
      {
        label: "2026-06-14",
        minutes: 30,
        hours: 0.5,
        projectSegments: [
          {
            key: "project_p1",
            label: "NDR-24 - Relaunch",
            color: "#2498ac",
            minutes: 30,
            hours: 0.5,
          },
        ],
      },
      { label: "2026-06-15", minutes: 0, hours: 0, projectSegments: [] },
      { label: "2026-06-16", minutes: 0, hours: 0, projectSegments: [] },
    ]);
  });

  it("builds weekly time ranges with gaps", () => {
    expect(
      buildReportChartData({
        entries: [
          ...entries,
          {
            ...entries[0],
            id: "3",
            workDate: "2026-06-29",
            durationMinutes: 60,
          },
        ],
        grouping: "time",
        timeGranularity: "week",
        startDate: "2026-06-13",
        endDate: "2026-06-30",
      }),
    ).toEqual([
      {
        label: "08.06.-14.06.",
        minutes: 150,
        hours: 2.5,
        projectSegments: [
          {
            key: "project_p1",
            label: "NDR-24 - Relaunch",
            color: "#2498ac",
            minutes: 150,
            hours: 2.5,
          },
        ],
      },
      { label: "15.06.-21.06.", minutes: 0, hours: 0, projectSegments: [] },
      { label: "22.06.-28.06.", minutes: 0, hours: 0, projectSegments: [] },
      {
        label: "29.06.-05.07.",
        minutes: 60,
        hours: 1,
        projectSegments: [
          {
            key: "project_p1",
            label: "NDR-24 - Relaunch",
            color: "#2498ac",
            minutes: 60,
            hours: 1,
          },
        ],
      },
    ]);
  });

  it("builds monthly time ranges with gaps", () => {
    expect(
      buildReportChartData({
        entries: [
          ...entries,
          {
            ...entries[0],
            id: "3",
            workDate: "2026-08-01",
            durationMinutes: 60,
          },
        ],
        grouping: "time",
        timeGranularity: "month",
        startDate: "2026-06-13",
        endDate: "2026-08-31",
      }),
    ).toEqual([
      {
        label: "Juni 2026",
        minutes: 150,
        hours: 2.5,
        projectSegments: [
          {
            key: "project_p1",
            label: "NDR-24 - Relaunch",
            color: "#2498ac",
            minutes: 150,
            hours: 2.5,
          },
        ],
      },
      { label: "Juli 2026", minutes: 0, hours: 0, projectSegments: [] },
      {
        label: "August 2026",
        minutes: 60,
        hours: 1,
        projectSegments: [
          {
            key: "project_p1",
            label: "NDR-24 - Relaunch",
            color: "#2498ac",
            minutes: 60,
            hours: 1,
          },
        ],
      },
    ]);
  });

  it("builds project segments for stacked time ranges", () => {
    expect(
      buildReportChartData({
        entries: [
          ...entries,
          {
            ...entries[0],
            id: "3",
            projectId: "p2",
            projectCode: "MIN",
            projectName: "Minerva",
            projectColor: "#6f8a3d",
            durationMinutes: 90,
          },
        ],
        grouping: "time",
        timeGranularity: "week",
        startDate: "2026-06-13",
        endDate: "2026-06-16",
      }),
    ).toEqual([
      {
        label: "08.06.-14.06.",
        minutes: 240,
        hours: 4,
        projectSegments: [
          {
            key: "project_p2",
            label: "MIN - Minerva",
            color: "#6f8a3d",
            minutes: 90,
            hours: 1.5,
          },
          {
            key: "project_p1",
            label: "NDR-24 - Relaunch",
            color: "#2498ac",
            minutes: 150,
            hours: 2.5,
          },
        ],
      },
      {
        label: "15.06.-21.06.",
        minutes: 0,
        hours: 0,
        projectSegments: [],
      },
    ]);
  });
});

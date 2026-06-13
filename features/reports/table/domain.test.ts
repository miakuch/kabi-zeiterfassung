import { describe, expect, it } from "vitest";
import { reportDateSortValue, reportProjectContext, trimReportTime } from "./domain";
import type { ReportEntry } from "../summary/domain";

const entry: ReportEntry = {
  id: "1",
  employeeId: "e1",
  employeeName: "Mia",
  customerId: "c1",
  customerName: "NDR",
  projectId: "p1",
  projectName: "Relaunch",
  projectCode: "NDR-24",
  taskId: "t1",
  taskName: "Konzeption",
  description: "Workshop",
  workDate: "2026-06-13",
  startTime: "09:15:00",
  endTime: "10:45:00",
  durationMinutes: 90,
  billable: true,
  billableAmount: 300,
};

describe("report table domain", () => {
  it("builds the project context", () => {
    expect(reportProjectContext(entry)).toBe(
      "NDR-24 - Relaunch / Konzeption / NDR",
    );
  });

  it("trims seconds for report times", () => {
    expect(trimReportTime(entry.startTime)).toBe("09:15");
  });

  it("sorts by date and start time together", () => {
    expect(reportDateSortValue(entry)).toBe("2026-06-13 09:15:00");
  });
});

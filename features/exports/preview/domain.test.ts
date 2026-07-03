import { describe, expect, it } from "vitest";
import {
  formatExportMonthLabel,
  formatExportMonthValue,
  resolveExportPreviewSelection,
} from "./domain";
import type { ReportFilterOptions } from "@/features/reports/filters/queries";

const options: ReportFilterOptions = {
  customers: [
    {
      id: "customer-1",
      name: "NDR",
    },
  ],
  projects: [
    {
      id: "project-1",
      customerId: "customer-1",
      name: "Relaunch",
      code: "NDR-26",
    },
    {
      id: "project-2",
      customerId: "customer-1",
      name: "Support",
      code: "NDR-27",
    },
  ],
  tasks: [
    {
      id: "task-1",
      projectId: "project-1",
      name: "Konzeption",
    },
  ],
  employees: [],
};

describe("export preview selection", () => {
  it("prefills project and full month from report filters", () => {
    expect(
      resolveExportPreviewSelection({
        projectIds: ["project-1"],
        options,
        reportStartDate: "2026-06-01",
        reportEndDate: "2026-06-30",
      }),
    ).toMatchObject({
      projectId: "project-1",
      monthValue: "2026-06",
      month: {
        year: 2026,
        month: 6,
      },
      monthIsInvalid: false,
    });
  });

  it("infers a single project from selected tasks", () => {
    expect(
      resolveExportPreviewSelection({
        taskIds: ["task-1"],
        options,
        reportStartDate: "2026-06-01",
        reportEndDate: "2026-06-30",
      }),
    ).toMatchObject({
      projectId: "project-1",
      monthValue: "2026-06",
      month: {
        year: 2026,
        month: 6,
      },
    });
  });

  it("does not infer a month from partial ranges", () => {
    expect(
      resolveExportPreviewSelection({
        projectIds: ["project-1"],
        options,
        reportStartDate: "2026-06-02",
        reportEndDate: "2026-06-30",
      }),
    ).toMatchObject({
      monthValue: "",
      month: null,
    });
  });

  it("does not infer a project from multiple selected projects", () => {
    expect(
      resolveExportPreviewSelection({
        projectIds: ["project-1", "project-2"],
        options,
        reportStartDate: "2026-06-01",
        reportEndDate: "2026-06-30",
      }),
    ).toMatchObject({
      projectId: "",
      monthValue: "2026-06",
    });
  });

  it("formats month values and labels", () => {
    expect(formatExportMonthValue({ year: 2026, month: 6 })).toBe("2026-06");
    expect(formatExportMonthLabel({ year: 2026, month: 6 })).toBe("Juni 2026");
  });
});

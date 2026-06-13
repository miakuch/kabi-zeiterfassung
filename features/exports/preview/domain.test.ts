import { describe, expect, it } from "vitest";
import {
  formatExportMonthLabel,
  formatExportMonthValue,
  resolveExportPreviewSelection,
} from "./domain";

describe("export preview selection", () => {
  it("prefills project and full month from report filters", () => {
    expect(
      resolveExportPreviewSelection({
        reportProjectId: "project-1",
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

  it("keeps explicit export selection independent from report filters", () => {
    expect(
      resolveExportPreviewSelection({
        exportProjectId: "export-project",
        exportMonth: "2026-05",
        reportProjectId: "report-project",
        reportStartDate: "2026-06-01",
        reportEndDate: "2026-06-30",
      }),
    ).toMatchObject({
      projectId: "export-project",
      monthValue: "2026-05",
      month: {
        year: 2026,
        month: 5,
      },
    });
  });

  it("does not infer a month from partial ranges", () => {
    expect(
      resolveExportPreviewSelection({
        reportProjectId: "project-1",
        reportStartDate: "2026-06-02",
        reportEndDate: "2026-06-30",
      }),
    ).toMatchObject({
      monthValue: "",
      month: null,
    });
  });

  it("marks invalid explicit months", () => {
    expect(
      resolveExportPreviewSelection({
        exportMonth: "2026-13",
        reportProjectId: "project-1",
        reportStartDate: "2026-06-01",
        reportEndDate: "2026-06-30",
      }),
    ).toMatchObject({
      monthValue: "2026-13",
      month: null,
      monthIsInvalid: true,
    });
  });

  it("formats month values and labels", () => {
    expect(formatExportMonthValue({ year: 2026, month: 6 })).toBe("2026-06");
    expect(formatExportMonthLabel({ year: 2026, month: 6 })).toBe("Juni 2026");
  });
});


import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import type { ProjectMonthExportData } from "../domain/export-data";
import {
  buildProjectMonthPdfRows,
  buildProjectMonthPdfFileName,
  ProjectMonthPdfDocument,
} from "./document";

const exportData: ProjectMonthExportData = {
  project: {
    id: "project-1",
    customerName: "KABI & Partner GmbH",
    projectName: "Relaunch",
    projectCode: "WEB-26",
  },
  month: {
    year: 2026,
    month: 6,
  },
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  totalMinutes: 120,
  totalDecimalHours: 2,
  entries: [
    {
      id: "entry-1",
      workDate: "2026-06-13",
      startTime: "09:00:00",
      endTime: "10:30:00",
      durationMinutes: 90,
      durationDecimalHours: 1.5,
      description: "Konzept abstimmen",
      employeeName: "Mia",
      employeeEmail: "mia@example.com",
      customerName: "KABI & Partner GmbH",
      projectCode: "WEB-26",
      projectName: "Relaunch",
      taskName: "Konzeption",
      billable: true,
    },
  ],
};

describe("project month pdf document", () => {
  it("builds the expected file name", () => {
    expect(buildProjectMonthPdfFileName(exportData)).toBe(
      "KABI_PARTNER_GMBH_KABI_Zeitnachweis_2026_06.pdf",
    );
  });

  it("groups pdf rows by day and employee", () => {
    const rows = buildProjectMonthPdfRows([
      exportData.entries[0],
      {
        ...exportData.entries[0],
        id: "entry-2",
        startTime: "11:00:00",
        endTime: "11:30:00",
        durationMinutes: 30,
        durationDecimalHours: 0.5,
        description: "Umsetzung prüfen",
      },
    ]);

    expect(rows).toEqual([
      {
        key: "2026-06-13:Mia",
        workDate: "2026-06-13",
        description: "Konzept abstimmen; Umsetzung prüfen",
        employeeName: "Mia",
        durationDecimalHours: 2,
      },
    ]);
  });

  it("renders to a pdf buffer without financial data", async () => {
    const buffer = await renderToBuffer(
      <ProjectMonthPdfDocument data={exportData} />,
    );

    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");

    const rawPdf = buffer.toString("latin1");
    expect(rawPdf).not.toContain("Stundensatz");
    expect(rawPdf).not.toContain("Betrag");
    expect(rawPdf).not.toContain("hourlyRate");
    expect(rawPdf).not.toContain("amount");
  });
});

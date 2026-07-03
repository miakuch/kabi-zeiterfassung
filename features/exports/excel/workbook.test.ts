import { describe, expect, it } from "vitest";
import type { ProjectMonthExportData } from "@/features/exports/domain/export-data";
import {
  buildProjectMonthExcelFileName,
  createProjectMonthExcelWorkbook,
} from "./workbook";

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
  filteredTaskNames: [],
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

describe("project month excel workbook", () => {
  it("builds the expected file name", () => {
    expect(buildProjectMonthExcelFileName(exportData)).toBe(
      "KABI_PARTNER_GMBH_KABI_Zeitnachweis_2026_06.xlsx",
    );
  });

  it("creates proof and raw data sheets without financial fields", () => {
    const workbook = createProjectMonthExcelWorkbook({
      data: exportData,
      exportedAt: new Date("2026-06-13T12:00:00.000Z"),
    });

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Zeitnachweis",
      "Rohdaten",
    ]);

    const proofSheet = workbook.getWorksheet("Zeitnachweis");
    const rawSheet = workbook.getWorksheet("Rohdaten");

    expect(proofSheet?.getCell("A1").value).toBe("ZEITNACHWEIS");
    expect(proofSheet?.getCell("B6").value).toBe(2);
    expect(proofSheet?.getRow(8).values).toEqual([
      undefined,
      "Datum",
      "Arbeitszeit",
      "Beschreibung",
      "Name",
      "Stunden",
    ]);
    expect(proofSheet?.getRow(9).values).toEqual([
      undefined,
      "13.06.26",
      "09:00-10:30",
      "Konzept abstimmen",
      "Mia",
      1.5,
    ]);
    expect(rawSheet?.getRow(1).values).toEqual([
      undefined,
      "Export erstellt am",
      "2026-06-13T12:00:00.000Z",
    ]);

    const workbookJson = JSON.stringify(workbook.model);
    expect(workbookJson).not.toContain("Stundensatz");
    expect(workbookJson).not.toContain("Betrag");
    expect(workbookJson).not.toContain("hourlyRate");
    expect(workbookJson).not.toContain("amount");
  });

  it("serializes to an xlsx buffer", async () => {
    const workbook = createProjectMonthExcelWorkbook({
      data: exportData,
      exportedAt: new Date("2026-06-13T12:00:00.000Z"),
    });
    const buffer = await workbook.xlsx.writeBuffer();

    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});

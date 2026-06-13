import ExcelJS from "exceljs";
import path from "node:path";
import {
  formatExportDate,
  type ProjectMonthExportData,
} from "../domain/export-data";
import { formatExportMonthValue } from "../preview/domain";

const brandColor = "2498AC";
const darkTextColor = "162434";
const mutedFill = "E7EEF2";
const logoPath = path.join(process.cwd(), "public", "logo-kabi.png");

function trimTime(value: string) {
  return value.slice(0, 5);
}

function workTimeLabel(startTime: string, endTime: string) {
  return `${trimTime(startTime)}-${trimTime(endTime)}`;
}

function safeFilePart(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return normalized || "KUNDE";
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: brandColor },
  };
  row.alignment = {
    vertical: "middle",
  };
}

function styleTableBorders(worksheet: ExcelJS.Worksheet, fromRow: number, toRow: number) {
  for (let rowNumber = fromRow; rowNumber <= toRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "D8E2E8" } },
        bottom: { style: "thin", color: { argb: "D8E2E8" } },
      };
    });
  }
}

export function buildProjectMonthExcelFileName(data: ProjectMonthExportData) {
  const month = formatExportMonthValue(data.month).replace("-", "_");

  return `${safeFilePart(data.project.customerName)}_KABI_Zeitnachweis_${month}.xlsx`;
}

export function createProjectMonthExcelWorkbook({
  data,
  exportedAt,
}: {
  data: ProjectMonthExportData;
  exportedAt: Date;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "KABI Zeiterfassung";
  workbook.created = exportedAt;
  workbook.modified = exportedAt;

  const proofSheet = workbook.addWorksheet("Zeitnachweis", {
    pageSetup: {
      fitToPage: true,
      fitToWidth: 1,
      orientation: "landscape",
      paperSize: 9,
    },
    views: [{ state: "frozen", ySplit: 8 }],
  });
  proofSheet.properties.defaultRowHeight = 20;
  const logoId = workbook.addImage({
    extension: "png",
    filename: logoPath,
  });
  proofSheet.columns = [
    { key: "date", width: 14 },
    { key: "time", width: 18 },
    { key: "description", width: 54 },
    { key: "name", width: 24 },
    { key: "hours", width: 14 },
  ];

  proofSheet.mergeCells("A1:E1");
  proofSheet.addImage(logoId, {
    tl: { col: 3.35, row: 0.25 },
    ext: { width: 128, height: 50 },
  });
  proofSheet.getCell("A1").value = "ZEITNACHWEIS";
  proofSheet.getCell("A1").font = {
    bold: true,
    size: 18,
    color: { argb: darkTextColor },
  };

  proofSheet.getCell("A3").value = "Kunde";
  proofSheet.getCell("B3").value = data.project.customerName;
  proofSheet.getCell("A4").value = "Projekt";
  proofSheet.getCell("B4").value = data.project.projectCode
    ? `${data.project.projectCode} - ${data.project.projectName}`
    : data.project.projectName;
  proofSheet.getCell("A5").value = "Zeitraum";
  proofSheet.getCell("B5").value =
    `${formatExportDate(data.startDate)} bis ${formatExportDate(data.endDate)}`;
  proofSheet.getCell("A6").value = "Monatsstunden";
  proofSheet.getCell("B6").value = data.totalDecimalHours;
  proofSheet.getCell("B6").numFmt = "0.00";

  for (const address of ["A3", "A4", "A5", "A6"]) {
    proofSheet.getCell(address).font = { bold: true };
  }

  const headerRow = proofSheet.getRow(8);
  headerRow.values = ["Datum", "Arbeitszeit", "Beschreibung", "Name", "Stunden"];
  styleHeaderRow(headerRow);

  for (const entry of data.entries) {
    proofSheet.addRow({
      date: formatExportDate(entry.workDate),
      time: workTimeLabel(entry.startTime, entry.endTime),
      description: entry.description,
      name: entry.employeeName,
      hours: entry.durationDecimalHours,
    });
  }

  const lastProofRow = Math.max(proofSheet.rowCount, 8);
  styleTableBorders(proofSheet, 8, lastProofRow);
  proofSheet.getColumn("hours").numFmt = "0.00";
  proofSheet.getColumn("hours").alignment = { horizontal: "right" };
  proofSheet.getColumn("description").alignment = { wrapText: true };

  const rawSheet = workbook.addWorksheet("Rohdaten");
  rawSheet.columns = [
    { key: "field", width: 24 },
    { key: "value", width: 38 },
    { key: "date", width: 14 },
    { key: "start", width: 12 },
    { key: "end", width: 12 },
    { key: "minutes", width: 12 },
    { key: "hours", width: 12 },
    { key: "description", width: 48 },
    { key: "employee", width: 24 },
    { key: "email", width: 30 },
    { key: "customer", width: 24 },
    { key: "projectCode", width: 16 },
    { key: "project", width: 28 },
    { key: "task", width: 24 },
    { key: "billable", width: 14 },
  ];

  rawSheet.getRow(1).values = ["Export erstellt am", exportedAt.toISOString()];
  rawSheet.getRow(2).values = ["Kunde", data.project.customerName];
  rawSheet.getRow(3).values = ["Projekt", data.project.projectName];
  rawSheet.getRow(4).values = ["Projektkennung", data.project.projectCode ?? ""];
  rawSheet.getRow(5).values = ["Zeitraum", `${data.startDate} bis ${data.endDate}`];
  rawSheet.getRow(6).values = ["Monatsstunden", data.totalDecimalHours];

  for (let rowNumber = 1; rowNumber <= 6; rowNumber += 1) {
    rawSheet.getRow(rowNumber).getCell(1).font = { bold: true };
  }

  const rawHeaderRow = rawSheet.getRow(8);
  rawHeaderRow.values = [
    "",
    "",
    "Datum",
    "Start",
    "Ende",
    "Minuten",
    "Stunden",
    "Beschreibung",
    "Mitarbeitende",
    "E-Mail",
    "Kunde",
    "Projektkennung",
    "Projekt",
    "Aufgabe",
    "Abrechenbar",
  ];
  styleHeaderRow(rawHeaderRow);

  for (const entry of data.entries) {
    rawSheet.addRow({
      date: entry.workDate,
      start: trimTime(entry.startTime),
      end: trimTime(entry.endTime),
      minutes: entry.durationMinutes,
      hours: entry.durationDecimalHours,
      description: entry.description,
      employee: entry.employeeName,
      email: entry.employeeEmail,
      customer: entry.customerName,
      projectCode: entry.projectCode ?? "",
      project: entry.projectName,
      task: entry.taskName,
      billable: entry.billable ? "Ja" : "Nein",
    });
  }

  const lastRawRow = Math.max(rawSheet.rowCount, 8);
  styleTableBorders(rawSheet, 8, lastRawRow);
  rawSheet.getColumn("hours").numFmt = "0.00";
  rawSheet.getColumn("minutes").alignment = { horizontal: "right" };
  rawSheet.getColumn("hours").alignment = { horizontal: "right" };

  proofSheet.getRow(2).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: mutedFill },
  };

  return workbook;
}

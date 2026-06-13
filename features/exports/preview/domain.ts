import {
  getMonthDateRange,
  parseExportMonth,
  type ExportMonth,
} from "../domain/export-data";

export type ExportPreviewSelection = {
  projectId: string;
  monthValue: string;
  month: ExportMonth | null;
  monthIsInvalid: boolean;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function monthValueFromDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.slice(0, 7) : "";
}

function fullMonthFromReportRange(startDate: string, endDate: string) {
  const monthValue = monthValueFromDate(startDate);

  if (!monthValue || monthValue !== monthValueFromDate(endDate)) {
    return "";
  }

  const parsed = parseExportMonth(monthValue);

  if (!parsed.ok) {
    return "";
  }

  const range = getMonthDateRange(parsed.value);

  return range.startDate === startDate && range.endDate === endDate
    ? monthValue
    : "";
}

export function formatExportMonthValue(month: ExportMonth) {
  return `${month.year}-${pad(month.month)}`;
}

export function formatExportMonthLabel(month: ExportMonth) {
  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(month.year, month.month - 1, 1)));
}

export function resolveExportPreviewSelection({
  exportProjectId,
  exportMonth,
  reportProjectId,
  reportStartDate,
  reportEndDate,
}: {
  exportProjectId?: string;
  exportMonth?: string;
  reportProjectId: string;
  reportStartDate: string;
  reportEndDate: string;
}): ExportPreviewSelection {
  const projectId = exportProjectId ?? reportProjectId;
  const monthValue =
    exportMonth ?? fullMonthFromReportRange(reportStartDate, reportEndDate);
  const parsed = monthValue ? parseExportMonth(monthValue) : null;

  return {
    projectId,
    monthValue,
    month: parsed?.ok ? parsed.value : null,
    monthIsInvalid: Boolean(parsed && !parsed.ok),
  };
}

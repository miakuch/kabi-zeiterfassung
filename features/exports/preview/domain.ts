import {
  getMonthDateRange,
  parseExportMonth,
  type ExportMonth,
} from "../domain/export-data";
import type {
  ReportFilterOptions,
  ReportProjectOption,
} from "@/features/reports/filters/queries";

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

function singleProjectId(projects: ReportProjectOption[]) {
  return projects.length === 1 ? projects[0]?.id ?? "" : "";
}

function resolveProjectIdFromReportFilters({
  customerIds,
  projectIds,
  taskIds,
  options,
}: {
  customerIds: string[];
  projectIds: string[];
  taskIds: string[];
  options: ReportFilterOptions;
}) {
  const knownProjects = options.projects.filter((project) =>
    customerIds.length > 0 ? customerIds.includes(project.customerId) : true,
  );

  if (projectIds.length > 0) {
    return singleProjectId(
      knownProjects.filter((project) => projectIds.includes(project.id)),
    );
  }

  if (taskIds.length > 0) {
    const selectedTaskProjectIds = new Set(
      options.tasks
        .filter((task) => taskIds.includes(task.id))
        .map((task) => task.projectId),
    );

    return singleProjectId(
      knownProjects.filter((project) => selectedTaskProjectIds.has(project.id)),
    );
  }

  return singleProjectId(knownProjects);
}

export function resolveExportPreviewSelection({
  customerIds = [],
  projectIds = [],
  taskIds = [],
  options,
  reportStartDate,
  reportEndDate,
}: {
  customerIds?: string[];
  projectIds?: string[];
  taskIds?: string[];
  options: ReportFilterOptions;
  reportStartDate: string;
  reportEndDate: string;
}): ExportPreviewSelection {
  const projectId = resolveProjectIdFromReportFilters({
    customerIds,
    projectIds,
    taskIds,
    options,
  });
  const monthValue = fullMonthFromReportRange(reportStartDate, reportEndDate);
  const parsed = monthValue ? parseExportMonth(monthValue) : null;

  return {
    projectId,
    monthValue,
    month: parsed?.ok ? parsed.value : null,
    monthIsInvalid: Boolean(parsed && !parsed.ok),
  };
}

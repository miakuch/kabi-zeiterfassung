import { formatReportAmount, formatReportHours, type ReportEntry } from "../summary/domain";

export function reportProjectContext(entry: ReportEntry) {
  const project = entry.projectCode
    ? `${entry.projectCode} - ${entry.projectName}`
    : entry.projectName;

  return `${project} / ${entry.taskName} / ${entry.customerName}`;
}

export function trimReportTime(value: string) {
  return value.slice(0, 5);
}

export function reportDateSortValue(entry: ReportEntry) {
  return `${entry.workDate} ${entry.startTime}`;
}

export { formatReportAmount, formatReportHours };

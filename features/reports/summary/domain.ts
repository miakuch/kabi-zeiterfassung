import type { EmployeeRole } from "@/lib/auth/require-session";

export type ReportChartGrouping =
  | "project"
  | "customer"
  | "task"
  | "time"
  | "employee";

export type ReportEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  customerId: string;
  customerName: string;
  projectId: string;
  projectName: string;
  projectCode: string | null;
  taskId: string;
  taskName: string;
  description: string;
  workDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  billable: boolean;
  billableAmount: number | null;
};

export type ReportSummary = {
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  billableAmount: number | null;
};

export type ReportChartPoint = {
  label: string;
  minutes: number;
  hours: number;
};

function roundHours(minutes: number) {
  return Math.round((minutes / 60) * 100) / 100;
}

export function formatReportHours(minutes: number) {
  return `${roundHours(minutes).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} h`;
}

export function formatReportAmount(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${value.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EUR`;
}

export function calculateReportSummary({
  entries,
  role,
}: {
  entries: ReportEntry[];
  role: EmployeeRole;
}): ReportSummary {
  const summary = entries.reduce(
    (current, entry) => ({
      totalMinutes: current.totalMinutes + entry.durationMinutes,
      billableMinutes:
        current.billableMinutes + (entry.billable ? entry.durationMinutes : 0),
      nonBillableMinutes:
        current.nonBillableMinutes +
        (entry.billable ? 0 : entry.durationMinutes),
      billableAmount:
        current.billableAmount +
        (entry.billable && entry.billableAmount ? entry.billableAmount : 0),
    }),
    {
      totalMinutes: 0,
      billableMinutes: 0,
      nonBillableMinutes: 0,
      billableAmount: 0,
    },
  );

  return {
    ...summary,
    billableAmount: role === "admin" ? summary.billableAmount : null,
  };
}

function groupByLabel(entries: ReportEntry[], getLabel: (entry: ReportEntry) => string) {
  const grouped = new Map<string, number>();

  for (const entry of entries) {
    grouped.set(
      getLabel(entry),
      (grouped.get(getLabel(entry)) ?? 0) + entry.durationMinutes,
    );
  }

  return [...grouped.entries()]
    .map(([label, minutes]) => ({
      label,
      minutes,
      hours: roundHours(minutes),
    }))
    .sort((a, b) => b.minutes - a.minutes || a.label.localeCompare(b.label, "de"));
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

function getMonday(value: Date) {
  const date = new Date(value);
  const day = date.getUTCDay() || 7;

  date.setUTCDate(date.getUTCDate() - day + 1);

  return date;
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function timeBucketLabel(workDate: string, startDate: string, endDate: string) {
  const spanDays = daysBetween(startDate, endDate);
  const date = new Date(`${workDate}T00:00:00Z`);

  if (spanDays <= 45) {
    return workDate;
  }

  if (spanDays <= 190) {
    return `KW ${isoDate(getMonday(date))}`;
  }

  return workDate.slice(0, 7);
}

export function buildReportChartData({
  entries,
  grouping,
  startDate,
  endDate,
}: {
  entries: ReportEntry[];
  grouping: ReportChartGrouping;
  startDate: string;
  endDate: string;
}): ReportChartPoint[] {
  if (grouping === "customer") {
    return groupByLabel(entries, (entry) => entry.customerName);
  }

  if (grouping === "task") {
    return groupByLabel(entries, (entry) => entry.taskName);
  }

  if (grouping === "employee") {
    return groupByLabel(entries, (entry) => entry.employeeName);
  }

  if (grouping === "time") {
    return groupByLabel(entries, (entry) =>
      timeBucketLabel(entry.workDate, startDate, endDate),
    ).sort((a, b) => a.label.localeCompare(b.label, "de"));
  }

  return groupByLabel(entries, (entry) =>
    entry.projectCode ? `${entry.projectCode} - ${entry.projectName}` : entry.projectName,
  );
}

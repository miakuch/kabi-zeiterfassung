import type { EmployeeRole } from "@/lib/auth/require-session";

export type ReportChartGrouping =
  | "project"
  | "customer"
  | "task"
  | "time"
  | "employee";

export type ReportTimeGranularity = "day" | "week" | "month";

export type ReportEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  customerId: string;
  customerName: string;
  projectId: string;
  projectName: string;
  projectCode: string | null;
  projectColor: string;
  taskId: string;
  taskName: string;
  description: string;
  workDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  billable: boolean;
  billableAmount: number | null;
  segments?: Array<{
    id: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
  }>;
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
  color?: string;
  projectSegments?: ReportChartProjectSegment[];
};

export type ReportChartProjectSegment = {
  key: string;
  label: string;
  color: string;
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

function projectLabel(entry: ReportEntry) {
  return entry.projectCode
    ? `${entry.projectCode} - ${entry.projectName}`
    : entry.projectName;
}

function projectSegmentKey(projectId: string) {
  return `project_${projectId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

function groupByProject(entries: ReportEntry[]) {
  const grouped = new Map<
    string,
    {
      color: string;
      label: string;
      minutes: number;
    }
  >();

  for (const entry of entries) {
    const current = grouped.get(entry.projectId) ?? {
      color: entry.projectColor,
      label: projectLabel(entry),
      minutes: 0,
    };

    current.minutes += entry.durationMinutes;
    grouped.set(entry.projectId, current);
  }

  return [...grouped.values()]
    .map((project) => ({
      label: project.label,
      minutes: project.minutes,
      hours: roundHours(project.minutes),
      color: project.color,
    }))
    .sort((a, b) => b.minutes - a.minutes || a.label.localeCompare(b.label, "de"));
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatGermanShortDate(value: Date) {
  return `${String(value.getUTCDate()).padStart(2, "0")}.${String(
    value.getUTCMonth() + 1,
  ).padStart(2, "0")}.`;
}

function formatWeekRange(weekStart: Date) {
  return `${formatGermanShortDate(weekStart)}-${formatGermanShortDate(addDays(weekStart, 6))}`;
}

function formatMonthLabel(value: Date) {
  const monthNames = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ];

  return `${monthNames[value.getUTCMonth()]} ${value.getUTCFullYear()}`;
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);

  return date;
}

function addMonths(value: Date, months: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
}

function getIsoWeekStart(value: Date) {
  const dayIndex = (value.getUTCDay() + 6) % 7;

  return addDays(value, -dayIndex);
}

function getIsoWeekParts(value: Date) {
  const weekStart = getIsoWeekStart(value);
  const weekThursday = addDays(weekStart, 3);
  const weekYear = weekThursday.getUTCFullYear();
  const firstWeekStart = getIsoWeekStart(new Date(Date.UTC(weekYear, 0, 4)));
  const weekNumber =
    Math.floor((weekStart.getTime() - firstWeekStart.getTime()) / (7 * 86400000)) +
    1;

  return { weekNumber, weekStart, weekYear };
}

function timeBucketForDate(workDate: string, granularity: ReportTimeGranularity) {
  if (granularity === "day") {
    return {
      key: workDate,
      label: workDate,
    };
  }

  const date = parseIsoDate(workDate);

  if (!date) {
    return {
      key: workDate,
      label: workDate,
    };
  }

  if (granularity === "month") {
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();

    return {
      key: `${year}-${month}`,
      label: formatMonthLabel(date),
    };
  }

  const { weekNumber, weekStart, weekYear } = getIsoWeekParts(date);

  return {
    key: `${weekYear}-W${String(weekNumber).padStart(2, "0")}`,
    label: formatWeekRange(weekStart),
  };
}

function buildTimeSeriesBuckets({
  endDate,
  granularity,
  startDate,
}: {
  endDate: string;
  granularity: ReportTimeGranularity;
  startDate: string;
}) {
  if (granularity === "day") {
    const start = new Date(`${startDate}T00:00:00Z`);
    const days = daysBetween(startDate, endDate);

    return Array.from({ length: days }, (_, dayOffset) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + dayOffset);
      const label = isoDate(date);

      return { key: label, label };
    });
  }

  const parsedStartDate = parseIsoDate(startDate);
  const parsedEndDate = parseIsoDate(endDate);

  if (!parsedStartDate || !parsedEndDate) {
    return [];
  }

  if (granularity === "month") {
    const buckets: Array<{ key: string; label: string }> = [];
    let cursor = new Date(
      Date.UTC(parsedStartDate.getUTCFullYear(), parsedStartDate.getUTCMonth(), 1),
    );
    const endMonth = new Date(
      Date.UTC(parsedEndDate.getUTCFullYear(), parsedEndDate.getUTCMonth(), 1),
    );

    while (cursor.getTime() <= endMonth.getTime()) {
      const month = String(cursor.getUTCMonth() + 1).padStart(2, "0");
      const year = cursor.getUTCFullYear();

      buckets.push({
        key: `${year}-${month}`,
        label: formatMonthLabel(cursor),
      });
      cursor = addMonths(cursor, 1);
    }

    return buckets;
  }

  const buckets: Array<{ key: string; label: string }> = [];
  let cursor = getIsoWeekStart(parsedStartDate);
  const endWeekStart = getIsoWeekStart(parsedEndDate);

  while (cursor.getTime() <= endWeekStart.getTime()) {
    const { weekNumber, weekYear } = getIsoWeekParts(cursor);

    buckets.push({
      key: `${weekYear}-W${String(weekNumber).padStart(2, "0")}`,
      label: formatWeekRange(cursor),
    });
    cursor = addDays(cursor, 7);
  }

  return buckets;
}

function buildDailyTimeSeries({
  entries,
  granularity,
  startDate,
  endDate,
}: {
  entries: ReportEntry[];
  granularity: ReportTimeGranularity;
  startDate: string;
  endDate: string;
}) {
  const minutesByBucket = new Map<string, number>();
  const bucketLabels = new Map<string, string>();
  const minutesByBucketProject = new Map<string, Map<string, number>>();
  const projectSegmentsByKey = new Map<
    string,
    Omit<ReportChartProjectSegment, "hours" | "minutes">
  >();

  for (const entry of entries) {
    const bucket = timeBucketForDate(entry.workDate, granularity);

    minutesByBucket.set(
      bucket.key,
      (minutesByBucket.get(bucket.key) ?? 0) + entry.durationMinutes,
    );
    bucketLabels.set(bucket.key, bucket.label);

    const projectKey = projectSegmentKey(entry.projectId);
    const bucketProjects =
      minutesByBucketProject.get(bucket.key) ?? new Map<string, number>();

    bucketProjects.set(
      projectKey,
      (bucketProjects.get(projectKey) ?? 0) + entry.durationMinutes,
    );
    minutesByBucketProject.set(bucket.key, bucketProjects);
    projectSegmentsByKey.set(projectKey, {
      key: projectKey,
      label: projectLabel(entry),
      color: entry.projectColor,
    });
  }

  return buildTimeSeriesBuckets({ endDate, granularity, startDate }).map((bucket) => {
    const minutes = minutesByBucket.get(bucket.key) ?? 0;
    const bucketProjects = minutesByBucketProject.get(bucket.key) ?? new Map();
    const projectSegments = [...bucketProjects.entries()]
      .map(([projectKey, projectMinutes]) => ({
        ...(projectSegmentsByKey.get(projectKey) ?? {
          key: projectKey,
          label: "Projekt",
          color: "#2498ac",
        }),
        minutes: projectMinutes,
        hours: roundHours(projectMinutes),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "de"));

    return {
      label: bucketLabels.get(bucket.key) ?? bucket.label,
      minutes,
      hours: roundHours(minutes),
      projectSegments,
    };
  });
}

export function buildReportChartData({
  entries,
  grouping,
  timeGranularity = "day",
  startDate,
  endDate,
}: {
  entries: ReportEntry[];
  grouping: ReportChartGrouping;
  timeGranularity?: ReportTimeGranularity;
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
    return buildDailyTimeSeries({
      entries,
      granularity: timeGranularity,
      startDate,
      endDate,
    });
  }

  return groupByProject(entries);
}

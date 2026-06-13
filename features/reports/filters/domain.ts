export type ReportQuickFilter =
  | "current-month"
  | "last-month"
  | "current-quarter"
  | "last-quarter"
  | "current-year"
  | "custom";

export type ReportBillableFilter = "all" | "billable" | "non-billable";

export type ReportFilterState = {
  quickFilter: ReportQuickFilter;
  startDate: string;
  endDate: string;
  customerId: string;
  projectId: string;
  taskId: string;
  employeeId: string;
  billable: ReportBillableFilter;
};

export const reportQuickFilters: Array<{
  value: ReportQuickFilter;
  label: string;
}> = [
  { value: "current-month", label: "Aktueller Monat" },
  { value: "last-month", label: "Letzter Monat" },
  { value: "current-quarter", label: "Aktuelles Quartal" },
  { value: "last-quarter", label: "Letztes Quartal" },
  { value: "current-year", label: "Aktuelles Jahr" },
  { value: "custom", label: "Benutzerdefiniert" },
];

const quickFilterValues = new Set<ReportQuickFilter>(
  reportQuickFilters.map((filter) => filter.value),
);
const billableValues = new Set<ReportBillableFilter>([
  "all",
  "billable",
  "non-billable",
]);

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoDate(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate(),
  )}`;
}

function startOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1);
}

function endOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0);
}

function quarterIndex(monthIndex: number) {
  return Math.floor(monthIndex / 3);
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getTodayInTimeZone(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return new Date(
    Number(byType.get("year")),
    Number(byType.get("month")) - 1,
    Number(byType.get("day")),
  );
}

export function resolveReportDateRange({
  quickFilter,
  customStartDate,
  customEndDate,
  now = new Date(),
  timeZone = "Europe/Berlin",
}: {
  quickFilter: ReportQuickFilter;
  customStartDate?: string;
  customEndDate?: string;
  now?: Date;
  timeZone?: string;
}) {
  const today = getTodayInTimeZone(now, timeZone);
  const year = today.getFullYear();
  const monthIndex = today.getMonth();

  if (
    quickFilter === "custom" &&
    customStartDate &&
    customEndDate &&
    isIsoDate(customStartDate) &&
    isIsoDate(customEndDate)
  ) {
    return {
      startDate: customStartDate <= customEndDate ? customStartDate : customEndDate,
      endDate: customStartDate <= customEndDate ? customEndDate : customStartDate,
    };
  }

  if (quickFilter === "last-month") {
    return {
      startDate: toIsoDate(startOfMonth(year, monthIndex - 1)),
      endDate: toIsoDate(endOfMonth(year, monthIndex - 1)),
    };
  }

  if (quickFilter === "current-quarter") {
    const startMonth = quarterIndex(monthIndex) * 3;

    return {
      startDate: toIsoDate(startOfMonth(year, startMonth)),
      endDate: toIsoDate(endOfMonth(year, startMonth + 2)),
    };
  }

  if (quickFilter === "last-quarter") {
    const startMonth = (quarterIndex(monthIndex) - 1) * 3;

    return {
      startDate: toIsoDate(startOfMonth(year, startMonth)),
      endDate: toIsoDate(endOfMonth(year, startMonth + 2)),
    };
  }

  if (quickFilter === "current-year") {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    };
  }

  return {
    startDate: toIsoDate(startOfMonth(year, monthIndex)),
    endDate: toIsoDate(endOfMonth(year, monthIndex)),
  };
}

export function parseReportFilters(params: {
  quick?: string;
  start?: string;
  end?: string;
  customer?: string;
  project?: string;
  task?: string;
  employee?: string;
  billable?: string;
}): ReportFilterState {
  const quickFilter = quickFilterValues.has(params.quick as ReportQuickFilter)
    ? (params.quick as ReportQuickFilter)
    : "current-month";
  const range = resolveReportDateRange({
    quickFilter,
    customStartDate: params.start,
    customEndDate: params.end,
  });
  const billable = billableValues.has(params.billable as ReportBillableFilter)
    ? (params.billable as ReportBillableFilter)
    : "all";

  return {
    quickFilter,
    startDate: range.startDate,
    endDate: range.endDate,
    customerId: params.customer ?? "",
    projectId: params.project ?? "",
    taskId: params.task ?? "",
    employeeId: params.employee ?? "",
    billable,
  };
}

import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import type { CurrentEmployee } from "@/lib/auth/require-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ReportFilterState } from "@/features/reports/filters/domain";
import {
  buildReportChartData,
  calculateReportSummary,
  type ReportChartGrouping,
  type ReportChartPoint,
  type ReportEntry,
  type ReportSummary,
} from "./domain";

export type ReportOverview = {
  entries: ReportEntry[];
  summary: ReportSummary;
  chartData: ReportChartPoint[];
  grouping: ReportChartGrouping;
  availableGroupings: Array<{
    value: ReportChartGrouping;
    label: string;
  }>;
};

type RelatedCustomer = {
  id: string;
  name: string;
};

type RelatedProject = {
  id: string;
  name: string;
  code: string | null;
  customers: RelatedCustomer | RelatedCustomer[] | null;
};

type RelatedTask = {
  id: string;
  name: string;
  project_id: string;
  projects: RelatedProject | RelatedProject[] | null;
};

type RelatedEmployee = {
  id: string;
  name: string;
};

type TimeEntryRow = {
  id: string;
  employee_id: string;
  task_id: string;
  description: string;
  work_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  billable: boolean;
  tasks: RelatedTask | RelatedTask[] | null;
  employees: RelatedEmployee | RelatedEmployee[] | null;
};

type ProjectRateRow = {
  project_id: string;
  employee_id: string;
  hourly_rate: string | number;
};

type ProjectDefaultRateRow = {
  id: string;
  default_hourly_rate: string | number | null;
};

function firstRelated<T>(value: T | T[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function safeGroupings(role: CurrentEmployee["role"]) {
  const groupings: ReportOverview["availableGroupings"] = [
    { value: "project", label: "Projekt" },
    { value: "customer", label: "Kunde" },
    { value: "task", label: "Aufgabe" },
    { value: "time", label: "Zeitverlauf" },
  ];

  return role === "admin"
    ? ([
        ...groupings,
        { value: "employee", label: "Mitarbeitende" },
      ] satisfies ReportOverview["availableGroupings"])
    : groupings;
}

export function parseReportChartGrouping(
  value: string | undefined,
  role: CurrentEmployee["role"],
): ReportChartGrouping {
  const allowed = new Set(safeGroupings(role).map((grouping) => grouping.value));

  return allowed.has(value as ReportChartGrouping)
    ? (value as ReportChartGrouping)
    : "project";
}

function amountForEntry({
  entry,
  defaultRatesByProject,
  ratesByProjectEmployee,
}: {
  entry: ReportEntry;
  defaultRatesByProject: Map<string, number>;
  ratesByProjectEmployee: Map<string, number>;
}) {
  if (!entry.billable) {
    return null;
  }

  const key = `${entry.projectId}:${entry.employeeId}`;
  const hourlyRate =
    ratesByProjectEmployee.get(key) ?? defaultRatesByProject.get(entry.projectId);

  return hourlyRate === undefined
    ? null
    : Math.round((entry.durationMinutes / 60) * hourlyRate * 100) / 100;
}

function applyNestedFilters(entries: ReportEntry[], filters: ReportFilterState) {
  return entries.filter((entry) => {
    if (filters.customerId && entry.customerId !== filters.customerId) {
      return false;
    }

    if (filters.projectId && entry.projectId !== filters.projectId) {
      return false;
    }

    return true;
  });
}

async function addAdminAmounts(entries: ReportEntry[]) {
  if (entries.length === 0) {
    return entries;
  }

  const projectIds = [...new Set(entries.map((entry) => entry.projectId))];
  const admin = createSupabaseAdminClient();
  const [
    { data: projectRatesData, error: projectRatesError },
    { data: defaultRatesData, error: defaultRatesError },
  ] = await Promise.all([
    admin
      .from("project_member_rates")
      .select("project_id, employee_id, hourly_rate")
      .in("project_id", projectIds),
    admin
      .from("projects")
      .select("id, default_hourly_rate")
      .in("id", projectIds),
  ]);

  if (projectRatesError || defaultRatesError) {
    throw new Error("Berichtsstundensaetze konnten nicht geladen werden.");
  }

  const ratesByProjectEmployee = new Map<string, number>();
  for (const rate of (projectRatesData ?? []) as ProjectRateRow[]) {
    ratesByProjectEmployee.set(
      `${rate.project_id}:${rate.employee_id}`,
      Number(rate.hourly_rate),
    );
  }

  const defaultRatesByProject = new Map<string, number>();
  for (const project of (defaultRatesData ?? []) as ProjectDefaultRateRow[]) {
    if (project.default_hourly_rate !== null) {
      defaultRatesByProject.set(project.id, Number(project.default_hourly_rate));
    }
  }

  return entries.map((entry) => ({
    ...entry,
    billableAmount: amountForEntry({
      entry,
      defaultRatesByProject,
      ratesByProjectEmployee,
    }),
  }));
}

function toReportEntry(row: TimeEntryRow): ReportEntry | null {
  const task = firstRelated(row.tasks);
  const project = firstRelated(task?.projects ?? null);
  const customer = firstRelated(project?.customers ?? null);
  const employee = firstRelated(row.employees);

  if (!task || !project || !customer || !employee) {
    return null;
  }

  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: employee.name,
    customerId: customer.id,
    customerName: customer.name,
    projectId: project.id,
    projectName: project.name,
    projectCode: project.code,
    taskId: row.task_id,
    taskName: task.name,
    description: row.description,
    workDate: row.work_date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    billable: row.billable,
    billableAmount: null,
  };
}

export async function getReportOverview({
  employee,
  filters,
  grouping,
}: {
  employee: CurrentEmployee;
  filters: ReportFilterState;
  grouping: ReportChartGrouping;
}): Promise<ReportOverview> {
  noStore();

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("time_entries")
    .select(
      "id, employee_id, task_id, description, work_date, start_time, end_time, duration_minutes, billable, tasks(id, name, project_id, projects(id, name, code, customers(id, name))), employees(id, name)",
    )
    .gte("work_date", filters.startDate)
    .lte("work_date", filters.endDate)
    .order("work_date", { ascending: false });

  if (employee.role !== "admin") {
    query = query.eq("employee_id", employee.id);
  } else if (filters.employeeId) {
    query = query.eq("employee_id", filters.employeeId);
  }

  if (filters.taskId) {
    query = query.eq("task_id", filters.taskId);
  }

  if (filters.billable === "billable") {
    query = query.eq("billable", true);
  } else if (filters.billable === "non-billable") {
    query = query.eq("billable", false);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Berichtsdaten konnten nicht geladen werden.");
  }

  const entriesWithoutAmounts = applyNestedFilters(
    ((data ?? []) as unknown as TimeEntryRow[]).flatMap((row) => {
      const entry = toReportEntry(row);

      return entry ? [entry] : [];
    }),
    filters,
  );
  const entries =
    employee.role === "admin"
      ? await addAdminAmounts(entriesWithoutAmounts)
      : entriesWithoutAmounts;

  return {
    entries,
    summary: calculateReportSummary({ entries, role: employee.role }),
    chartData: buildReportChartData({
      entries,
      grouping,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    grouping,
    availableGroupings: safeGroupings(employee.role),
  };
}

import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildProjectMonthExportData,
  minutesToDecimalHours,
  type ExportMonth,
  type ExportProject,
  type ExportTimeEntry,
  type ProjectMonthExportData,
} from "./export-data";
import type { ReportBillableFilter } from "@/features/reports/filters/domain";

type ProjectRow = {
  id: string;
  name: string;
  code: string | null;
  customers:
    | {
        name: string;
      }
    | Array<{
        name: string;
      }>
    | null;
};

type ProjectTaskRow = {
  id: string;
  name: string;
};

type RelatedTask = {
  name: string;
  projects:
    | {
        id: string;
        name: string;
        code: string | null;
        customers:
          | {
              name: string;
            }
          | Array<{
              name: string;
            }>
          | null;
      }
    | Array<{
        id: string;
        name: string;
        code: string | null;
        customers:
          | {
              name: string;
            }
          | Array<{
              name: string;
            }>
          | null;
      }>
    | null;
};

type RelatedEmployee = {
  name: string;
  email: string;
};

type TimeEntryRow = {
  id: string;
  description: string;
  work_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  billable: boolean;
  employees: RelatedEmployee | RelatedEmployee[] | null;
  tasks: RelatedTask | RelatedTask[] | null;
};

function firstRelated<T>(value: T | T[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function customerName(customer: ProjectRow["customers"]) {
  return firstRelated(customer)?.name ?? "Ohne Kunde";
}

function toExportProject(project: ProjectRow): ExportProject {
  return {
    id: project.id,
    customerName: customerName(project.customers),
    projectName: project.name,
    projectCode: project.code,
  };
}

function toExportEntry(row: TimeEntryRow): ExportTimeEntry | null {
  const task = firstRelated(row.tasks);
  const project = firstRelated(task?.projects ?? null);
  const customer = firstRelated(project?.customers ?? null);
  const employee = firstRelated(row.employees);

  if (!task || !project || !customer || !employee) {
    return null;
  }

  return {
    id: row.id,
    workDate: row.work_date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    durationDecimalHours: minutesToDecimalHours(row.duration_minutes),
    description: row.description,
    employeeName: employee.name,
    employeeEmail: employee.email,
    customerName: customer.name,
    projectCode: project.code,
    projectName: project.name,
    taskName: task.name,
    billable: row.billable,
  };
}

export async function getProjectMonthExportData({
  projectId,
  month,
  filters,
}: {
  projectId: string;
  month: ExportMonth;
  filters?: {
    taskIds?: string[];
    taskNames?: string[];
    employeeIds?: string[];
    billable?: ReportBillableFilter;
  };
}): Promise<ProjectMonthExportData | null> {
  noStore();

  const admin = createSupabaseAdminClient();
  const [
    { data: projectData, error: projectError },
    { data: projectTasksData, error: projectTasksError },
  ] = await Promise.all([
    admin
      .from("projects")
      .select("id, name, code, customers(name)")
      .eq("id", projectId)
      .maybeSingle(),
    admin.from("tasks").select("id, name").eq("project_id", projectId),
  ]);

  if (projectError || projectTasksError) {
    throw new Error("Exportprojekt konnte nicht geladen werden.");
  }

  if (!projectData) {
    return null;
  }

  const exportProject = toExportProject(projectData as unknown as ProjectRow);
  const exportShell = buildProjectMonthExportData({
    project: exportProject,
    month,
    entries: [],
  });

  const taskIds = ((projectTasksData ?? []) as ProjectTaskRow[]).map(
    (task) => task.id,
  );
  const requestedTaskIds = filters?.taskIds ?? [];
  const filteredTaskNames =
    filters?.taskNames && filters.taskNames.length > 0
      ? [...new Set(filters.taskNames)].sort((a, b) => a.localeCompare(b, "de"))
      : requestedTaskIds.length > 0
      ? ((projectTasksData ?? []) as ProjectTaskRow[])
          .filter((task) => requestedTaskIds.includes(task.id))
          .map((task) => task.name)
          .sort((a, b) => a.localeCompare(b, "de"))
      : [];

  if (taskIds.length === 0) {
    return {
      ...exportShell,
      filteredTaskNames,
    };
  }

  const exportTaskIds =
    requestedTaskIds.length > 0
      ? taskIds.filter((taskId) => requestedTaskIds.includes(taskId))
      : taskIds;

  if (exportTaskIds.length === 0 || filters?.billable === "non-billable") {
    return {
      ...exportShell,
      filteredTaskNames,
    };
  }

  let entriesQuery = admin
    .from("time_entries")
    .select(
      "id, description, work_date, start_time, end_time, duration_minutes, billable, employees!time_entries_employee_id_fkey(name, email), tasks(name, projects(id, name, code, customers(name)))",
    )
    .eq("billable", true)
    .in("task_id", exportTaskIds)
    .gte("work_date", exportShell.startDate)
    .lte("work_date", exportShell.endDate);

  if (filters?.employeeIds && filters.employeeIds.length > 0) {
    entriesQuery = entriesQuery.in("employee_id", filters.employeeIds);
  }

  const { data: entriesData, error: entriesError } = await entriesQuery;

  if (entriesError) {
    console.error("Export time entries query failed", entriesError);
    throw new Error("Exportdaten konnten nicht geladen werden.");
  }

  return buildProjectMonthExportData({
    project: exportProject,
    month,
    filteredTaskNames,
    entries: ((entriesData ?? []) as unknown as TimeEntryRow[]).flatMap((row) => {
      const entry = toExportEntry(row);

      return entry ? [entry] : [];
    }),
  });
}

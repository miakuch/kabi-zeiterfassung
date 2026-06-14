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
}: {
  projectId: string;
  month: ExportMonth;
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
    admin.from("tasks").select("id").eq("project_id", projectId),
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

  if (taskIds.length === 0) {
    return exportShell;
  }

  const { data: entriesData, error: entriesError } = await admin
    .from("time_entries")
    .select(
      "id, description, work_date, start_time, end_time, duration_minutes, billable, employees!time_entries_employee_id_fkey(name, email), tasks(name, projects(id, name, code, customers(name)))",
    )
    .eq("billable", true)
    .in("task_id", taskIds)
    .gte("work_date", exportShell.startDate)
    .lte("work_date", exportShell.endDate);

  if (entriesError) {
    console.error("Export time entries query failed", entriesError);
    throw new Error("Exportdaten konnten nicht geladen werden.");
  }

  return buildProjectMonthExportData({
    project: exportProject,
    month,
    entries: ((entriesData ?? []) as unknown as TimeEntryRow[]).flatMap((row) => {
      const entry = toExportEntry(row);

      return entry ? [entry] : [];
    }),
  });
}

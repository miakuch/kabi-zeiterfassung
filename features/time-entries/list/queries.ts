import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { groupTimeEntriesByDate, type TimeEntryListGroup } from "./domain";

export type TimeEntriesPageSize = 50 | 100 | 250;

export type TimeEntryListItem = {
  id: string;
  taskId: string;
  description: string;
  workDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  billable: boolean;
  taskName: string;
  projectName: string;
  projectCode: string | null;
  projectColor: string;
  customerName: string;
};

export type TimeEntryListResult = {
  groups: Array<TimeEntryListGroup<TimeEntryListItem>>;
  page: number;
  pageSize: TimeEntriesPageSize;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

type RelatedCustomer = {
  name: string;
};

type RelatedProject = {
  name: string;
  code: string | null;
  color: string;
  customers: RelatedCustomer | RelatedCustomer[] | null;
};

type RelatedTask = {
  id: string;
  name: string;
  projects: RelatedProject | RelatedProject[] | null;
};

type TimeEntryRow = {
  id: string;
  task_id: string;
  description: string;
  work_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  billable: boolean;
  tasks: RelatedTask | RelatedTask[] | null;
};

function firstRelated<T>(value: T | T[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function clampPageSize(value: number): TimeEntriesPageSize {
  if (value === 100 || value === 250) {
    return value;
  }

  return 50;
}

export function parseTimeEntriesPageSize(value: string | undefined | null) {
  return clampPageSize(Number(value));
}

export function parseTimeEntriesPage(value: string | undefined | null) {
  const page = Number(value);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

function toListItem(row: TimeEntryRow): TimeEntryListItem | null {
  const task = firstRelated(row.tasks);
  const project = firstRelated(task?.projects ?? null);
  const customer = firstRelated(project?.customers ?? null);

  if (!task || !project || !customer) {
    return null;
  }

  return {
    id: row.id,
    taskId: row.task_id,
    description: row.description,
    workDate: row.work_date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    billable: row.billable,
    taskName: task.name,
    projectName: project.name,
    projectCode: project.code,
    projectColor: project.color,
    customerName: customer.name,
  };
}

export async function getOwnTimeEntryList({
  employeeId,
  page,
  pageSize,
}: {
  employeeId: string;
  page: number;
  pageSize: TimeEntriesPageSize;
}): Promise<TimeEntryListResult> {
  noStore();

  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = await createSupabaseServerClient();
  const { data, count, error } = await supabase
    .from("time_entries")
    .select(
      "id, task_id, description, work_date, start_time, end_time, duration_minutes, billable, tasks(id, name, projects(name, code, color, customers(name)))",
      { count: "exact" },
    )
    .eq("employee_id", employeeId)
    .order("work_date", { ascending: false })
    .order("start_time", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error("Zeiteintraege konnten nicht geladen werden.");
  }

  const entries = ((data ?? []) as unknown as TimeEntryRow[]).flatMap((row) => {
    const entry = toListItem(row);

    return entry ? [entry] : [];
  });
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    groups: groupTimeEntriesByDate(entries),
    page: safePage,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages,
  };
}

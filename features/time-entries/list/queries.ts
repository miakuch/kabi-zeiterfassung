import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { groupTimeEntriesByDate, type TimeEntryListGroup } from "./domain";

export type TimeEntriesPageSize = 50 | 100;

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
  segments: TimeEntrySegment[];
};

export type TimeEntrySegment = {
  id: string;
  workDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

export type TimeEntryListResult = {
  groups: Array<TimeEntryListGroup<TimeEntryListItem>>;
  page: number;
  pageSize: TimeEntriesPageSize;
  entryCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  periodLabel: string;
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
  time_entry_segments: TimeEntrySegmentRow[] | null;
};

type TimeEntrySegmentRow = {
  id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
};

function firstRelated<T>(value: T | T[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function clampPageSize(value: number): TimeEntriesPageSize {
  if (value === 100) {
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

  const segments = (row.time_entry_segments ?? [])
    .map((segment) => ({
      id: segment.id,
      workDate: segment.work_date,
      startTime: segment.start_time,
      endTime: segment.end_time,
      durationMinutes: segment.duration_minutes,
    }))
    .sort((a, b) =>
      `${a.workDate} ${a.startTime}`.localeCompare(`${b.workDate} ${b.startTime}`),
    );

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
    segments:
      segments.length > 0
        ? segments
        : [
            {
              id: row.id,
              workDate: row.work_date,
              startTime: row.start_time,
              endTime: row.end_time,
              durationMinutes: row.duration_minutes,
            },
          ],
  };
}

export async function getOwnTimeEntryList({
  employeeId,
  endDate,
  page,
  pageSize,
  periodLabel,
  startDate,
}: {
  employeeId: string;
  endDate: string;
  page: number;
  pageSize: TimeEntriesPageSize;
  periodLabel: string;
  startDate: string;
}): Promise<TimeEntryListResult> {
  noStore();

  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("time_entries")
    .select(
      "id, task_id, description, work_date, start_time, end_time, duration_minutes, billable, tasks(id, name, projects(name, code, color, customers(name))), time_entry_segments(id, work_date, start_time, end_time, duration_minutes)",
    )
    .eq("employee_id", employeeId)
    .gte("work_date", startDate)
    .lte("work_date", endDate)
    .order("work_date", { ascending: false })
    .order("start_time", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error("Zeiteintraege konnten nicht geladen werden.");
  }

  const rows = ((data ?? []) as unknown as TimeEntryRow[]).slice(0, pageSize);
  const entries = rows.flatMap((row) => {
    const entry = toListItem(row);

    return entry ? [entry] : [];
  });
  const hasNextPage = (data ?? []).length > pageSize;

  return {
    groups: groupTimeEntriesByDate(entries),
    page: safePage,
    pageSize,
    entryCount: entries.length,
    hasPreviousPage: safePage > 1,
    hasNextPage,
    periodLabel,
  };
}

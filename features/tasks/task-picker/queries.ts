import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildTaskPickerLabels,
  taskPickerItemMatchesSearch,
  type TaskPickerLabelInput,
} from "./format";

export type TaskPickerItem = TaskPickerLabelInput & {
  id: string;
  defaultBillable: boolean;
  projectId: string;
  projectColor: string;
  customerId: string;
  fullLabel: string;
  compactLabel: string;
};

type RelatedCustomer = {
  id: string;
  name: string;
  status: "active" | "inactive";
};

type RelatedProject = {
  id: string;
  name: string;
  code: string | null;
  color: string;
  status: "active" | "inactive";
  customers: RelatedCustomer | RelatedCustomer[] | null;
};

type TaskPickerRow = {
  id: string;
  name: string;
  default_billable: boolean;
  assignment_mode: "all" | "selected";
  status: "active" | "inactive";
  task_assignments: Array<{
    employee_id: string;
  }> | null;
  projects: RelatedProject | RelatedProject[] | null;
};

function firstRelated<T>(value: T | T[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function isAssignedToEmployee(row: TaskPickerRow, employeeId?: string) {
  if (!employeeId || row.assignment_mode === "all") {
    return true;
  }

  return (row.task_assignments ?? []).some(
    (assignment) => assignment.employee_id === employeeId,
  );
}

function toTaskPickerItem(
  row: TaskPickerRow,
  employeeId?: string,
): TaskPickerItem | null {
  const project = firstRelated(row.projects);
  const customer = firstRelated(project?.customers ?? null);

  if (
    row.status !== "active" ||
    !project ||
    !customer ||
    project.status !== "active" ||
    customer.status !== "active" ||
    !isAssignedToEmployee(row, employeeId)
  ) {
    return null;
  }

  const labelInput: TaskPickerLabelInput = {
    customerName: customer.name,
    projectCode: project.code,
    projectName: project.name,
    taskName: row.name,
  };
  const labels = buildTaskPickerLabels(labelInput);

  return {
    id: row.id,
    defaultBillable: row.default_billable,
    projectId: project.id,
    projectColor: project.color,
    customerId: customer.id,
    ...labelInput,
    ...labels,
  };
}

export async function getTaskPickerItems({
  employeeId,
  query,
  limit = 20,
}: {
  employeeId?: string;
  query: string;
  limit?: number;
}): Promise<TaskPickerItem[]> {
  noStore();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, name, default_billable, assignment_mode, status, task_assignments(employee_id), projects(id, name, code, color, status, customers(id, name, status))",
    )
    .eq("status", "active")
    .limit(200);

  if (error) {
    throw new Error("Aufgaben konnten nicht geladen werden.");
  }

  return ((data ?? []) as unknown as TaskPickerRow[])
    .flatMap((row) => {
      const item = toTaskPickerItem(row, employeeId);

      return item ? [item] : [];
    })
    .filter((item) => taskPickerItemMatchesSearch(item, query))
    .sort((a, b) => a.fullLabel.localeCompare(b.fullLabel, "de"))
    .slice(0, limit);
}

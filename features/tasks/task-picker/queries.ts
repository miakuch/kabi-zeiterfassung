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
  status: "active" | "inactive";
  projects: RelatedProject | RelatedProject[] | null;
};

function firstRelated<T>(value: T | T[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toTaskPickerItem(row: TaskPickerRow): TaskPickerItem | null {
  const project = firstRelated(row.projects);
  const customer = firstRelated(project?.customers ?? null);

  if (
    row.status !== "active" ||
    !project ||
    !customer ||
    project.status !== "active" ||
    customer.status !== "active"
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
  query,
  limit = 20,
}: {
  query: string;
  limit?: number;
}): Promise<TaskPickerItem[]> {
  noStore();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, name, default_billable, status, projects(id, name, code, color, status, customers(id, name, status))",
    )
    .eq("status", "active")
    .limit(200);

  if (error) {
    throw new Error("Aufgaben konnten nicht geladen werden.");
  }

  return ((data ?? []) as unknown as TaskPickerRow[])
    .flatMap((row) => {
      const item = toTaskPickerItem(row);

      return item ? [item] : [];
    })
    .filter((item) => taskPickerItemMatchesSearch(item, query))
    .sort((a, b) => a.fullLabel.localeCompare(b.fullLabel, "de"))
    .slice(0, limit);
}

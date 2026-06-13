import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import type { CurrentEmployee } from "@/lib/auth/require-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ReportCustomerOption = {
  id: string;
  name: string;
};

export type ReportProjectOption = {
  id: string;
  customerId: string;
  name: string;
  code: string | null;
};

export type ReportTaskOption = {
  id: string;
  projectId: string;
  name: string;
};

export type ReportEmployeeOption = {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
};

export type ReportFilterOptions = {
  customers: ReportCustomerOption[];
  projects: ReportProjectOption[];
  tasks: ReportTaskOption[];
  employees: ReportEmployeeOption[];
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

type TaskRow = {
  id: string;
  name: string;
  project_id: string;
  projects: RelatedProject | RelatedProject[] | null;
};

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
};

function firstRelated<T>(value: T | T[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getReportFilterOptions(
  employee: CurrentEmployee,
): Promise<ReportFilterOptions> {
  noStore();

  const supabase = await createSupabaseServerClient();
  const [
    { data: tasksData, error: tasksError },
    { data: employeesData, error: employeesError },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, name, project_id, projects(id, name, code, customers(id, name))")
      .order("name"),
    employee.role === "admin"
      ? supabase.from("employees").select("id, name, email, status").order("name")
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (tasksError || employeesError) {
    throw new Error("Berichtsfilter konnten nicht geladen werden.");
  }

  const customers = new Map<string, ReportCustomerOption>();
  const projects = new Map<string, ReportProjectOption>();
  const tasks: ReportTaskOption[] = [];

  for (const task of (tasksData ?? []) as unknown as TaskRow[]) {
    const project = firstRelated(task.projects);
    const customer = firstRelated(project?.customers ?? null);

    if (!project || !customer) {
      continue;
    }

    customers.set(customer.id, {
      id: customer.id,
      name: customer.name,
    });
    projects.set(project.id, {
      id: project.id,
      customerId: customer.id,
      name: project.name,
      code: project.code,
    });
    tasks.push({
      id: task.id,
      projectId: project.id,
      name: task.name,
    });
  }

  return {
    customers: [...customers.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "de"),
    ),
    projects: [...projects.values()].sort((a, b) =>
      `${a.code ?? ""} ${a.name}`.localeCompare(`${b.code ?? ""} ${b.name}`, "de"),
    ),
    tasks: tasks.sort((a, b) => a.name.localeCompare(b.name, "de")),
    employees:
      employee.role === "admin"
        ? ((employeesData ?? []) as EmployeeRow[]).map((option) => ({
            id: option.id,
            name: option.name,
            email: option.email,
            status: option.status,
          }))
        : [],
  };
}

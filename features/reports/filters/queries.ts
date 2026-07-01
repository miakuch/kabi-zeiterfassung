import "server-only";

import { unstable_cache, unstable_noStore as noStore } from "next/cache";
import type { CurrentEmployee } from "@/lib/auth/require-session";
import { CACHE_TAG_REPORT_FILTER_OPTIONS } from "@/lib/cache/tags";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

function buildReportFilterOptions({
  tasksData,
  employeesData,
}: {
  tasksData: unknown[] | null;
  employeesData: EmployeeRow[] | null;
}): ReportFilterOptions {
  const customers = new Map<string, ReportCustomerOption>();
  const projects = new Map<string, ReportProjectOption>();
  const tasks: ReportTaskOption[] = [];

  for (const task of (tasksData ?? []) as TaskRow[]) {
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
    employees: (employeesData ?? []).map((option) => ({
      id: option.id,
      name: option.name,
      email: option.email,
      status: option.status,
    })),
  };
}

const getAdminReportFilterOptionsCached = unstable_cache(
  async (): Promise<ReportFilterOptions> => {
    const admin = createSupabaseAdminClient();
    const [
      { data: tasksData, error: tasksError },
      { data: employeesData, error: employeesError },
    ] = await Promise.all([
      admin
        .from("tasks")
        .select("id, name, project_id, projects(id, name, code, customers(id, name))")
        .order("name"),
      admin.from("employees").select("id, name, email, status").order("name"),
    ]);

    if (tasksError || employeesError) {
      throw new Error("Berichtsfilter konnten nicht geladen werden.");
    }

    return buildReportFilterOptions({
      tasksData: tasksData ?? [],
      employeesData: (employeesData ?? []) as EmployeeRow[],
    });
  },
  ["admin-report-filter-options"],
  { tags: [CACHE_TAG_REPORT_FILTER_OPTIONS] },
);

export async function getReportFilterOptions(
  employee: CurrentEmployee,
): Promise<ReportFilterOptions> {
  if (employee.role === "admin") {
    return getAdminReportFilterOptionsCached();
  }

  noStore();
  const supabase = await createSupabaseServerClient();
  const { data: tasksData, error: tasksError } = await supabase
    .from("tasks")
    .select("id, name, project_id, projects(id, name, code, customers(id, name))")
    .order("name");

  if (tasksError) {
    throw new Error("Berichtsfilter konnten nicht geladen werden.");
  }

  return buildReportFilterOptions({
    tasksData: tasksData ?? [],
    employeesData: null,
  });
}

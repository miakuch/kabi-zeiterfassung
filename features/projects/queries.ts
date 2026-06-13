import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  calculateProjectBudgetSummary,
  type BudgetAlertBasis,
  type ProjectBudgetStatus,
} from "./budget";

export type ProjectOverviewItem = {
  id: string;
  customerName: string;
  name: string;
  code: string | null;
  color: string;
  status: "active" | "inactive";
  hourlyBudget: number | null;
  amountBudget: number | null;
  budgetAlertBasis: BudgetAlertBasis;
  defaultHourlyRate: number | null;
  usedHours: number;
  usedAmount: number;
  remainingHours: number | null;
  remainingAmount: number | null;
  hoursUsagePercent: number | null;
  amountUsagePercent: number | null;
  budgetStatus: ProjectBudgetStatus;
  activeTaskCount: number;
  totalTaskCount: number;
};

export type ProjectCustomerOption = {
  id: string;
  name: string;
  status: "active" | "inactive";
};

export type ProjectEmployeeOption = {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
};

export type ProjectTaskDetail = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  defaultBillable: boolean;
  assignmentMode: "all" | "selected";
  assignedEmployeeIds: string[];
};

export type ProjectMemberRateDetail = {
  employeeId: string;
  hourlyRate: number;
};

export type ProjectDetail = {
  id: string;
  customerId: string;
  name: string;
  code: string | null;
  color: string;
  status: "active" | "inactive";
  hourlyBudget: number | null;
  amountBudget: number | null;
  budgetAlertBasis: BudgetAlertBasis;
  defaultHourlyRate: number | null;
  tasks: ProjectTaskDetail[];
  memberRates: ProjectMemberRateDetail[];
};

export type ProjectDetailOptions = {
  customers: ProjectCustomerOption[];
  employees: ProjectEmployeeOption[];
};

type ProjectRow = {
  id: string;
  name: string;
  code: string | null;
  color: string;
  status: "active" | "inactive";
  hourly_budget: string | number | null;
  amount_budget: string | number | null;
  budget_alert_basis: BudgetAlertBasis;
  default_hourly_rate: string | number | null;
  customers:
    | {
        name: string;
      }
    | Array<{
        name: string;
      }>
    | null;
};

type ProjectLabelInput = {
  code: string | null;
  name: string;
};

type RelatedTask = {
  project_id: string;
};

type TimeEntryRow = {
  employee_id: string;
  duration_minutes: number;
  tasks:
    | RelatedTask
    | Array<RelatedTask>
    | null;
};

type MemberRateRow = {
  project_id: string;
  employee_id: string;
  hourly_rate: string | number;
};

function relatedCustomerName(customer: ProjectRow["customers"]) {
  if (Array.isArray(customer)) {
    return customer[0]?.name ?? "Ohne Kunde";
  }

  return customer?.name ?? "Ohne Kunde";
}

function relatedProjectId(task: TimeEntryRow["tasks"]) {
  if (Array.isArray(task)) {
    return task[0]?.project_id;
  }

  return task?.project_id;
}

type TaskRow = {
  id: string;
  project_id: string;
  status: "active" | "inactive";
};

type ProjectDetailRow = {
  id: string;
  customer_id: string;
  name: string;
  code: string | null;
  color: string;
  status: "active" | "inactive";
  hourly_budget: string | number | null;
  amount_budget: string | number | null;
  budget_alert_basis: BudgetAlertBasis;
  default_hourly_rate: string | number | null;
};

type TaskDetailRow = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  default_billable: boolean;
  assignment_mode: "all" | "selected";
  task_assignments: Array<{
    employee_id: string;
  }> | null;
};

type CustomerOptionRow = {
  id: string;
  name: string;
  status: "active" | "inactive";
};

type EmployeeOptionRow = {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
};

function getProjectName(project: ProjectLabelInput) {
  return project.code ? `${project.code} - ${project.name}` : project.name;
}

function toNumber(value: string | number | null) {
  if (value === null) {
    return null;
  }

  return typeof value === "number" ? value : Number(value);
}

export async function getProjectDetailOptions(): Promise<ProjectDetailOptions> {
  noStore();

  const admin = createSupabaseAdminClient();
  const [
    { data: customersData, error: customersError },
    { data: employeesData, error: employeesError },
  ] = await Promise.all([
    admin.from("customers").select("id, name, status").order("name"),
    admin.from("employees").select("id, name, email, status").order("name"),
  ]);

  if (customersError || employeesError) {
    throw new Error("Projektoptionen konnten nicht geladen werden.");
  }

  return {
    customers: ((customersData ?? []) as CustomerOptionRow[]).map((customer) => ({
      id: customer.id,
      name: customer.name,
      status: customer.status,
    })),
    employees: ((employeesData ?? []) as EmployeeOptionRow[]).map((employee) => ({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      status: employee.status,
    })),
  };
}

export async function getProjectDetail(
  projectId: string,
): Promise<ProjectDetail | null> {
  noStore();

  const admin = createSupabaseAdminClient();
  const { data: projectData, error: projectError } = await admin
    .from("projects")
    .select(
      "id, customer_id, name, code, color, status, hourly_budget, amount_budget, budget_alert_basis, default_hourly_rate",
    )
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw new Error("Projekt konnte nicht geladen werden.");
  }

  if (!projectData) {
    return null;
  }

  const [
    { data: tasksData, error: tasksError },
    { data: ratesData, error: ratesError },
  ] = await Promise.all([
    admin
      .from("tasks")
      .select(
        "id, name, description, status, default_billable, assignment_mode, task_assignments(employee_id)",
      )
      .eq("project_id", projectId)
      .order("name"),
    admin
      .from("project_member_rates")
      .select("employee_id, hourly_rate")
      .eq("project_id", projectId),
  ]);

  if (tasksError || ratesError) {
    throw new Error("Projektdetails konnten nicht geladen werden.");
  }

  const project = projectData as ProjectDetailRow;

  return {
    id: project.id,
    customerId: project.customer_id,
    name: project.name,
    code: project.code,
    color: project.color,
    status: project.status,
    hourlyBudget: toNumber(project.hourly_budget),
    amountBudget: toNumber(project.amount_budget),
    budgetAlertBasis: project.budget_alert_basis,
    defaultHourlyRate: toNumber(project.default_hourly_rate),
    tasks: ((tasksData ?? []) as unknown as TaskDetailRow[]).map((task) => ({
      id: task.id,
      name: task.name,
      description: task.description,
      status: task.status,
      defaultBillable: task.default_billable,
      assignmentMode: task.assignment_mode,
      assignedEmployeeIds: (task.task_assignments ?? []).map(
        (assignment) => assignment.employee_id,
      ),
    })),
    memberRates: ((ratesData ?? []) as MemberRateRow[]).map((rate) => ({
      employeeId: rate.employee_id,
      hourlyRate: Number(rate.hourly_rate),
    })),
  };
}

export async function getProjectOverview(): Promise<ProjectOverviewItem[]> {
  noStore();

  const admin = createSupabaseAdminClient();
  const { data: projectsData, error: projectsError } = await admin
    .from("projects")
    .select(
      "id, name, code, color, status, hourly_budget, amount_budget, budget_alert_basis, default_hourly_rate, customers(name)",
    )
    .order("name", { ascending: true });

  if (projectsError) {
    throw new Error("Projekte konnten nicht geladen werden.");
  }

  const projects = (projectsData ?? []) as unknown as ProjectRow[];

  if (projects.length === 0) {
    return [];
  }

  const [
    { data: tasksData, error: tasksError },
    { data: entriesData, error: entriesError },
    { data: ratesData, error: ratesError },
  ] = await Promise.all([
    admin.from("tasks").select("id, project_id, status"),
    admin
      .from("time_entries")
      .select("employee_id, duration_minutes, tasks!inner(project_id)"),
    admin
      .from("project_member_rates")
      .select("project_id, employee_id, hourly_rate"),
  ]);

  if (tasksError || entriesError || ratesError) {
    throw new Error("Projektkennzahlen konnten nicht geladen werden.");
  }

  const tasksByProject = new Map<string, TaskRow[]>();
  for (const task of (tasksData ?? []) as TaskRow[]) {
    const tasks = tasksByProject.get(task.project_id) ?? [];
    tasks.push(task);
    tasksByProject.set(task.project_id, tasks);
  }

  const entriesByProject = new Map<
    string,
    Array<{ durationMinutes: number; employeeId: string }>
  >();
  for (const entry of (entriesData ?? []) as unknown as TimeEntryRow[]) {
    const projectId = relatedProjectId(entry.tasks);

    if (!projectId) {
      continue;
    }

    const entries = entriesByProject.get(projectId) ?? [];
    entries.push({
      durationMinutes: entry.duration_minutes,
      employeeId: entry.employee_id,
    });
    entriesByProject.set(projectId, entries);
  }

  const ratesByProject = new Map<
    string,
    Array<{ employeeId: string; hourlyRate: number }>
  >();
  for (const rate of (ratesData ?? []) as MemberRateRow[]) {
    const rates = ratesByProject.get(rate.project_id) ?? [];
    rates.push({
      employeeId: rate.employee_id,
      hourlyRate: Number(rate.hourly_rate),
    });
    ratesByProject.set(rate.project_id, rates);
  }

  return projects
    .map((project) => {
      const projectTasks = tasksByProject.get(project.id) ?? [];
      const hourlyBudget = toNumber(project.hourly_budget);
      const amountBudget = toNumber(project.amount_budget);
      const defaultHourlyRate = toNumber(project.default_hourly_rate);
      const budgetSummary = calculateProjectBudgetSummary({
        hourlyBudget,
        amountBudget,
        defaultHourlyRate,
        budgetAlertBasis: project.budget_alert_basis,
        entries: entriesByProject.get(project.id) ?? [],
        memberRates: ratesByProject.get(project.id) ?? [],
      });

      return {
        id: project.id,
        customerName: relatedCustomerName(project.customers),
        name: project.name,
        code: project.code,
        color: project.color,
        status: project.status,
        hourlyBudget,
        amountBudget,
        budgetAlertBasis: budgetSummary.basis,
        defaultHourlyRate,
        usedHours: budgetSummary.usedHours,
        usedAmount: budgetSummary.usedAmount,
        remainingHours: budgetSummary.remainingHours,
        remainingAmount: budgetSummary.remainingAmount,
        hoursUsagePercent: budgetSummary.hoursUsagePercent,
        amountUsagePercent: budgetSummary.amountUsagePercent,
        budgetStatus: budgetSummary.status,
        activeTaskCount: projectTasks.filter((task) => task.status === "active")
          .length,
        totalTaskCount: projectTasks.length,
      };
    })
    .sort((a, b) => {
      const customerCompare = a.customerName.localeCompare(b.customerName, "de");

      if (customerCompare !== 0) {
        return customerCompare;
      }

      return getProjectName(a).localeCompare(getProjectName(b), "de");
    });
}

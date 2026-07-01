"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoScrollLink } from "@/features/reports/navigation/no-scroll-link";
import {
  reportQuickFilters,
  type ReportFilterState,
} from "./domain";

type EmployeeRole = "admin" | "employee";

type ReportFilterOptions = {
  customers: Array<{
    id: string;
    name: string;
  }>;
  projects: Array<{
    id: string;
    customerId: string;
    name: string;
    code: string | null;
  }>;
  tasks: Array<{
    id: string;
    projectId: string;
    name: string;
  }>;
  employees: Array<{
    id: string;
    name: string;
    status: "active" | "inactive";
  }>;
};

type ReportFiltersProps = {
  filters: ReportFilterState;
  options: ReportFilterOptions;
  role: EmployeeRole;
};

type HierarchySelection = {
  customerId: string;
  projectId: string;
  taskId: string;
};

function projectLabel(project: ReportFilterOptions["projects"][number]) {
  return project.code ? `${project.code} - ${project.name}` : project.name;
}

function projectMatchesCustomer(
  project: ReportFilterOptions["projects"][number],
  customerId: string,
) {
  return !customerId || project.customerId === customerId;
}

function taskMatchesHierarchy({
  task,
  options,
  customerId,
  projectId,
}: {
  task: ReportFilterOptions["tasks"][number];
  options: ReportFilterOptions;
  customerId: string;
  projectId: string;
}) {
  if (projectId) {
    return task.projectId === projectId;
  }

  if (!customerId) {
    return true;
  }

  return options.projects.some(
    (project) => project.id === task.projectId && project.customerId === customerId,
  );
}

function normalizeHierarchySelection({
  selection,
  options,
}: {
  selection: HierarchySelection;
  options: ReportFilterOptions;
}): HierarchySelection {
  const customerId = options.customers.some(
    (customer) => customer.id === selection.customerId,
  )
    ? selection.customerId
    : "";
  const project = options.projects.find(
    (option) => option.id === selection.projectId,
  );
  const projectId =
    project && projectMatchesCustomer(project, customerId) ? project.id : "";
  const task = options.tasks.find((option) => option.id === selection.taskId);
  const taskId =
    task &&
    taskMatchesHierarchy({
      task,
      options,
      customerId,
      projectId,
    })
      ? task.id
      : "";

  return {
    customerId,
    projectId,
    taskId,
  };
}

function reportsUrlFromForm(form: HTMLFormElement) {
  const params = new URLSearchParams();
  const formData = new FormData(form);

  for (const [name, value] of formData.entries()) {
    if (typeof value === "string" && value) {
      params.set(name, value);
    }
  }

  const query = params.toString();

  return query ? `/berichte?${query}` : "/berichte";
}

export function ReportFilters({ filters, options, role }: ReportFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hierarchy, setHierarchy] = useState<HierarchySelection>(() =>
    normalizeHierarchySelection({
      selection: {
        customerId: filters.customerId,
        projectId: filters.projectId,
        taskId: filters.taskId,
      },
      options,
    }),
  );
  const filteredProjects = useMemo(
    () =>
      options.projects.filter((project) =>
        projectMatchesCustomer(project, hierarchy.customerId),
      ),
    [hierarchy.customerId, options.projects],
  );
  const filteredTasks = useMemo(
    () =>
      options.tasks.filter((task) =>
        taskMatchesHierarchy({
          task,
          options,
          customerId: hierarchy.customerId,
          projectId: hierarchy.projectId,
        }),
      ),
    [hierarchy.customerId, hierarchy.projectId, options],
  );

  function updateHierarchy(selection: HierarchySelection) {
    setHierarchy(
      normalizeHierarchySelection({
        selection,
        options,
      }),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const href = reportsUrlFromForm(event.currentTarget);

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return (
    <form
      className="grid gap-4 rounded-md border bg-card p-4 sm:p-5"
      method="get"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_150px_150px]">
        <label className="grid gap-1 text-sm font-medium">
          Zeitraum
          <select
            className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            defaultValue={filters.quickFilter}
            name="quick"
          >
            {reportQuickFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Von
          <input
            className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            defaultValue={filters.startDate}
            name="start"
            type="date"
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Bis
          <input
            className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            defaultValue={filters.endDate}
            name="end"
            type="date"
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <label className="grid gap-1 text-sm font-medium">
          Kunde
          <select
            className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            name="customer"
            onChange={(event) =>
              updateHierarchy({
                customerId: event.target.value,
                projectId: hierarchy.projectId,
                taskId: hierarchy.taskId,
              })
            }
            value={hierarchy.customerId}
          >
            <option value="">Alle</option>
            {options.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Projekt
          <select
            className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            name="project"
            onChange={(event) =>
              updateHierarchy({
                customerId: hierarchy.customerId,
                projectId: event.target.value,
                taskId: hierarchy.taskId,
              })
            }
            value={hierarchy.projectId}
          >
            <option value="">Alle</option>
            {filteredProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {projectLabel(project)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Aufgabe
          <select
            className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            name="task"
            onChange={(event) =>
              updateHierarchy({
                customerId: hierarchy.customerId,
                projectId: hierarchy.projectId,
                taskId: event.target.value,
              })
            }
            value={hierarchy.taskId}
          >
            <option value="">Alle</option>
            {filteredTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          </select>
        </label>

        {role === "admin" ? (
          <label className="grid gap-1 text-sm font-medium">
            Mitarbeitende
            <select
              className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              defaultValue={filters.employeeId}
              name="employee"
            >
              <option value="">Alle</option>
              {options.employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                  {employee.status === "inactive" ? " (inaktiv)" : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="grid gap-1 text-sm font-medium">
          Abrechenbar
          <select
            className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            defaultValue={filters.billable}
            name="billable"
          >
            <option value="all">Alle</option>
            <option value="billable">Ja</option>
            <option value="non-billable">Nein</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <NoScrollLink href="/berichte">Zurücksetzen</NoScrollLink>
        </Button>
        <Button disabled={isPending} type="submit">
          <Filter className="size-4" aria-hidden="true" />
          Anwenden
        </Button>
      </div>
    </form>
  );
}

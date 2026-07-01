"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { ChevronDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoScrollLink } from "@/features/reports/navigation/no-scroll-link";
import { cn } from "@/lib/utils";
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
  customerIds: string[];
  projectIds: string[];
  taskIds: string[];
};

type MultiSelectOption = {
  id: string;
  label: string;
  mutedLabel?: string;
};

function projectLabel(project: ReportFilterOptions["projects"][number]) {
  return project.code ? `${project.code} - ${project.name}` : project.name;
}

function projectMatchesCustomer(
  project: ReportFilterOptions["projects"][number],
  customerIds: string[],
) {
  return customerIds.length === 0 || customerIds.includes(project.customerId);
}

function taskMatchesHierarchy({
  task,
  options,
  customerIds,
  projectIds,
}: {
  task: ReportFilterOptions["tasks"][number];
  options: ReportFilterOptions;
  customerIds: string[];
  projectIds: string[];
}) {
  if (projectIds.length > 0) {
    return projectIds.includes(task.projectId);
  }

  if (customerIds.length === 0) {
    return true;
  }

  return options.projects.some(
    (project) =>
      project.id === task.projectId && customerIds.includes(project.customerId),
  );
}

function onlyKnownValues(values: string[], allowedValues: Set<string>) {
  return values.filter((value) => allowedValues.has(value));
}

function normalizeHierarchySelection({
  selection,
  options,
}: {
  selection: HierarchySelection;
  options: ReportFilterOptions;
}): HierarchySelection {
  const customerIds = onlyKnownValues(
    selection.customerIds,
    new Set(options.customers.map((customer) => customer.id)),
  );
  const projectIds = onlyKnownValues(
    selection.projectIds,
    new Set(
      options.projects
        .filter((project) => projectMatchesCustomer(project, customerIds))
        .map((project) => project.id),
    ),
  );
  const taskIds = onlyKnownValues(
    selection.taskIds,
    new Set(
      options.tasks
        .filter((task) =>
          taskMatchesHierarchy({
            task,
            options,
            customerIds,
            projectIds,
          }),
        )
        .map((task) => task.id),
    ),
  );

  return {
    customerIds,
    projectIds,
    taskIds,
  };
}

function reportsUrlFromForm(form: HTMLFormElement) {
  const params = new URLSearchParams();
  const formData = new FormData(form);

  for (const [name, value] of formData.entries()) {
    if (typeof value === "string" && value) {
      params.append(name, value);
    }
  }

  const query = params.toString();

  return query ? `/berichte?${query}` : "/berichte";
}

function selectionSummary({
  options,
  selectedValues,
}: {
  options: MultiSelectOption[];
  selectedValues: string[];
}) {
  if (selectedValues.length === 0) {
    return "Alle";
  }

  if (selectedValues.length === 1) {
    return options.find((option) => option.id === selectedValues[0])?.label ?? "1 ausgewählt";
  }

  return `${selectedValues.length} ausgewählt`;
}

function toggleSelection(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function MultiSelectField({
  label,
  name,
  options,
  selectedValues,
  isOpen,
  onChange,
  onOpenChange,
}: {
  label: string;
  name: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  isOpen: boolean;
  onChange: (values: string[]) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, onOpenChange]);

  return (
    <fieldset className="grid gap-1 text-sm font-medium">
      <legend>{label}</legend>
      {selectedValues.map((value) => (
        <input key={value} name={name} type="hidden" value={value} />
      ))}
      <div className="relative" ref={containerRef}>
        <button
          aria-expanded={isOpen}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border bg-background px-3 text-left text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
          onClick={() => onOpenChange(!isOpen)}
          type="button"
        >
          <span className="truncate">
            {selectionSummary({ options, selectedValues })}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition",
              isOpen ? "rotate-180" : undefined,
            )}
            aria-hidden="true"
          />
        </button>
        {isOpen ? (
          <div className="absolute z-30 mt-2 grid max-h-72 w-full min-w-64 gap-1 overflow-y-auto rounded-md border bg-popover p-2 text-popover-foreground shadow-lg">
            <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 text-sm font-normal hover:bg-secondary">
              <input
                checked={selectedValues.length === 0}
                className="size-4 accent-primary"
                onChange={() => onChange([])}
                type="checkbox"
              />
              Alle
            </label>
            {options.map((option) => (
              <label
                className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 text-sm font-normal hover:bg-secondary"
                key={option.id}
              >
                <input
                  checked={selectedValues.includes(option.id)}
                  className="size-4 accent-primary"
                  onChange={() =>
                    onChange(toggleSelection(selectedValues, option.id))
                  }
                  type="checkbox"
                />
                <span className="min-w-0 flex-1 truncate">
                  {option.label}
                  {option.mutedLabel ? (
                    <span className="text-muted-foreground">
                      {" "}
                      {option.mutedLabel}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}

export function ReportFilters({ filters, options, role }: ReportFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [hierarchy, setHierarchy] = useState<HierarchySelection>(() =>
    normalizeHierarchySelection({
      selection: {
        customerIds: filters.customerIds,
        projectIds: filters.projectIds,
        taskIds: filters.taskIds,
      },
      options,
    }),
  );
  const [employeeIds, setEmployeeIds] = useState(() =>
    onlyKnownValues(
      filters.employeeIds,
      new Set(options.employees.map((employee) => employee.id)),
    ),
  );
  const customerOptions = useMemo(
    () =>
      options.customers.map((customer) => ({
        id: customer.id,
        label: customer.name,
      })),
    [options.customers],
  );
  const filteredProjects = useMemo(
    () =>
      options.projects.filter((project) =>
        projectMatchesCustomer(project, hierarchy.customerIds),
      ),
    [hierarchy.customerIds, options.projects],
  );
  const projectOptions = useMemo(
    () =>
      filteredProjects.map((project) => ({
        id: project.id,
        label: projectLabel(project),
      })),
    [filteredProjects],
  );
  const filteredTasks = useMemo(
    () =>
      options.tasks.filter((task) =>
        taskMatchesHierarchy({
          task,
          options,
          customerIds: hierarchy.customerIds,
          projectIds: hierarchy.projectIds,
        }),
      ),
    [hierarchy.customerIds, hierarchy.projectIds, options],
  );
  const taskOptions = useMemo(
    () =>
      filteredTasks.map((task) => ({
        id: task.id,
        label: task.name,
      })),
    [filteredTasks],
  );
  const employeeOptions = useMemo(
    () =>
      options.employees.map((employee) => ({
        id: employee.id,
        label: employee.name,
        mutedLabel: employee.status === "inactive" ? "(inaktiv)" : undefined,
      })),
    [options.employees],
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
        <MultiSelectField
          label="Kunde"
          name="customer"
          isOpen={openFilter === "customer"}
          onChange={(customerIds) =>
            updateHierarchy({
              customerIds,
              projectIds: hierarchy.projectIds,
              taskIds: hierarchy.taskIds,
            })
          }
          onOpenChange={(open) => setOpenFilter(open ? "customer" : null)}
          options={customerOptions}
          selectedValues={hierarchy.customerIds}
        />

        <MultiSelectField
          label="Projekt"
          name="project"
          isOpen={openFilter === "project"}
          onChange={(projectIds) =>
            updateHierarchy({
              customerIds: hierarchy.customerIds,
              projectIds,
              taskIds: hierarchy.taskIds,
            })
          }
          onOpenChange={(open) => setOpenFilter(open ? "project" : null)}
          options={projectOptions}
          selectedValues={hierarchy.projectIds}
        />

        <MultiSelectField
          label="Aufgabe"
          name="task"
          isOpen={openFilter === "task"}
          onChange={(taskIds) =>
            updateHierarchy({
              customerIds: hierarchy.customerIds,
              projectIds: hierarchy.projectIds,
              taskIds,
            })
          }
          onOpenChange={(open) => setOpenFilter(open ? "task" : null)}
          options={taskOptions}
          selectedValues={hierarchy.taskIds}
        />

        {role === "admin" ? (
          <MultiSelectField
            label="Mitarbeitende"
            name="employee"
            isOpen={openFilter === "employee"}
            onChange={setEmployeeIds}
            onOpenChange={(open) => setOpenFilter(open ? "employee" : null)}
            options={employeeOptions}
            selectedValues={employeeIds}
          />
        ) : null}

        <label
          className={cn(
            "grid gap-1 text-sm font-medium",
            role !== "admin" ? "lg:col-start-4" : undefined,
          )}
        >
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

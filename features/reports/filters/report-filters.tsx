import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmployeeRole } from "@/lib/auth/require-session";
import {
  reportQuickFilters,
  type ReportFilterState,
} from "./domain";
import type { ReportFilterOptions } from "./queries";

type ReportFiltersProps = {
  filters: ReportFilterState;
  options: ReportFilterOptions;
  role: EmployeeRole;
};

function projectLabel(project: ReportFilterOptions["projects"][number]) {
  return project.code ? `${project.code} - ${project.name}` : project.name;
}

export function ReportFilters({ filters, options, role }: ReportFiltersProps) {
  return (
    <form className="grid gap-4 rounded-md border bg-card p-4 sm:p-5">
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
            defaultValue={filters.customerId}
            name="customer"
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
            defaultValue={filters.projectId}
            name="project"
          >
            <option value="">Alle</option>
            {options.projects.map((project) => (
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
            defaultValue={filters.taskId}
            name="task"
          >
            <option value="">Alle</option>
            {options.tasks.map((task) => (
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

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <a href="/berichte">Zuruecksetzen</a>
        </Button>
        <Button type="submit">
          <Filter className="size-4" aria-hidden="true" />
          Anwenden
        </Button>
      </div>
    </form>
  );
}

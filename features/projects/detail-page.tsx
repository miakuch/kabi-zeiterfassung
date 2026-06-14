import Link from "next/link";
import { ArrowLeft, CircleAlert, Plus, Save } from "lucide-react";
import {
  createProject,
  updateProject,
  upsertMemberRate,
  upsertTask,
} from "./actions";
import {
  type ProjectDetail,
  type ProjectDetailOptions,
  type ProjectTaskDetail,
} from "./queries";

type ProjectDetailPageProps = {
  mode: "create" | "edit";
  project: ProjectDetail | null;
  options: ProjectDetailOptions;
  searchParams: {
    error?: string;
    success?: string;
  };
};

const errorMessages: Record<string, string> = {
  "aufgabe": "Die Aufgabe konnte nicht gespeichert werden.",
  "aufgabe-vergeben": "Diese Aufgabe existiert in diesem Projekt bereits.",
  "speichern": "Das Projekt konnte nicht gespeichert werden.",
  "stundensatz": "Der Stundensatz konnte nicht gespeichert werden.",
  "ungueltige-eingabe": "Bitte prüfe die Eingaben.",
};

const successMessages: Record<string, string> = {
  "angelegt": "Projekt wurde angelegt.",
  "aktualisiert": "Projekt wurde aktualisiert.",
  "aufgabe": "Aufgabe wurde gespeichert.",
  "stundensatz": "Stundensatz wurde gespeichert.",
};

function inputValue(value: string | number | null) {
  return value === null ? "" : String(value);
}

function hasNoBookableEmployees(task: ProjectTaskDetail) {
  return (
    task.status === "active" &&
    task.assignmentMode === "selected" &&
    task.assignedEmployeeIds.length === 0
  );
}

export function ProjectDetailPage({
  mode,
  project,
  options,
  searchParams,
}: ProjectDetailPageProps) {
  const isEdit = mode === "edit" && project;
  const action = isEdit ? updateProject : createProject;
  const errorMessage = searchParams.error
    ? errorMessages[searchParams.error]
    : undefined;
  const successMessage = searchParams.success
    ? successMessages[searchParams.success]
    : undefined;
  const projectId = project?.id;
  const ratesByEmployee = new Map(
    (project?.memberRates ?? []).map((rate) => [rate.employeeId, rate.hourlyRate]),
  );

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            className="inline-flex min-h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary"
            href="/projekte"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Zurück
          </Link>
          <p className="mt-5 text-sm font-medium text-muted-foreground">
            Stammdaten
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            {isEdit ? "Projekt bearbeiten" : "Neues Projekt"}
          </h1>
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-destructive/30 bg-card px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm text-accent-foreground">
          {successMessage}
        </p>
      ) : null}

      <form action={action} className="grid gap-5 rounded-md border bg-card p-5">
        {projectId ? <input name="projectId" type="hidden" value={projectId} /> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Kunde
            <select
              className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              defaultValue={project?.customerId ?? ""}
              name="customerId"
              required
            >
              <option value="" disabled>
                Kunde wählen
              </option>
              {options.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.status === "inactive" ? " (inaktiv)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium">
            Projektname
            <input
              className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              defaultValue={project?.name ?? ""}
              maxLength={160}
              name="name"
              required
            />
          </label>

          <label className="grid gap-1 text-sm font-medium">
            Projektkennung
            <input
              className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              defaultValue={project?.code ?? ""}
              name="code"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
            <label className="grid gap-1 text-sm font-medium">
              Status
              <select
                className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                defaultValue={project?.status ?? "active"}
                name="status"
              >
                <option value="active">Aktiv</option>
                <option value="inactive">Inaktiv</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Farbe
              <input
                className="min-h-11 rounded-md border bg-background px-2"
                defaultValue={project?.color ?? "#2498ac"}
                name="color"
                type="color"
              />
            </label>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <label className="grid gap-1 text-sm font-medium">
            Stundenbudget
            <input
              className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              defaultValue={inputValue(project?.hourlyBudget ?? null)}
              min="0"
              name="hourlyBudget"
              step="0.01"
              type="number"
            />
          </label>

          <label className="grid gap-1 text-sm font-medium">
            Betragsbudget
            <input
              className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              defaultValue={inputValue(project?.amountBudget ?? null)}
              min="0"
              name="amountBudget"
              step="0.01"
              type="number"
            />
          </label>

          <label className="grid gap-1 text-sm font-medium">
            Budgetbasis
            <select
              className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              defaultValue={project?.budgetAlertBasis ?? ""}
              name="budgetAlertBasis"
            >
              <option value="">Automatisch</option>
              <option value="hours">Stunden</option>
              <option value="amount">Betrag</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium">
            Standardstundensatz
            <input
              className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              defaultValue={inputValue(project?.defaultHourlyRate ?? null)}
              min="0"
              name="defaultHourlyRate"
              step="0.01"
              type="number"
            />
          </label>
        </div>

        {!isEdit ? (
          <label className="flex items-start gap-3 rounded-md border bg-background px-3 py-3 text-sm">
            <input
              className="mt-1"
              defaultChecked
              name="createGeneralTask"
              type="checkbox"
              value="1"
            />
            <span>
              Standardaufgabe Allgemein anlegen. Die Aufgabe wird nicht
              automatisch für alle freigegeben.
            </span>
          </label>
        ) : null}

        <div className="flex justify-end">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[#1d7d90]"
            type="submit"
          >
            <Save className="size-4" aria-hidden="true" />
            Projekt speichern
          </button>
        </div>
      </form>

      {isEdit ? (
        <>
          <section className="grid gap-4 rounded-md border bg-card p-5">
            <div>
              <h2 className="text-lg font-semibold">Aufgaben und Freigaben</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Aufgaben sind die buchbare Einheit für die Zeiterfassung.
              </p>
            </div>

            <form
              action={upsertTask}
              className="grid gap-3 rounded-md border bg-background p-3 lg:grid-cols-[1fr_1fr_140px_150px] lg:items-end"
            >
              <input name="projectId" type="hidden" value={project.id} />
              <label className="grid gap-1 text-sm font-medium">
                Neue Aufgabe
                <input
                  className="min-h-11 rounded-md border bg-card px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                  name="name"
                  required
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Beschreibung
                <input
                  className="min-h-11 rounded-md border bg-card px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                  name="description"
                />
              </label>
              <input name="status" type="hidden" value="active" />
              <input name="assignmentMode" type="hidden" value="selected" />
              <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                <input defaultChecked name="defaultBillable" type="checkbox" value="1" />
                Abrechenbar
              </label>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[#1d7d90]"
                type="submit"
              >
                <Plus className="size-4" aria-hidden="true" />
                Aufgabe anlegen
              </button>
            </form>

            <div className="grid gap-4">
              {project.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Noch keine Aufgaben angelegt.
                </p>
              ) : null}

              {project.tasks.map((task) => (
                <form
                  action={upsertTask}
                  className="grid gap-3 rounded-md border bg-background p-3"
                  key={task.id}
                >
                  <input name="projectId" type="hidden" value={project.id} />
                  <input name="taskId" type="hidden" value={task.id} />

                  {hasNoBookableEmployees(task) ? (
                    <p className="flex gap-2 rounded-md bg-[#fff8e6] px-3 py-2 text-sm text-[#6f4f00]">
                      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      Diese aktive Aufgabe ist für niemanden buchbar.
                    </p>
                  ) : null}

                  <div className="grid gap-3 lg:grid-cols-[1fr_1fr_140px_150px]">
                    <label className="grid gap-1 text-sm font-medium">
                      Aufgabe
                      <input
                        className="min-h-11 rounded-md border bg-card px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                        defaultValue={task.name}
                        name="name"
                        required
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                      Beschreibung
                      <input
                        className="min-h-11 rounded-md border bg-card px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                        defaultValue={task.description ?? ""}
                        name="description"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                      Status
                      <select
                        className="min-h-11 rounded-md border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                        defaultValue={task.status}
                        name="status"
                      >
                        <option value="active">Aktiv</option>
                        <option value="inactive">Inaktiv</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                      Freigabe
                      <select
                        className="min-h-11 rounded-md border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                        defaultValue={task.assignmentMode}
                        name="assignmentMode"
                      >
                        <option value="selected">Ausgewählt</option>
                        <option value="all">Alle</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                    <fieldset className="grid gap-2">
                      <legend className="text-sm font-medium">
                        Ausgewählte Mitarbeitende
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {options.employees.map((employee) => (
                          <label
                            className="flex min-h-10 items-center gap-2 rounded-md border bg-card px-3 text-sm"
                            key={employee.id}
                          >
                            <input
                              defaultChecked={task.assignedEmployeeIds.includes(
                                employee.id,
                              )}
                              name="assignedEmployeeIds"
                              type="checkbox"
                              value={employee.id}
                            />
                            <span className="truncate">
                              {employee.name}
                              {employee.status === "inactive" ? " (inaktiv)" : ""}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                        <input
                          defaultChecked={task.defaultBillable}
                          name="defaultBillable"
                          type="checkbox"
                          value="1"
                        />
                        Abrechenbar
                      </label>
                      <button
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border bg-card px-4 text-sm font-medium transition hover:bg-secondary"
                        type="submit"
                      >
                        <Save className="size-4" aria-hidden="true" />
                        Speichern
                      </button>
                    </div>
                  </div>
                </form>
              ))}
            </div>
          </section>

          <section className="grid gap-4 rounded-md border bg-card p-5">
            <div>
              <h2 className="text-lg font-semibold">
                Abweichende Mitarbeitenden-Stundensätze
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Leeres Feld bedeutet: Projekt-Standardstundensatz verwenden.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {options.employees.map((employee) => (
                <form
                  action={upsertMemberRate}
                  className="grid gap-2 rounded-md border bg-background p-3"
                  key={employee.id}
                >
                  <input name="projectId" type="hidden" value={project.id} />
                  <input name="employeeId" type="hidden" value={employee.id} />
                  <label className="grid gap-1 text-sm font-medium">
                    {employee.name}
                    <input
                      className="min-h-11 rounded-md border bg-card px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                      defaultValue={inputValue(ratesByEmployee.get(employee.id) ?? null)}
                      min="0"
                      name="hourlyRate"
                      step="0.01"
                      type="number"
                    />
                  </label>
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border bg-card px-3 text-sm font-medium transition hover:bg-secondary"
                    type="submit"
                  >
                    <Save className="size-4" aria-hidden="true" />
                    Speichern
                  </button>
                </form>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}

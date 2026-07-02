import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { FlashMessage } from "@/components/flash-message";
import { StatusTabs } from "@/features/admin/status-tabs";
import { MemberRateForm } from "@/features/projects/member-rate-form";
import { ProjectMasterForm } from "@/features/projects/project-master-form";
import { TaskEditForm } from "@/features/projects/task-edit-form";
import { TaskAssignmentFields } from "@/features/projects/task-assignment-fields";
import { upsertTask } from "./actions";
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
    taskStatus?: string;
  };
};

const errorMessages: Record<string, string> = {
  "aufgabe": "Die Aufgabe konnte nicht gespeichert werden.",
  "aufgabe-loeschen": "Die Aufgabe konnte nicht gelöscht werden.",
  "aufgabe-loeschen-verwendet":
    "Die Aufgabe kann nicht gelöscht werden, weil bereits Zeiten oder Timer-Entwürfe darauf verweisen.",
  "aufgabe-nicht-gefunden": "Diese Aufgabe wurde nicht gefunden.",
  "aufgabe-vergeben": "Diese Aufgabe existiert in diesem Projekt bereits.",
  "speichern": "Das Projekt konnte nicht gespeichert werden.",
  "stundensatz": "Der Stundensatz konnte nicht gespeichert werden.",
  "ungueltige-eingabe": "Bitte prüfe die Eingaben.",
};

const successMessages: Record<string, string> = {
  "angelegt": "Projekt wurde angelegt.",
  "aktualisiert": "Projekt wurde aktualisiert.",
  "aufgabe": "Aufgabe wurde gespeichert.",
  "aufgabe-geloescht": "Aufgabe wurde gelöscht.",
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
  const isTaskError = searchParams.error?.startsWith("aufgabe") === true;
  const isTaskSuccess = searchParams.success?.startsWith("aufgabe") === true;
  const errorMessage = searchParams.error && !isTaskError
    ? errorMessages[searchParams.error]
    : undefined;
  const successMessage = searchParams.success && !isTaskSuccess
    ? successMessages[searchParams.success]
    : undefined;
  const taskErrorMessage =
    searchParams.error && isTaskError
      ? errorMessages[searchParams.error]
      : undefined;
  const taskSuccessMessage =
    searchParams.success && isTaskSuccess
      ? successMessages[searchParams.success]
      : undefined;
  const activeTaskStatus =
    searchParams.taskStatus === "inactive" ? "inactive" : "active";
  const activeTasks =
    project?.tasks.filter((task) => task.status === "active") ?? [];
  const inactiveTasks =
    project?.tasks.filter((task) => task.status === "inactive") ?? [];
  const visibleTasks =
    activeTaskStatus === "active" ? activeTasks : inactiveTasks;
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

      {taskErrorMessage ? <FlashMessage message={taskErrorMessage} /> : null}

      <ProjectMasterForm mode={mode} options={options} project={project} />

      {isEdit ? (
        <>
          <section className="grid gap-4 rounded-md border bg-card p-5">
            <div>
              <h2 className="text-lg font-semibold">Aufgaben und Freigaben</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Aufgaben sind die buchbare Einheit für die Zeiterfassung.
              </p>
            </div>

            <StatusTabs
              activeCount={activeTasks.length}
              activeStatus={activeTaskStatus}
              basePath={`/projekte/${project.id}`}
              inactiveCount={inactiveTasks.length}
              queryKey="taskStatus"
            />

            {taskSuccessMessage ? (
              <p className="rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm text-accent-foreground">
                {taskSuccessMessage}
              </p>
            ) : null}

            <form
              action={upsertTask}
              className="grid gap-3 rounded-md border bg-background p-3"
              data-preserve-scroll="true"
            >
              <input name="projectId" type="hidden" value={project.id} />
              <input name="status" type="hidden" value="active" />
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_150px_auto] lg:items-end">
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
                <TaskAssignmentFields
                  defaultMode="all"
                  employees={options.employees}
                />
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[#1d7d90]"
                  type="submit"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Aufgabe anlegen
                </button>
              </div>

              <div className="flex justify-end">
                <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                  <input
                    defaultChecked
                    name="defaultBillable"
                    type="checkbox"
                    value="1"
                  />
                  Abrechenbar
                </label>
              </div>
            </form>

            <div className="grid gap-4">
              {project.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Noch keine Aufgaben angelegt.
                </p>
              ) : visibleTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {activeTaskStatus === "active"
                    ? "Keine aktiven Aufgaben vorhanden."
                    : "Keine inaktiven Aufgaben vorhanden."}
                </p>
              ) : null}

              {visibleTasks.map((task) => (
                <TaskEditForm
                  activeTaskStatus={activeTaskStatus}
                  hasNoBookableEmployees={hasNoBookableEmployees(task)}
                  key={task.id}
                  options={options}
                  projectId={project.id}
                  task={task}
                />
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
                <MemberRateForm
                  employeeId={employee.id}
                  employeeName={employee.name}
                  hourlyRate={inputValue(ratesByEmployee.get(employee.id) ?? null)}
                  key={employee.id}
                  projectId={project.id}
                />
              ))}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}

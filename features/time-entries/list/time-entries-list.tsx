"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Copy,
  Euro,
  Pencil,
  Play,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskPickerItem } from "@/features/tasks/task-picker/queries";
import {
  continueTimeEntryAction,
  deleteTimeEntryAction,
  initialTimeEntryEditActionState,
  toggleTimeEntryBillableAction,
  updateTimeEntriesPageSizeAction,
  upsertTimeEntryFromListAction,
} from "./actions";
import {
  formatDuration,
  formatGermanDate,
  type TimeEntryListGroup,
} from "./domain";
import type {
  TimeEntryListItem,
  TimeEntryListResult,
} from "./queries";

type TimeEntriesListProps = {
  result: TimeEntryListResult;
  tasks: TaskPickerItem[];
};

type EditorMode = "edit" | "duplicate";

type EditorState = {
  mode: EditorMode;
  entry: TimeEntryListItem;
} | null;

const fieldLabels = {
  taskId: "Aufgabe",
  description: "Beschreibung",
  workDate: "Datum",
  startTime: "Start",
  endTime: "Ende",
  durationMinutes: "Dauer",
} as const;

function trimSeconds(value: string) {
  return value.slice(0, 5);
}

function entryContext(entry: TimeEntryListItem) {
  const project = entry.projectCode
    ? `${entry.projectCode} - ${entry.projectName}`
    : entry.projectName;

  return `${project}: ${entry.taskName} - ${entry.customerName}`;
}

function fieldErrorMessage(field: keyof typeof fieldLabels, error?: string) {
  if (!error) {
    return null;
  }

  if (error === "crosses-midnight") {
    return `${fieldLabels[field]} verlaeuft ueber Mitternacht.`;
  }

  if (error === "end-not-after-start") {
    return "Ende muss nach Start liegen.";
  }

  if (error === "invalid-time") {
    return `${fieldLabels[field]} ist ungueltig.`;
  }

  if (error === "invalid-date") {
    return "Datum ist ungueltig.";
  }

  return `${fieldLabels[field]} ist erforderlich.`;
}

function pageHref(page: number) {
  return `/zeiten?page=${page}`;
}

function DayGroup({
  group,
  onDelete,
  onEdit,
  onDuplicate,
}: {
  group: TimeEntryListGroup<TimeEntryListItem>;
  onDelete: (entry: TimeEntryListItem) => void;
  onEdit: (entry: TimeEntryListItem) => void;
  onDuplicate: (entry: TimeEntryListItem) => void;
}) {
  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-sm">
        <h3 className="font-semibold">{formatGermanDate(group.workDate)}</h3>
        <p className="font-mono font-semibold">
          {formatDuration(group.totalDurationMinutes)}
        </p>
      </div>

      <div className="grid gap-2">
        {group.entries.map((entry) => (
          <article
            className="grid gap-3 rounded-md border bg-background p-3 transition hover:border-primary"
            key={entry.id}
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <button
                className="grid min-w-0 gap-1 text-left"
                onClick={() => onEdit(entry)}
                type="button"
              >
                <span className="truncate text-sm font-semibold">
                  {entry.description}
                </span>
                <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className="size-2.5 shrink-0 rounded-full border"
                    style={{ backgroundColor: entry.projectColor }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{entryContext(entry)}</span>
                </span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-[140px] rounded-md bg-card px-2 py-1 text-center font-mono text-sm">
                  {trimSeconds(entry.startTime)}-{trimSeconds(entry.endTime)}
                </span>
                <span className="min-w-[66px] rounded-md bg-card px-2 py-1 text-center font-mono text-sm">
                  {formatDuration(entry.durationMinutes)}
                </span>

                <form action={toggleTimeEntryBillableAction}>
                  <input name="entryId" type="hidden" value={entry.id} />
                  <input
                    name="billable"
                    type="hidden"
                    value={entry.billable ? "0" : "1"}
                  />
                  <Button
                    className={cn(
                      "size-9 px-0",
                      entry.billable
                        ? "bg-primary text-primary-foreground hover:bg-[#1d7d90]"
                        : "border bg-background text-muted-foreground hover:bg-secondary",
                    )}
                    title={entry.billable ? "Abrechenbar" : "Nicht abrechenbar"}
                    type="submit"
                    variant={entry.billable ? "default" : "outline"}
                  >
                    <Euro className="size-4" aria-hidden="true" />
                    <span className="sr-only">
                      {entry.billable ? "Abrechenbar" : "Nicht abrechenbar"}
                    </span>
                  </Button>
                </form>

                <Button
                  className="size-9 px-0"
                  onClick={() => onEdit(entry)}
                  title="Bearbeiten"
                  type="button"
                  variant="outline"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  <span className="sr-only">Bearbeiten</span>
                </Button>

                <Button
                  className="size-9 px-0"
                  onClick={() => onDuplicate(entry)}
                  title="Duplizieren"
                  type="button"
                  variant="outline"
                >
                  <Copy className="size-4" aria-hidden="true" />
                  <span className="sr-only">Duplizieren</span>
                </Button>

                <form action={continueTimeEntryAction}>
                  <input name="entryId" type="hidden" value={entry.id} />
                  <Button
                    className="size-9 px-0"
                    title="Fortsetzen"
                    type="submit"
                    variant="outline"
                  >
                    <Play className="size-4" aria-hidden="true" />
                    <span className="sr-only">Fortsetzen</span>
                  </Button>
                </form>

                <Button
                  className="size-9 px-0"
                  onClick={() => onDelete(entry)}
                  title="Loeschen"
                  type="button"
                  variant="outline"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  <span className="sr-only">Loeschen</span>
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TimeEntriesList({ result, tasks }: TimeEntriesListProps) {
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteCandidate, setDeleteCandidate] =
    useState<TimeEntryListItem | null>(null);
  const [editState, editAction, isSaving] = useActionState(
    upsertTimeEntryFromListAction,
    initialTimeEntryEditActionState,
  );
  const safeEditState = editState ?? initialTimeEntryEditActionState;
  const editFieldErrors = safeEditState.fieldErrors ?? {};
  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  function errorClass(field: keyof typeof fieldLabels) {
    return editFieldErrors[field]
      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
      : "";
  }

  return (
    <section className="grid gap-4 rounded-md border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Eintraege</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.totalCount} Eintraege, neueste Tage zuerst.
          </p>
        </div>

        <form action={updateTimeEntriesPageSizeAction} className="flex items-center gap-2">
          <label className="text-sm font-medium" htmlFor="time-entry-page-size">
            Pro Seite
          </label>
          <select
            className="min-h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            defaultValue={String(result.pageSize)}
            id="time-entry-page-size"
            name="pageSize"
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          >
            {[50, 100, 250].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </form>
      </div>

      {result.groups.length > 0 ? (
        <div className="grid gap-5">
          {result.groups.map((group) => (
            <DayGroup
              group={group}
              key={group.workDate}
              onDelete={setDeleteCandidate}
              onDuplicate={(entry) => setEditor({ mode: "duplicate", entry })}
              onEdit={(entry) => setEditor({ mode: "edit", entry })}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed bg-background px-3 py-8 text-center text-sm text-muted-foreground">
          Noch keine Zeiteintraege vorhanden.
        </p>
      )}

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Seite {result.page} von {result.totalPages}
        </p>
        <div className="flex gap-2">
          <Button asChild disabled={!result.hasPreviousPage} variant="outline">
            <a
              aria-disabled={!result.hasPreviousPage}
              href={pageHref(Math.max(1, result.page - 1))}
            >
              Zurueck
            </a>
          </Button>
          <Button asChild disabled={!result.hasNextPage} variant="outline">
            <a
              aria-disabled={!result.hasNextPage}
              href={pageHref(result.page + 1)}
            >
              Weiter
            </a>
          </Button>
        </div>
      </div>

      {editor ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4">
          <div className="grid w-full max-w-3xl gap-4 rounded-md border bg-card p-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {editor.mode === "edit" ? "Eintrag bearbeiten" : "Eintrag duplizieren"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {entryContext(editor.entry)}
                </p>
              </div>
              <Button
                className="size-9 px-0"
                onClick={() => setEditor(null)}
                type="button"
                variant="ghost"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Schliessen</span>
              </Button>
            </div>

            <form action={editAction} className="grid gap-4">
              <input name="entryId" type="hidden" value={editor.entry.id} />
              <input name="intent" type="hidden" value={editor.mode} />
              <div className="grid gap-3 lg:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">
                  Beschreibung
                  <textarea
                    className={cn(
                      "min-h-28 rounded-md border bg-background px-3 py-2 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                      errorClass("description"),
                    )}
                    defaultValue={editor.entry.description}
                    name="description"
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  Aufgabe
                  <select
                    className={cn(
                      "min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                      errorClass("taskId"),
                    )}
                    defaultValue={
                      tasksById.has(editor.entry.taskId) ? editor.entry.taskId : ""
                    }
                    name="taskId"
                  >
                    {tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.fullLabel}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <label className="grid gap-1 text-sm font-medium">
                  Datum
                  <input
                    className={cn(
                      "min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                      errorClass("workDate"),
                    )}
                    defaultValue={editor.entry.workDate}
                    name="workDate"
                    type="date"
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  Start
                  <input
                    className={cn(
                      "min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                      errorClass("startTime"),
                    )}
                    defaultValue={trimSeconds(editor.entry.startTime)}
                    name="startTime"
                    type="time"
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  Ende
                  <input
                    className={cn(
                      "min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                      errorClass("endTime"),
                    )}
                    defaultValue={trimSeconds(editor.entry.endTime)}
                    name="endTime"
                    type="time"
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  Abrechenbar
                  <select
                    className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                    defaultValue={editor.entry.billable ? "1" : "0"}
                    name="billable"
                  >
                    <option value="1">Ja</option>
                    <option value="0">Nein</option>
                  </select>
                </label>
              </div>

              {safeEditState.formError ? (
                <div className="grid gap-1 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm text-destructive">
                  <p>{safeEditState.formError}</p>
                  {Object.entries(editFieldErrors).map(([field, error]) => (
                    <p key={field}>
                      {fieldErrorMessage(field as keyof typeof fieldLabels, error)}
                    </p>
                  ))}
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setEditor(null)}
                  type="button"
                  variant="outline"
                >
                  Abbrechen
                </Button>
                <Button disabled={isSaving} type="submit">
                  <Save className="size-4" aria-hidden="true" />
                  {editor.mode === "edit" ? "Speichern" : "Duplizieren"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteCandidate ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4">
          <div className="grid w-full max-w-md gap-4 rounded-md border bg-card p-5 shadow-lg">
            <div>
              <h3 className="text-lg font-semibold">Eintrag wirklich loeschen?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatGermanDate(deleteCandidate.workDate)} ·{" "}
                {deleteCandidate.description}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setDeleteCandidate(null)}
                type="button"
                variant="outline"
              >
                Abbrechen
              </Button>
              <form action={deleteTimeEntryAction}>
                <input name="entryId" type="hidden" value={deleteCandidate.id} />
                <Button type="submit">
                  <Trash2 className="size-4" aria-hidden="true" />
                  Loeschen
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

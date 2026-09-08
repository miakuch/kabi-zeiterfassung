"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Copy,
  Euro,
  Pencil,
  Play,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calculateTimeEntryFromStartEnd } from "@/features/time/domain/time-calculation";
import type { TaskPickerItem } from "@/features/tasks/task-picker/queries";
import {
  continueTimeEntryAction,
  deleteTimeEntryAction,
  toggleTimeEntryBillableAction,
  updateTimeEntriesPageSizeAction,
  upsertTimeEntryFromListAction,
} from "./actions";
import { initialTimeEntryEditActionState } from "./action-state";
import {
  formatDuration,
  formatGermanDate,
  groupTimeEntryDaysByWeek,
  type TimeEntryListGroup,
  type TimeEntryListWeekGroup,
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
  segments: Array<{
    key: string;
    startTime: string;
    endTime: string;
  }>;
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

function editorState(mode: EditorMode, entry: TimeEntryListItem): EditorState {
  return {
    mode,
    entry,
    segments: entry.segments.map((segment) => ({
      key: segment.id,
      startTime: trimSeconds(segment.startTime),
      endTime: trimSeconds(segment.endTime),
    })),
  };
}

function segmentDuration(startTime: string, endTime: string) {
  const calculated = calculateTimeEntryFromStartEnd({ startTime, endTime });

  return calculated.ok ? calculated.value.durationMinutes : null;
}

function segmentErrorMessage(error?: string) {
  if (error === "overlap") {
    return "Dieser Zeitraum überschneidet sich mit einem anderen Zeitraum.";
  }

  if (error === "crosses-midnight") {
    return "Der Zeitraum darf nicht über Mitternacht gehen.";
  }

  if (error === "end-not-after-start") {
    return "Ende muss nach Start liegen.";
  }

  if (error === "invalid-time") {
    return "Bitte eine gültige Uhrzeit eingeben.";
  }

  if (error === "required") {
    return "Start und Ende sind erforderlich.";
  }

  return null;
}

function fieldErrorMessage(field: keyof typeof fieldLabels, error?: string) {
  if (!error) {
    return null;
  }

  if (error === "crosses-midnight") {
    return `${fieldLabels[field]} verläuft über Mitternacht.`;
  }

  if (error === "end-not-after-start") {
    return "Ende muss nach Start liegen.";
  }

  if (error === "invalid-time") {
    return `${fieldLabels[field]} ist ungültig.`;
  }

  if (error === "invalid-date") {
    return "Datum ist ungültig.";
  }

  return `${fieldLabels[field]} ist erforderlich.`;
}

function pageHref(page: number, searchParams: URLSearchParams) {
  const next = new URLSearchParams(searchParams.toString());

  if (page <= 1) {
    next.delete("page");
  } else {
    next.set("page", String(page));
  }

  next.delete("error");
  next.delete("success");
  const query = next.toString();

  return query ? `/zeiten?${query}` : "/zeiten";
}

function DayGroup({
  group,
  expandedEntryIds,
  onDelete,
  onEdit,
  onDuplicate,
  onToggleExpanded,
}: {
  group: TimeEntryListGroup<TimeEntryListItem>;
  expandedEntryIds: Set<string>;
  onDelete: (entry: TimeEntryListItem) => void;
  onEdit: (entry: TimeEntryListItem) => void;
  onDuplicate: (entry: TimeEntryListItem) => void;
  onToggleExpanded: (entryId: string) => void;
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
        {group.entries.map((entry) => {
          const hasSegments = entry.segments.length > 1;
          const isExpanded = expandedEntryIds.has(entry.id);

          return (
          <article
            className="grid gap-3 rounded-md border bg-background p-3 transition hover:border-primary"
            key={entry.id}
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="flex min-w-0 items-start gap-2">
                {hasSegments ? (
                  <button
                    aria-expanded={isExpanded}
                    className="mt-0.5 inline-flex min-h-7 min-w-10 items-center justify-center gap-1 rounded-md bg-accent px-2 text-xs font-semibold text-accent-foreground transition hover:bg-secondary"
                    onClick={() => onToggleExpanded(entry.id)}
                    title={isExpanded ? "Segmente einklappen" : "Segmente anzeigen"}
                    type="button"
                  >
                    {entry.segments.length}
                    <ChevronDown
                      className={cn(
                        "size-3 transition",
                        isExpanded && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                ) : null}

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
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
                  title="Löschen"
                  type="button"
                  variant="outline"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  <span className="sr-only">Löschen</span>
                </Button>
              </div>
            </div>

            {hasSegments && isExpanded ? (
              <div className="grid gap-1 border-l-2 border-accent pl-4 sm:ml-12">
                {entry.segments.map((segment) => (
                  <div
                    className="flex flex-wrap items-center gap-2 rounded-md bg-card px-3 py-2 text-sm"
                    key={segment.id}
                  >
                    <span className="font-mono">
                      {trimSeconds(segment.startTime)}-{trimSeconds(segment.endTime)}
                    </span>
                    <span className="text-muted-foreground">|</span>
                    <span className="font-mono font-semibold">
                      {formatDuration(segment.durationMinutes)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        );
        })}
      </div>
    </section>
  );
}

function WeekGroup({
  expandedEntryIds,
  onDelete,
  onDuplicate,
  onEdit,
  onToggleExpanded,
  week,
}: {
  expandedEntryIds: Set<string>;
  onDelete: (entry: TimeEntryListItem) => void;
  onDuplicate: (entry: TimeEntryListItem) => void;
  onEdit: (entry: TimeEntryListItem) => void;
  onToggleExpanded: (entryId: string) => void;
  week: TimeEntryListWeekGroup<TimeEntryListItem>;
}) {
  return (
    <section className="grid gap-3 rounded-md border border-border/70 bg-background/60 p-3">
      <div className="flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{week.weekLabel}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {week.dateRangeLabel}
          </p>
        </div>
        <div className="flex items-baseline justify-between gap-3 sm:justify-end">
          <span className="text-xs font-medium text-muted-foreground">
            Summe Woche
          </span>
          <span className="font-mono text-base font-semibold">
            {formatDuration(week.totalDurationMinutes)}
          </span>
        </div>
      </div>

      <div className="grid gap-4">
        {week.days.map((group) => (
          <DayGroup
            expandedEntryIds={expandedEntryIds}
            group={group}
            key={group.workDate}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onEdit={onEdit}
            onToggleExpanded={onToggleExpanded}
          />
        ))}
      </div>
    </section>
  );
}

export function TimeEntriesList({ result, tasks }: TimeEntriesListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteCandidate, setDeleteCandidate] =
    useState<TimeEntryListItem | null>(null);
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [editState, editAction, isSaving] = useActionState(
    upsertTimeEntryFromListAction,
    initialTimeEntryEditActionState,
  );
  const safeEditState = editState ?? initialTimeEntryEditActionState;
  const editFieldErrors = safeEditState.fieldErrors ?? {};
  const editSegmentErrors = safeEditState.segmentErrors ?? {};
  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );
  const weekGroups = useMemo(
    () => groupTimeEntryDaysByWeek(result.groups),
    [result.groups],
  );

  useEffect(() => {
    if (!editState?.successMessage) {
      return;
    }

    router.refresh();
    const timeoutId = window.setTimeout(() => {
      setEditor(null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [editState, router]);

  function errorClass(field: keyof typeof fieldLabels) {
    return editFieldErrors[field]
      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
      : "";
  }

  function segmentErrorClass(index: number, field: "startTime" | "endTime") {
    return editSegmentErrors[index]?.[field]
      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
      : "";
  }

  function updateEditorSegment(
    index: number,
    field: "startTime" | "endTime",
    value: string,
  ) {
    setEditor((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        segments: current.segments.map((segment, segmentIndex) =>
          segmentIndex === index ? { ...segment, [field]: value } : segment,
        ),
      };
    });
  }

  function addEditorSegment() {
    setEditor((current) =>
      current
        ? {
            ...current,
            segments: [
              ...current.segments,
              {
                key: globalThis.crypto.randomUUID(),
                startTime: "",
                endTime: "",
              },
            ],
          }
        : current,
    );
  }

  function removeEditorSegment(index: number) {
    setEditor((current) => {
      if (!current || current.segments.length <= 1) {
        return current;
      }

      return {
        ...current,
        segments: current.segments.filter((_, segmentIndex) => segmentIndex !== index),
      };
    });
  }

  function toggleExpandedEntry(entryId: string) {
    setExpandedEntryIds((current) => {
      const next = new Set(current);

      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }

      return next;
    });
  }

  return (
    <section className="grid gap-4 rounded-md border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Einträge</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.periodLabel}, neueste Tage zuerst.
            {" "}
            {result.entryCount} Einträge auf dieser Seite.
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
            {[50, 100].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </form>
      </div>

      {safeEditState.successMessage ? (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          {safeEditState.successMessage}
        </p>
      ) : null}

      {weekGroups.length > 0 ? (
        <div className="grid gap-5">
          {weekGroups.map((week) => (
            <WeekGroup
              expandedEntryIds={expandedEntryIds}
              key={week.weekKey}
              onDelete={setDeleteCandidate}
              onDuplicate={(entry) => setEditor(editorState("duplicate", entry))}
              onEdit={(entry) => setEditor(editorState("edit", entry))}
              onToggleExpanded={toggleExpandedEntry}
              week={week}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed bg-background px-3 py-8 text-center text-sm text-muted-foreground">
          Noch keine Zeiteinträge vorhanden.
        </p>
      )}

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Seite {result.page}
        </p>
        <div className="flex gap-2">
          {result.hasPreviousPage ? (
            <Button asChild variant="outline">
              <Link href={pageHref(result.page - 1, searchParams)} scroll={false}>
                Zurück
              </Link>
            </Button>
          ) : (
            <Button disabled type="button" variant="outline">
              Zurück
            </Button>
          )}
          {result.hasNextPage ? (
            <Button asChild variant="outline">
              <Link href={pageHref(result.page + 1, searchParams)} scroll={false}>
                Weiter
              </Link>
            </Button>
          ) : (
            <Button disabled type="button" variant="outline">
              Weiter
            </Button>
          )}
        </div>
      </div>

      {editor ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4">
          <div className="grid max-h-[calc(100vh-2rem)] w-full max-w-3xl gap-4 overflow-y-auto rounded-md border bg-card p-5 shadow-lg">
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
                <span className="sr-only">Schließen</span>
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

              <div className="grid gap-3 sm:grid-cols-2">
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

              <fieldset className="grid gap-3 rounded-md border bg-background/50 p-3 sm:p-4">
                <legend className="px-1 text-sm font-semibold">Zeiträume</legend>
                <p className="text-xs text-muted-foreground">
                  Das Datum gilt für alle Zeiträume. Pausen zwischen den Zeiträumen
                  werden nicht als Arbeitszeit gezählt.
                </p>

                <div className="grid gap-3">
                  {editor.segments.map((segment, index) => {
                    const duration = segmentDuration(segment.startTime, segment.endTime);
                    const startError = editSegmentErrors[index]?.startTime;
                    const endError = editSegmentErrors[index]?.endTime;
                    const errorMessage = segmentErrorMessage(startError ?? endError);

                    return (
                      <div className="grid gap-1" key={segment.key}>
                        <div className="grid items-end gap-2 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
                          <span className="pb-3 text-xs font-semibold text-muted-foreground">
                            {index + 1}
                          </span>
                          <label className="grid gap-1 text-sm font-medium">
                            Start
                            <input
                              className={cn(
                                "min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                                segmentErrorClass(index, "startTime"),
                              )}
                              name="segmentStartTime"
                              onChange={(event) =>
                                updateEditorSegment(index, "startTime", event.target.value)
                              }
                              type="time"
                              value={segment.startTime}
                            />
                          </label>
                          <label className="grid gap-1 text-sm font-medium">
                            Ende
                            <input
                              className={cn(
                                "min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                                segmentErrorClass(index, "endTime"),
                              )}
                              name="segmentEndTime"
                              onChange={(event) =>
                                updateEditorSegment(index, "endTime", event.target.value)
                              }
                              type="time"
                              value={segment.endTime}
                            />
                          </label>
                          <output className="min-w-[68px] pb-3 text-right font-mono text-sm font-semibold">
                            {duration === null ? "--:--" : formatDuration(duration)}
                          </output>
                          <Button
                            aria-label={`Zeitraum ${index + 1} löschen`}
                            className="size-11 px-0"
                            disabled={editor.segments.length <= 1}
                            onClick={() => removeEditorSegment(index)}
                            title="Zeitraum löschen"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                        {errorMessage ? (
                          <p className="text-xs text-destructive sm:pl-6">{errorMessage}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button onClick={addEditorSegment} type="button" variant="outline">
                    <Plus className="size-4" aria-hidden="true" />
                    Zeitraum hinzufügen
                  </Button>
                  <p className="flex items-baseline justify-between gap-3 text-sm sm:justify-end">
                    <span className="text-muted-foreground">Tatsächliche Arbeitszeit</span>
                    <strong className="font-mono text-base">
                      {editor.segments.every(
                        (segment) =>
                          segmentDuration(segment.startTime, segment.endTime) !== null,
                      )
                        ? formatDuration(
                            editor.segments.reduce(
                              (total, segment) =>
                                total +
                                (segmentDuration(segment.startTime, segment.endTime) ?? 0),
                              0,
                            ),
                          )
                        : "--:--"}
                    </strong>
                  </p>
                </div>
              </fieldset>

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

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
              <h3 className="text-lg font-semibold">Eintrag wirklich löschen?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatGermanDate(deleteCandidate.workDate)} ·{" "}
                {deleteCandidate.description}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
                  Löschen
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import {
  CalendarDays,
  Clock,
  Save,
  Square,
  Trash2,
  Euro,
  ListPlus,
  Play,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  discardTimerDraftAction,
  initialTimerActionState,
  saveStoppedTimerDraftAction,
  startTimerDraftAction,
  stopTimerDraftAction,
  updateTimerDraftAction,
} from "@/features/timer/actions";
import type { CurrentTimerDraft } from "@/features/timer/queries";
import type { TaskPickerItem } from "@/features/tasks/task-picker/queries";
import {
  createManualTimeEntry,
  initialManualEntryActionState,
  updateTimeEntryPreferences,
} from "./actions";
import type { EntryMode, ManualEntryMode } from "./schema";

type TimeEntryBarProps = {
  tasks: TaskPickerItem[];
  initialEntryMode: EntryMode;
  initialManualMode: ManualEntryMode;
  today: string;
  timerDraft: CurrentTimerDraft | null;
  pageErrorMessage?: string;
  successMessage?: string;
};

const fieldLabels = {
  taskId: "Aufgabe",
  description: "Beschreibung",
  workDate: "Datum",
  startTime: "Start",
  endTime: "Ende",
  durationMinutes: "Dauer",
} as const;

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

  if (error === "invalid-duration") {
    return "Dauer muss mindestens 1 Minute sein.";
  }

  if (error === "invalid-date") {
    return "Datum ist ungueltig.";
  }

  return `${fieldLabels[field]} ist erforderlich.`;
}

function getTaskById(tasks: TaskPickerItem[], taskId: string) {
  return tasks.find((task) => task.id === taskId) ?? null;
}

function formatElapsedTime(startedAtUtc: string, stoppedAtUtc?: string | null) {
  const startedAt = new Date(startedAtUtc).getTime();
  const endedAt = stoppedAtUtc ? new Date(stoppedAtUtc).getTime() : Date.now();

  if (Number.isNaN(startedAt) || Number.isNaN(endedAt)) {
    return "00:00:00";
  }

  const totalSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function TimeEntryBar({
  tasks,
  initialEntryMode,
  initialManualMode,
  today,
  timerDraft,
  pageErrorMessage,
  successMessage,
}: TimeEntryBarProps) {
  const [entryMode, setEntryMode] = useState<EntryMode>(
    timerDraft ? "timer" : initialEntryMode,
  );
  const [manualMode, setManualMode] =
    useState<ManualEntryMode>(initialManualMode);
  const [description, setDescription] = useState(timerDraft?.description ?? "");
  const [taskId, setTaskId] = useState(timerDraft?.taskId ?? "");
  const [workDate, setWorkDate] = useState(today);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [timerWorkDate, setTimerWorkDate] = useState(
    timerDraft?.correctionWorkDate ?? today,
  );
  const [timerStartTime, setTimerStartTime] = useState(
    timerDraft?.correctionStartTime ?? "",
  );
  const [timerEndTime, setTimerEndTime] = useState(
    timerDraft?.correctionEndTime ?? "",
  );
  const [billable, setBillable] = useState(timerDraft?.billable ?? true);
  const [elapsedTime, setElapsedTime] = useState(
    timerDraft ? formatElapsedTime(timerDraft.startedAtUtc, timerDraft.stoppedAtUtc) : "00:00:00",
  );
  const [actionState, formAction, isSubmitting] = useActionState(
    createManualTimeEntry,
    initialManualEntryActionState,
  );
  const [startTimerState, startTimerAction, isStartingTimer] = useActionState(
    startTimerDraftAction,
    initialTimerActionState,
  );
  const [saveTimerState, saveTimerAction, isSavingTimer] = useActionState(
    saveStoppedTimerDraftAction,
    initialTimerActionState,
  );
  const [, startTransition] = useTransition();

  const selectedTask = useMemo(() => getTaskById(tasks, taskId), [tasks, taskId]);
  const hasTimerDraft = Boolean(timerDraft);
  const isRunningTimer = timerDraft?.status === "running";
  const isStoppedTimer = timerDraft?.status === "stopped";

  useEffect(() => {
    if (!timerDraft || timerDraft.status !== "running") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setElapsedTime(formatElapsedTime(timerDraft.startedAtUtc));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timerDraft]);

  function persistPreferences(nextEntryMode: EntryMode, nextManualMode = manualMode) {
    startTransition(() => {
      void updateTimeEntryPreferences({
        entryMode: nextEntryMode,
        manualMode: nextManualMode,
      });
    });
  }

  function switchEntryMode(nextMode: EntryMode) {
    if (hasTimerDraft && nextMode !== "timer") {
      return;
    }

    setEntryMode(nextMode);
    persistPreferences(nextMode);
  }

  function switchManualMode(nextMode: ManualEntryMode) {
    setManualMode(nextMode);
    persistPreferences(entryMode, nextMode);
  }

  function onTaskChange(nextTaskId: string) {
    const nextTask = getTaskById(tasks, nextTaskId);
    setTaskId(nextTaskId);
    setBillable(nextTask?.defaultBillable ?? true);
  }

  function errorClass(field: keyof typeof fieldLabels) {
    return actionState.fieldErrors[field] ||
      startTimerState.fieldErrors[field] ||
      saveTimerState.fieldErrors[field]
      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
      : "";
  }

  return (
    <section className="grid gap-3 rounded-md border bg-card p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="grid min-w-0 flex-1 gap-3 xl:grid-cols-[minmax(180px,1.4fr)_minmax(240px,2fr)_auto]">
          <label className="grid gap-1 text-sm font-medium">
            Beschreibung
            <input
              className={cn(
                "min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                errorClass("description"),
              )}
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Was wurde gemacht?"
              value={description}
            />
          </label>

          <label className="grid gap-1 text-sm font-medium">
            Aufgabe
            <select
              className={cn(
                "min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                errorClass("taskId"),
              )}
              name="taskId"
              onChange={(event) => onTaskChange(event.target.value)}
              value={taskId}
            >
              <option value="">Aufgabe waehlen</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.fullLabel}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <Button
              className={cn(
                "min-h-11 w-11 px-0",
                billable
                  ? "bg-primary text-primary-foreground hover:bg-[#1d7d90]"
                  : "border bg-background text-muted-foreground hover:bg-secondary",
              )}
              onClick={() => setBillable((current) => !current)}
              title={billable ? "Abrechenbar" : "Nicht abrechenbar"}
              type="button"
              variant={billable ? "default" : "outline"}
            >
              <Euro className="size-4" aria-hidden="true" />
              <span className="sr-only">
                {billable ? "Abrechenbar" : "Nicht abrechenbar"}
              </span>
            </Button>
            <div className="grid grid-cols-2 rounded-md border bg-background p-1">
              <Button
                className="min-h-9 px-3"
                onClick={() => switchEntryMode("timer")}
                title="Timer"
                type="button"
                variant={entryMode === "timer" ? "default" : "ghost"}
              >
                <Clock className="size-4" aria-hidden="true" />
                <span className="sr-only">Timer</span>
              </Button>
              <Button
                className="min-h-9 px-3"
                onClick={() => switchEntryMode("manual")}
                disabled={hasTimerDraft}
                title="Manueller Eintrag"
                type="button"
                variant={entryMode === "manual" ? "default" : "ghost"}
              >
                <ListPlus className="size-4" aria-hidden="true" />
                <span className="sr-only">Manueller Eintrag</span>
              </Button>
            </div>
          </div>
        </div>

        {entryMode === "timer" ? (
          <div className="grid gap-2 sm:grid-cols-[140px_auto] lg:min-w-[300px]">
            <div className="flex min-h-11 items-center justify-center rounded-md border bg-background px-3 font-mono text-lg font-semibold">
              {elapsedTime}
            </div>
            {!timerDraft ? (
              <form action={startTimerAction}>
                <input name="description" type="hidden" value={description} />
                <input name="taskId" type="hidden" value={taskId} />
                <input name="billable" type="hidden" value={billable ? "1" : "0"} />
                <Button className="min-h-11 w-full" disabled={isStartingTimer} type="submit">
                  <Play className="size-4" aria-hidden="true" />
                  Start
                </Button>
              </form>
            ) : null}
            {isRunningTimer ? (
              <form action={stopTimerDraftAction}>
                <input name="draftId" type="hidden" value={timerDraft.id} />
                <input name="description" type="hidden" value={description} />
                <input name="taskId" type="hidden" value={taskId} />
                <input name="billable" type="hidden" value={billable ? "1" : "0"} />
                <Button className="min-h-11 w-full" type="submit">
                  <Square className="size-4" aria-hidden="true" />
                  Stopp
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>

      {entryMode === "timer" && isRunningTimer && timerDraft ? (
        <form action={updateTimerDraftAction} className="flex justify-end">
          <input name="draftId" type="hidden" value={timerDraft.id} />
          <input name="description" type="hidden" value={description} />
          <input name="taskId" type="hidden" value={taskId} />
          <input name="billable" type="hidden" value={billable ? "1" : "0"} />
          <Button type="submit" variant="outline">
            <Save className="size-4" aria-hidden="true" />
            Aendern
          </Button>
        </form>
      ) : null}

      {entryMode === "manual" ? (
        <form action={formAction} className="grid gap-3">
          <input name="description" type="hidden" value={description} />
          <input name="taskId" type="hidden" value={taskId} />
          <input name="billable" type="hidden" value={billable ? "1" : "0"} />
          <input name="manualMode" type="hidden" value={manualMode} />

          <div className="grid gap-3 lg:grid-cols-[150px_120px_minmax(180px,1fr)_auto]">
            <label className="grid gap-1 text-sm font-medium">
              Datum
              <span className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  className={cn(
                    "min-h-11 w-full rounded-md border bg-background pl-10 pr-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                    errorClass("workDate"),
                  )}
                  name="workDate"
                  onChange={(event) => setWorkDate(event.target.value)}
                  type="date"
                  value={workDate}
                />
              </span>
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Start
              <input
                className={cn(
                  "min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                  errorClass("startTime"),
                )}
                name="startTime"
                onChange={(event) => setStartTime(event.target.value)}
                type="time"
                value={startTime}
              />
            </label>

            <div className="grid gap-2 sm:grid-cols-[auto_minmax(120px,1fr)]">
              <div className="grid grid-cols-2 self-end rounded-md border bg-background p-1">
                <Button
                  className="min-h-9 px-3"
                  onClick={() => switchManualMode("end")}
                  type="button"
                  variant={manualMode === "end" ? "default" : "ghost"}
                >
                  Ende
                </Button>
                <Button
                  className="min-h-9 px-3"
                  onClick={() => switchManualMode("duration")}
                  type="button"
                  variant={manualMode === "duration" ? "default" : "ghost"}
                >
                  Dauer
                </Button>
              </div>

              {manualMode === "end" ? (
                <label className="grid gap-1 text-sm font-medium">
                  Ende
                  <input
                    className={cn(
                      "min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                      errorClass("endTime"),
                    )}
                    name="endTime"
                    onChange={(event) => setEndTime(event.target.value)}
                    type="time"
                    value={endTime}
                  />
                </label>
              ) : (
                <label className="grid gap-1 text-sm font-medium">
                  Dauer
                  <input
                    className={cn(
                      "min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                      errorClass("durationMinutes"),
                    )}
                    min="1"
                    name="durationMinutes"
                    onChange={(event) => setDurationMinutes(event.target.value)}
                    placeholder="Minuten"
                    step="1"
                    type="number"
                    value={durationMinutes}
                  />
                </label>
              )}
            </div>

            <Button className="min-h-11 self-end" disabled={isSubmitting} type="submit">
              <Plus className="size-4" aria-hidden="true" />
              Hinzufuegen
            </Button>
          </div>
        </form>
      ) : null}

      {entryMode === "timer" && isStoppedTimer && timerDraft ? (
        <form action={saveTimerAction} className="grid gap-3">
          <input name="draftId" type="hidden" value={timerDraft.id} />
          <input name="description" type="hidden" value={description} />
          <input name="taskId" type="hidden" value={taskId} />
          <input name="billable" type="hidden" value={billable ? "1" : "0"} />

          <div className="grid gap-3 lg:grid-cols-[150px_120px_120px_auto_auto]">
            <label className="grid gap-1 text-sm font-medium">
              Datum
              <span className="relative">
                <CalendarDays
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  className={cn(
                    "min-h-11 w-full rounded-md border bg-background pl-10 pr-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                    errorClass("workDate"),
                  )}
                  name="workDate"
                  onChange={(event) => setTimerWorkDate(event.target.value)}
                  type="date"
                  value={timerWorkDate}
                />
              </span>
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Start
              <input
                className={cn(
                  "min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                  errorClass("startTime"),
                )}
                name="startTime"
                onChange={(event) => setTimerStartTime(event.target.value)}
                type="time"
                value={timerStartTime}
              />
            </label>

            <label className="grid gap-1 text-sm font-medium">
              Ende
              <input
                className={cn(
                  "min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                  errorClass("endTime"),
                )}
                name="endTime"
                onChange={(event) => setTimerEndTime(event.target.value)}
                type="time"
                value={timerEndTime}
              />
            </label>

            <Button className="min-h-11 self-end" disabled={isSavingTimer} type="submit">
              <Save className="size-4" aria-hidden="true" />
              Speichern
            </Button>

            <Button
              asChild
              className="min-h-11 self-end"
              type="button"
              variant="outline"
            >
              <button form="discard-timer-draft" type="submit">
                <Trash2 className="size-4" aria-hidden="true" />
                Verwerfen
              </button>
            </Button>
          </div>
        </form>
      ) : null}

      {entryMode === "timer" && isStoppedTimer && timerDraft ? (
        <form action={discardTimerDraftAction} id="discard-timer-draft">
          <input name="draftId" type="hidden" value={timerDraft.id} />
        </form>
      ) : null}

      {selectedTask ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="size-2.5 rounded-full border"
            style={{ backgroundColor: selectedTask.projectColor }}
            aria-hidden="true"
          />
          {selectedTask.compactLabel}
        </p>
      ) : null}

      {actionState.formError ? (
        <div className="grid gap-1 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm text-destructive">
          <p>{actionState.formError}</p>
          {Object.entries(actionState.fieldErrors).map(([field, error]) => (
            <p key={field}>
              {fieldErrorMessage(field as keyof typeof fieldLabels, error)}
            </p>
          ))}
        </div>
      ) : null}

      {startTimerState.formError || saveTimerState.formError || pageErrorMessage ? (
        <div className="grid gap-1 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm text-destructive">
          {startTimerState.formError ? <p>{startTimerState.formError}</p> : null}
          {saveTimerState.formError ? <p>{saveTimerState.formError}</p> : null}
          {pageErrorMessage ? <p>{pageErrorMessage}</p> : null}
          {Object.entries(saveTimerState.fieldErrors).map(([field, error]) => (
            <p key={field}>
              {fieldErrorMessage(field as keyof typeof fieldLabels, error)}
            </p>
          ))}
        </div>
      ) : null}

      {successMessage ? (
        <p className="rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm text-accent-foreground">
          {successMessage}
        </p>
      ) : null}

      {entryMode === "timer" && timerDraft?.suspicions.length ? (
        <p className="rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm text-destructive">
          {timerDraft.suspicions.includes("over-midnight")
            ? "Timer laeuft ueber Mitternacht. Bitte vor dem Speichern Datum, Start und Ende korrigieren."
            : "Timer laeuft seit mindestens 10 Stunden. Bitte vor dem Speichern pruefen."}
        </p>
      ) : null}
    </section>
  );
}

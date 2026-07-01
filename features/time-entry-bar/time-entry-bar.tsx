"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
  saveStoppedTimerDraftAction,
  startTimerDraftAction,
  stopTimerDraftAction,
  updateTimerDraftAction,
} from "@/features/timer/actions";
import { initialTimerActionState } from "@/features/timer/action-state";
import type { CurrentTimerDraft } from "@/features/timer/queries";
import type { TaskPickerItem } from "@/features/tasks/task-picker/queries";
import {
  createManualTimeEntry,
  updateTimeEntryPreferences,
} from "./actions";
import { initialManualEntryActionState } from "./action-state";
import type { EntryMode, ManualEntryMode } from "./schema";

type TimeEntryBarProps = {
  tasks: TaskPickerItem[];
  initialTaskId?: string;
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
    return `${fieldLabels[field]} verläuft über Mitternacht.`;
  }

  if (error === "end-not-after-start") {
    return "Ende muss nach Start liegen.";
  }

  if (error === "invalid-time") {
    return `${fieldLabels[field]} ist ungültig.`;
  }

  if (error === "invalid-duration") {
    return "Dauer muss im Format hh:mm und mindestens 00:01 sein.";
  }

  if (error === "invalid-date") {
    return "Datum ist ungültig.";
  }

  return `${fieldLabels[field]} ist erforderlich.`;
}

function getTaskById(tasks: TaskPickerItem[], taskId: string) {
  return tasks.find((task) => task.id === taskId) ?? null;
}

function resolveInitialTaskId({
  initialTaskId,
  tasks,
  timerTaskId,
}: {
  initialTaskId?: string;
  tasks: TaskPickerItem[];
  timerTaskId?: string;
}) {
  if (timerTaskId && getTaskById(tasks, timerTaskId)) {
    return timerTaskId;
  }

  if (initialTaskId && getTaskById(tasks, initialTaskId)) {
    return initialTaskId;
  }

  return tasks.length === 1 ? tasks[0]?.id ?? "" : "";
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
  initialTaskId,
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
  const resolvedInitialTaskId = resolveInitialTaskId({
    initialTaskId,
    tasks,
    timerTaskId: timerDraft?.taskId,
  });
  const initialTask = getTaskById(tasks, resolvedInitialTaskId);
  const [taskId, setTaskId] = useState(resolvedInitialTaskId);
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
  const workDateInputRef = useRef<HTMLInputElement>(null);
  const timerWorkDateInputRef = useRef<HTMLInputElement>(null);
  const [billable, setBillable] = useState(
    timerDraft?.billable ?? initialTask?.defaultBillable ?? true,
  );
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
  const manualState = actionState ?? initialManualEntryActionState;
  const timerStartState = startTimerState ?? initialTimerActionState;
  const timerSaveState = saveTimerState ?? initialTimerActionState;
  const manualFieldErrors = manualState.fieldErrors ?? {};
  const timerStartFieldErrors = timerStartState.fieldErrors ?? {};
  const timerSaveFieldErrors = timerSaveState.fieldErrors ?? {};

  const selectedTask = useMemo(() => getTaskById(tasks, taskId), [tasks, taskId]);
  const hasBookableTasks = tasks.length > 0;
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

  function openDatePicker(input: HTMLInputElement | null) {
    if (!input) {
      return;
    }

    input.showPicker?.();
    input.focus();
  }

  function errorClass(field: keyof typeof fieldLabels) {
    return manualFieldErrors[field] ||
      timerStartFieldErrors[field] ||
      timerSaveFieldErrors[field]
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
                "min-h-11 w-full rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
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
              <option value="">Aufgabe wählen</option>
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
                <Button
                  className="min-h-11 w-full"
                  disabled={isStartingTimer || !hasBookableTasks}
                  type="submit"
                >
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
            Ändern
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
                <button
                  aria-label="Kalender öffnen"
                  className="absolute left-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  onClick={() => openDatePicker(workDateInputRef.current)}
                  type="button"
                >
                  <CalendarDays className="size-4" aria-hidden="true" />
                </button>
                <input
                  className={cn(
                    "date-input-with-picker min-h-11 w-full rounded-md border bg-background pl-10 pr-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                    errorClass("workDate"),
                  )}
                  name="workDate"
                  onChange={(event) => setWorkDate(event.target.value)}
                  ref={workDateInputRef}
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
                    inputMode="numeric"
                    name="durationMinutes"
                    onChange={(event) => setDurationMinutes(event.target.value)}
                    pattern="[0-9]{1,2}:[0-5][0-9]"
                    placeholder="01:30"
                    type="text"
                    value={durationMinutes}
                  />
                </label>
              )}
            </div>

            <Button
              className="min-h-11 self-end"
              disabled={isSubmitting || !hasBookableTasks}
              type="submit"
            >
              <Plus className="size-4" aria-hidden="true" />
              Hinzufügen
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
                <button
                  aria-label="Kalender öffnen"
                  className="absolute left-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  onClick={() => openDatePicker(timerWorkDateInputRef.current)}
                  type="button"
                >
                  <CalendarDays className="size-4" aria-hidden="true" />
                </button>
                <input
                  className={cn(
                    "date-input-with-picker min-h-11 w-full rounded-md border bg-background pl-10 pr-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                    errorClass("workDate"),
                  )}
                  name="workDate"
                  onChange={(event) => setTimerWorkDate(event.target.value)}
                  ref={timerWorkDateInputRef}
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
      ) : hasBookableTasks ? (
        <p className="rounded-md border border-dashed bg-background px-3 py-2 text-sm text-muted-foreground">
          Wähle eine Aufgabe aus, bevor du den Timer startest oder einen Eintrag
          hinzufügst.
        </p>
      ) : (
        <p className="rounded-md border border-dashed bg-background px-3 py-2 text-sm text-muted-foreground">
          Es gibt noch keine buchbare Aufgabe. Lege zuerst einen aktiven Kunden,
          ein aktives Projekt und eine aktive Aufgabe an.
        </p>
      )}

      {manualState.formError ? (
        <div className="grid gap-1 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm text-destructive">
          <p>{manualState.formError}</p>
          {Object.entries(manualFieldErrors).map(([field, error]) => (
            <p key={field}>
              {fieldErrorMessage(field as keyof typeof fieldLabels, error)}
            </p>
          ))}
        </div>
      ) : null}

      {timerStartState.formError || timerSaveState.formError || pageErrorMessage ? (
        <div className="grid gap-1 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm text-destructive">
          {timerStartState.formError ? <p>{timerStartState.formError}</p> : null}
          {timerSaveState.formError ? <p>{timerSaveState.formError}</p> : null}
          {pageErrorMessage ? <p>{pageErrorMessage}</p> : null}
          {Object.entries(timerStartFieldErrors).map(([field, error]) => (
            <p key={`start-${field}`}>
              {fieldErrorMessage(field as keyof typeof fieldLabels, error)}
            </p>
          ))}
          {Object.entries(timerSaveFieldErrors).map(([field, error]) => (
            <p key={`save-${field}`}>
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
            ? "Timer läuft über Mitternacht. Bitte vor dem Speichern Datum, Start und Ende korrigieren."
            : "Timer läuft seit mindestens 10 Stunden. Bitte vor dem Speichern prüfen."}
        </p>
      ) : null}
    </section>
  );
}

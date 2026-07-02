"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Clock,
  Save,
  SlidersHorizontal,
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
  calculateTimeEntryFromStartAndDuration,
  calculateTimeEntryFromStartEnd,
} from "@/features/time/domain/time-calculation";
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
import type { TimeEntryEmployeeOption } from "./employee-selection";
import type { EntryMode, ManualEntryMode } from "./schema";

type TimeEntryBarProps = {
  tasks: TaskPickerItem[];
  currentEmployeeId: string;
  employeeOptions: TimeEntryEmployeeOption[];
  selectedEmployeeId: string;
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

const successMessageVisibleMs = 4000;

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

  if (error === "not-bookable") {
    return "Aufgabe ist für diese:n Mitarbeitende:n nicht freigegeben.";
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

function formatElapsedTime(
  startedAtUtc: string,
  stoppedAtUtc?: string | null,
  nowMs = Date.now(),
) {
  const startedAt = new Date(startedAtUtc).getTime();
  const endedAt = stoppedAtUtc ? new Date(stoppedAtUtc).getTime() : nowMs;

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

function getBerlinDateTimeValues(date = new Date()) {
  const parts = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Berlin",
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    workDate: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

function normalizeDurationInput(value: string) {
  const trimmed = value.trim();
  const compactDigits = /^(\d{1,2})([0-5]\d)$/.exec(trimmed);

  if (compactDigits) {
    return `${compactDigits[1].padStart(2, "0")}:${compactDigits[2]}`;
  }

  const timeParts = /^(\d{1,2}):([0-5]\d)$/.exec(trimmed);

  if (timeParts) {
    return `${timeParts[1].padStart(2, "0")}:${timeParts[2]}`;
  }

  return value;
}

function parseDurationInputToMinutes(duration: string) {
  const match = /^(\d{2}):([0-5]\d)$/.exec(
    normalizeDurationInput(duration).trim(),
  );

  if (!match) {
    return null;
  }

  const totalMinutes = Number(match[1]) * 60 + Number(match[2]);

  return totalMinutes >= 1 ? totalMinutes : null;
}

function formatDurationMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatClockInput(time: string) {
  return time.slice(0, 5);
}

function cleanDurationInput(value: string) {
  const hasColon = value.includes(":");

  if (hasColon) {
    const [rawHours = "", rawMinutes = ""] = value.split(":");
    const hours = rawHours.replace(/\D/g, "").slice(0, 2);
    const minutes = rawMinutes.replace(/\D/g, "").slice(0, 2);

    return `${hours}:${minutes}`;
  }

  const digits = value.replace(/\D/g, "").slice(0, 4);

  return digits;
}

export function TimeEntryBar({
  tasks,
  currentEmployeeId,
  employeeOptions,
  selectedEmployeeId,
  initialTaskId,
  initialEntryMode,
  initialManualMode,
  today,
  timerDraft,
  pageErrorMessage,
  successMessage,
}: TimeEntryBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entryMode, setEntryMode] = useState<EntryMode>(
    timerDraft ? "timer" : initialEntryMode,
  );
  const [manualMode, setManualMode] =
    useState<ManualEntryMode>(initialManualMode);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState(selectedEmployeeId);
  const [optimisticStartDraft, setOptimisticStartDraft] =
    useState<CurrentTimerDraft | null>(null);
  const [optimisticStopDraft, setOptimisticStopDraft] =
    useState<CurrentTimerDraft | null>(null);
  const [dismissedSuccessMessage, setDismissedSuccessMessage] =
    useState<string | null>(null);
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
  const workDateInputRef = useRef<HTMLInputElement>(null);
  const timerWorkDateInputRef = useRef<HTMLInputElement>(null);
  const [billable, setBillable] = useState(
    timerDraft?.billable ?? initialTask?.defaultBillable ?? true,
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [actionState, formAction, isSubmitting] = useActionState(
    createManualTimeEntry,
    initialManualEntryActionState,
  );
  const [startTimerState, startTimerAction, isStartingTimer] = useActionState(
    startTimerDraftAction,
    initialTimerActionState,
  );
  const [stopTimerState, stopTimerAction, isStoppingTimer] = useActionState(
    stopTimerDraftAction,
    initialTimerActionState,
  );
  const [saveTimerState, saveTimerAction, isSavingTimer] = useActionState(
    saveStoppedTimerDraftAction,
    initialTimerActionState,
  );
  const [, startTransition] = useTransition();
  const manualState = actionState ?? initialManualEntryActionState;
  const timerStartState = startTimerState ?? initialTimerActionState;
  const timerStopState = stopTimerState ?? initialTimerActionState;
  const timerSaveState = saveTimerState ?? initialTimerActionState;
  const manualFieldErrors = manualState.fieldErrors ?? {};
  const timerStartFieldErrors = timerStartState.fieldErrors ?? {};
  const timerStopFieldErrors = timerStopState.fieldErrors ?? {};
  const timerSaveFieldErrors = timerSaveState.fieldErrors ?? {};
  const currentTimerDraft =
    timerStopState.draft ??
    (timerStopState.formError ? null : optimisticStopDraft) ??
    timerStartState.draft ??
    (timerStartState.formError ? null : optimisticStartDraft) ??
    timerDraft;
  const localSuccessMessage =
    timerStopState.successMessage ?? timerStartState.successMessage ?? null;
  const activeSuccessMessage = localSuccessMessage ?? successMessage ?? null;
  const visibleSuccessMessage =
    activeSuccessMessage && dismissedSuccessMessage !== activeSuccessMessage
      ? activeSuccessMessage
      : null;

  const selectedTask = useMemo(() => getTaskById(tasks, taskId), [tasks, taskId]);
  const selectedEmployee = useMemo(
    () =>
      employeeOptions.find((employee) => employee.id === targetEmployeeId) ??
      null,
    [employeeOptions, targetEmployeeId],
  );
  const canSelectEmployee = employeeOptions.length > 1;
  const hasBookableTasks = tasks.length > 0;
  const hasTimerDraft = Boolean(currentTimerDraft);
  const isRunningTimer = currentTimerDraft?.status === "running";
  const isStoppedTimer = currentTimerDraft?.status === "stopped";
  const elapsedTime = currentTimerDraft
    ? formatElapsedTime(
        currentTimerDraft.startedAtUtc,
        currentTimerDraft.stoppedAtUtc,
        nowMs,
      )
    : "00:00:00";
  const calculatedDuration = useMemo(() => {
    if (!startTime || !endTime) {
      return "";
    }

    const calculated = calculateTimeEntryFromStartEnd({ startTime, endTime });

    return calculated.ok
      ? formatDurationMinutes(calculated.value.durationMinutes)
      : "";
  }, [endTime, startTime]);
  const calculatedEndTime = useMemo(() => {
    const duration = parseDurationInputToMinutes(durationMinutes);

    if (!startTime || duration === null) {
      return "";
    }

    const calculated = calculateTimeEntryFromStartAndDuration({
      startTime,
      durationMinutes: duration,
    });

    return calculated.ok ? formatClockInput(calculated.value.endTime) : "";
  }, [durationMinutes, startTime]);

  useEffect(() => {
    if (!currentTimerDraft || currentTimerDraft.status !== "running") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [currentTimerDraft]);

  useEffect(() => {
    if (!activeSuccessMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDismissedSuccessMessage(activeSuccessMessage);

      if (!successMessage) {
        return;
      }

      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.delete("success");
      const queryString = nextSearchParams.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    }, successMessageVisibleMs);

    return () => window.clearTimeout(timeoutId);
  }, [activeSuccessMessage, pathname, router, searchParams, successMessage]);

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
    if (nextMode === "duration" && calculatedDuration) {
      setDurationMinutes(calculatedDuration);
    }

    if (nextMode === "end" && calculatedEndTime) {
      setEndTime(calculatedEndTime);
    }

    setManualMode(nextMode);
    persistPreferences(entryMode, nextMode);
  }

  function onDurationChange(value: string) {
    setDurationMinutes(cleanDurationInput(value));
  }

  function onDurationBlur() {
    setDurationMinutes((current) => normalizeDurationInput(current));
  }

  function onTaskChange(nextTaskId: string) {
    const nextTask = getTaskById(tasks, nextTaskId);
    setTaskId(nextTaskId);
    setBillable(nextTask?.defaultBillable ?? true);
  }

  function onTargetEmployeeChange(nextEmployeeId: string) {
    setTargetEmployeeId(nextEmployeeId);

    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (nextEmployeeId && nextEmployeeId !== currentEmployeeId) {
      nextSearchParams.set("employee", nextEmployeeId);
    } else {
      nextSearchParams.delete("employee");
    }

    nextSearchParams.delete("page");
    const queryString = nextSearchParams.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function onStartTimerSubmit() {
    const now = new Date();
    const berlin = getBerlinDateTimeValues(now);

    setOptimisticStopDraft(null);
    setOptimisticStartDraft({
      id: "optimistic-start",
      resumedTimeEntryId: null,
      taskId,
      description: description.trim() || null,
      billable,
      startedAtUtc: now.toISOString(),
      stoppedAtUtc: null,
      status: "running",
      correctionWorkDate: berlin.workDate,
      correctionStartTime: berlin.time,
      correctionEndTime: berlin.time,
      elapsedMinutes: 0,
      suspicions: [],
    });
  }

  function onStopTimerSubmit() {
    if (!currentTimerDraft) {
      return;
    }

    const now = new Date();
    const berlin = getBerlinDateTimeValues(now);

    setOptimisticStopDraft({
      ...currentTimerDraft,
      description: description.trim() || null,
      taskId,
      billable,
      stoppedAtUtc: now.toISOString(),
      status: "stopped",
      correctionEndTime: berlin.time,
      elapsedMinutes: Math.max(
        1,
        Math.ceil(
          (now.getTime() - new Date(currentTimerDraft.startedAtUtc).getTime()) /
            60000,
        ),
      ),
      suspicions: currentTimerDraft.suspicions,
    });
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
            {!currentTimerDraft ? (
              <form action={startTimerAction} onSubmit={onStartTimerSubmit}>
                <input name="description" type="hidden" value={description} />
                <input name="employeeId" type="hidden" value={targetEmployeeId} />
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
              <form action={stopTimerAction} onSubmit={onStopTimerSubmit}>
                <input name="draftId" type="hidden" value={currentTimerDraft.id} />
                <input name="description" type="hidden" value={description} />
                <input name="employeeId" type="hidden" value={targetEmployeeId} />
                <input name="taskId" type="hidden" value={taskId} />
                <input name="billable" type="hidden" value={billable ? "1" : "0"} />
                <Button
                  className="min-h-11 w-full"
                  disabled={
                    isStoppingTimer || currentTimerDraft.id === "optimistic-start"
                  }
                  type="submit"
                >
                  <Square className="size-4" aria-hidden="true" />
                  Stopp
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>

      {canSelectEmployee ? (
        <div className="grid gap-2">
          <Button
            aria-expanded={isMoreOptionsOpen}
            className="min-h-8 w-fit px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setIsMoreOptionsOpen((current) => !current)}
            type="button"
            variant="ghost"
          >
            <span className="flex min-w-0 items-center gap-2">
              <SlidersHorizontal className="size-3.5 shrink-0" aria-hidden="true" />
              <span>Mehr Optionen</span>
              {selectedEmployee ? (
                <span className="max-w-44 truncate text-muted-foreground">
                  {selectedEmployee.name}
                </span>
              ) : null}
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                isMoreOptionsOpen ? "rotate-180" : "",
              )}
              aria-hidden="true"
            />
          </Button>

          {isMoreOptionsOpen ? (
            <label className="grid gap-1 text-sm font-medium md:max-w-sm">
              Mitarbeitende
              <select
                className="min-h-11 rounded-md border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                name="employeeSelection"
                onChange={(event) => onTargetEmployeeChange(event.target.value)}
                value={targetEmployeeId}
              >
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.email})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {entryMode === "timer" && isRunningTimer && currentTimerDraft ? (
        <form action={updateTimerDraftAction} className="flex justify-end">
          <input name="draftId" type="hidden" value={currentTimerDraft.id} />
          <input name="description" type="hidden" value={description} />
          <input name="employeeId" type="hidden" value={targetEmployeeId} />
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
          <input name="employeeId" type="hidden" value={targetEmployeeId} />
          <input name="taskId" type="hidden" value={taskId} />
          <input name="billable" type="hidden" value={billable ? "1" : "0"} />
          <input name="manualMode" type="hidden" value={manualMode} />

          <div className="grid gap-3 lg:grid-cols-[minmax(180px,200px)_minmax(120px,140px)_minmax(300px,420px)_auto] lg:justify-start xl:grid-cols-[200px_140px_420px_auto]">
            <label className="grid min-w-0 gap-1 text-sm font-medium">
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

            <div className="grid gap-2 sm:grid-cols-[auto_minmax(112px,132px)_minmax(112px,132px)]">
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
                <>
                  <label className="grid min-w-0 gap-1 text-sm font-medium">
                    Ende
                    <input
                      className={cn(
                        "min-h-11 w-full min-w-0 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                        errorClass("endTime"),
                      )}
                      name="endTime"
                      onChange={(event) => setEndTime(event.target.value)}
                      type="time"
                      value={endTime}
                    />
                  </label>
                  <label className="grid min-w-0 gap-1 text-sm font-medium">
                    Dauer
                    <input
                      aria-label="Berechnete Dauer"
                      className="min-h-11 w-full min-w-0 rounded-md border bg-secondary/40 px-3 text-base text-muted-foreground outline-none"
                      placeholder="--:--"
                      readOnly
                      type="text"
                      value={calculatedDuration}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="grid min-w-0 gap-1 text-sm font-medium">
                    Dauer
                    <input
                      className={cn(
                        "min-h-11 w-full min-w-0 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                        errorClass("durationMinutes"),
                      )}
                      inputMode="numeric"
                      maxLength={5}
                      name="durationMinutes"
                      onBlur={onDurationBlur}
                      onChange={(event) => onDurationChange(event.target.value)}
                      pattern="[0-9]{2}:[0-5][0-9]"
                      placeholder="--:--"
                      type="text"
                      value={durationMinutes}
                    />
                  </label>
                  <label className="grid min-w-0 gap-1 text-sm font-medium">
                    Ende
                    <input
                      aria-label="Berechnete Endzeit"
                      className="min-h-11 w-full min-w-0 rounded-md border bg-secondary/40 px-3 text-base text-muted-foreground outline-none"
                      placeholder="--:--"
                      readOnly
                      type="text"
                      value={calculatedEndTime}
                    />
                  </label>
                </>
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

      {entryMode === "timer" && isStoppedTimer && currentTimerDraft ? (
        <form
          action={saveTimerAction}
          className="grid gap-3"
          key={`${currentTimerDraft.id}:${currentTimerDraft.status}:${currentTimerDraft.stoppedAtUtc ?? "running"}`}
        >
          <input name="draftId" type="hidden" value={currentTimerDraft.id} />
          <input name="description" type="hidden" value={description} />
          <input name="employeeId" type="hidden" value={targetEmployeeId} />
          <input name="taskId" type="hidden" value={taskId} />
          <input name="billable" type="hidden" value={billable ? "1" : "0"} />

          <div className="grid gap-3 lg:grid-cols-[minmax(180px,200px)_minmax(120px,140px)_minmax(120px,140px)_auto_auto] lg:justify-start xl:grid-cols-[200px_140px_140px_auto_auto]">
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
                  defaultValue={currentTimerDraft.correctionWorkDate}
                  ref={timerWorkDateInputRef}
                  type="date"
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
                defaultValue={currentTimerDraft.correctionStartTime}
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
                name="endTime"
                defaultValue={currentTimerDraft.correctionEndTime}
                type="time"
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

      {entryMode === "timer" && isStoppedTimer && currentTimerDraft ? (
        <form action={discardTimerDraftAction} id="discard-timer-draft">
          <input name="draftId" type="hidden" value={currentTimerDraft.id} />
          <input name="employeeId" type="hidden" value={targetEmployeeId} />
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

      {timerStartState.formError ||
      timerStopState.formError ||
      timerSaveState.formError ||
      pageErrorMessage ? (
        <div className="grid gap-1 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm text-destructive">
          {timerStartState.formError ? <p>{timerStartState.formError}</p> : null}
          {timerStopState.formError ? <p>{timerStopState.formError}</p> : null}
          {timerSaveState.formError ? <p>{timerSaveState.formError}</p> : null}
          {pageErrorMessage ? <p>{pageErrorMessage}</p> : null}
          {Object.entries(timerStartFieldErrors).map(([field, error]) => (
            <p key={`start-${field}`}>
              {fieldErrorMessage(field as keyof typeof fieldLabels, error)}
            </p>
          ))}
          {Object.entries(timerStopFieldErrors).map(([field, error]) => (
            <p key={`stop-${field}`}>
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

      {visibleSuccessMessage ? (
        <p className="rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm text-accent-foreground">
          {visibleSuccessMessage}
        </p>
      ) : null}

      {entryMode === "timer" && currentTimerDraft?.suspicions.length ? (
        <p className="rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm text-destructive">
          {currentTimerDraft.suspicions.includes("over-midnight")
            ? "Timer läuft über Mitternacht. Bitte vor dem Speichern Datum, Start und Ende korrigieren."
            : "Timer läuft seit mindestens 10 Stunden. Bitte vor dem Speichern prüfen."}
        </p>
      ) : null}
    </section>
  );
}

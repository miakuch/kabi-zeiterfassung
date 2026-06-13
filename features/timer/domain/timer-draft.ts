export type TimerDraftStatus = "running" | "stopped";

export type TimerDraft = {
  id: string;
  taskId: string;
  description: string | null;
  billable: boolean;
  startedAtUtc: string;
  stoppedAtUtc: string | null;
  status: TimerDraftStatus;
};

export type TimerDraftInput = {
  id: string;
  taskId: string;
  description?: string | null;
  billable: boolean;
  startedAtUtc: string;
};

export type TimerStartResult =
  | {
      ok: true;
      draft: TimerDraft;
    }
  | {
      ok: false;
      reason: "timer-draft-exists";
    };

export type TimerStopResult =
  | {
      ok: true;
      draft: TimerDraft;
    }
  | {
      ok: false;
      reason: "timer-not-running";
    };

export type TimerSaveReadiness =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "timer-not-stopped" | "missing-description";
    };

export type TimerSuspicion = "over-midnight" | "long-duration";

const TEN_HOURS_MS = 10 * 60 * 60 * 1000;

function trimDescription(description?: string | null) {
  const trimmed = description?.trim();

  return trimmed ? trimmed : null;
}

function datePartInTimeZone(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).format(value);
}

export function startTimerDraft({
  existingDraft,
  input,
}: {
  existingDraft: TimerDraft | null;
  input: TimerDraftInput;
}): TimerStartResult {
  if (existingDraft) {
    return {
      ok: false,
      reason: "timer-draft-exists",
    };
  }

  return {
    ok: true,
    draft: {
      id: input.id,
      taskId: input.taskId,
      description: trimDescription(input.description),
      billable: input.billable,
      startedAtUtc: input.startedAtUtc,
      stoppedAtUtc: null,
      status: "running",
    },
  };
}

export function stopTimerDraft({
  draft,
  stoppedAtUtc,
}: {
  draft: TimerDraft;
  stoppedAtUtc: string;
}): TimerStopResult {
  if (draft.status !== "running") {
    return {
      ok: false,
      reason: "timer-not-running",
    };
  }

  return {
    ok: true,
    draft: {
      ...draft,
      stoppedAtUtc,
      status: "stopped",
    },
  };
}

export function canSaveStoppedTimerDraft(draft: TimerDraft): TimerSaveReadiness {
  if (draft.status !== "stopped") {
    return {
      ok: false,
      reason: "timer-not-stopped",
    };
  }

  if (!trimDescription(draft.description)) {
    return {
      ok: false,
      reason: "missing-description",
    };
  }

  return { ok: true };
}

export function getTimerSuspicions({
  startedAtUtc,
  nowUtc,
  timeZone = "Europe/Berlin",
}: {
  startedAtUtc: string;
  nowUtc: string;
  timeZone?: string;
}): TimerSuspicion[] {
  const startedAt = new Date(startedAtUtc);
  const now = new Date(nowUtc);
  const suspicions = new Set<TimerSuspicion>();

  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(now.getTime())) {
    return [];
  }

  if (datePartInTimeZone(startedAt, timeZone) !== datePartInTimeZone(now, timeZone)) {
    suspicions.add("over-midnight");
  }

  if (now.getTime() - startedAt.getTime() >= TEN_HOURS_MS) {
    suspicions.add("long-duration");
  }

  return [...suspicions];
}

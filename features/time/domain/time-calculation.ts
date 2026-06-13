const SECONDS_PER_DAY = 24 * 60 * 60;
const LONG_DURATION_WARNING_MINUTES = 10 * 60;

export type TimeCalculationError =
  | "invalid-time"
  | "invalid-duration"
  | "end-not-after-start"
  | "crosses-midnight";

export type TimeCalculationWarning = "long-duration";

export type TimeEntryDraft = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  warnings: TimeCalculationWarning[];
};

export type TimeCalculationResult =
  | {
      ok: true;
      value: TimeEntryDraft;
    }
  | {
      ok: false;
      errors: TimeCalculationError[];
    };

function parseTimeToSeconds(time: string) {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim());

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? "0");

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function warningsForDuration(durationMinutes: number): TimeCalculationWarning[] {
  return durationMinutes >= LONG_DURATION_WARNING_MINUTES
    ? ["long-duration"]
    : [];
}

function success(startSeconds: number, endSeconds: number): TimeCalculationResult {
  const durationSeconds = endSeconds - startSeconds;
  const durationMinutes = Math.ceil(durationSeconds / 60);

  return {
    ok: true,
    value: {
      startTime: formatTime(startSeconds),
      endTime: formatTime(endSeconds),
      durationMinutes,
      warnings: warningsForDuration(durationMinutes),
    },
  };
}

export function calculateTimeEntryFromStartEnd({
  startTime,
  endTime,
}: {
  startTime: string;
  endTime: string;
}): TimeCalculationResult {
  const startSeconds = parseTimeToSeconds(startTime);
  const endSeconds = parseTimeToSeconds(endTime);

  if (startSeconds === null || endSeconds === null) {
    return { ok: false, errors: ["invalid-time"] };
  }

  if (endSeconds <= startSeconds) {
    return {
      ok: false,
      errors:
        endSeconds === startSeconds
          ? ["end-not-after-start"]
          : ["crosses-midnight"],
    };
  }

  return success(startSeconds, endSeconds);
}

export function calculateTimeEntryFromStartAndDuration({
  startTime,
  durationMinutes,
}: {
  startTime: string;
  durationMinutes: number;
}): TimeCalculationResult {
  const startSeconds = parseTimeToSeconds(startTime);

  if (startSeconds === null) {
    return { ok: false, errors: ["invalid-time"] };
  }

  if (!Number.isInteger(durationMinutes) || durationMinutes < 1) {
    return { ok: false, errors: ["invalid-duration"] };
  }

  const endSeconds = startSeconds + durationMinutes * 60;

  if (endSeconds >= SECONDS_PER_DAY) {
    return { ok: false, errors: ["crosses-midnight"] };
  }

  return success(startSeconds, endSeconds);
}

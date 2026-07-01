import { z } from "zod";
import {
  calculateTimeEntryFromStartAndDuration,
  calculateTimeEntryFromStartEnd,
  type TimeCalculationError,
  type TimeCalculationWarning,
} from "../time/domain/time-calculation";

export type EntryMode = "timer" | "manual";
export type ManualEntryMode = "end" | "duration";

export type ManualTimeEntryInput = {
  taskId: string;
  description: string;
  workDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: string;
  billable: boolean;
  manualMode: ManualEntryMode;
};

export type ResolvedManualTimeEntry = {
  taskId: string;
  description: string;
  workDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  billable: boolean;
  warnings: TimeCalculationWarning[];
};

export type ManualTimeEntryFieldError =
  | "taskId"
  | "description"
  | "workDate"
  | "startTime"
  | "endTime"
  | "durationMinutes";

export type ManualTimeEntryValidationError =
  | "required"
  | "invalid-date"
  | TimeCalculationError;

export type ManualTimeEntryValidationResult =
  | {
      ok: true;
      value: ResolvedManualTimeEntry;
    }
  | {
      ok: false;
      fieldErrors: Partial<
        Record<ManualTimeEntryFieldError, ManualTimeEntryValidationError>
      >;
    };

const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const entryModeSchema = z.enum(["timer", "manual"]);
const manualModeSchema = z.enum(["end", "duration"]);

export const timeEntryPreferenceSchema = z.object({
  entryMode: entryModeSchema,
  manualMode: manualModeSchema,
});

function requiredText(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function validateCommon(input: ManualTimeEntryInput) {
  const taskId = requiredText(input.taskId);
  const description = requiredText(input.description);
  const workDate = requiredText(input.workDate);
  const startTime = requiredText(input.startTime);
  const fieldErrors: Partial<
    Record<ManualTimeEntryFieldError, ManualTimeEntryValidationError>
  > = {};

  if (!taskId || !uuidSchema.safeParse(taskId).success) {
    fieldErrors.taskId = "required";
  }

  if (!description) {
    fieldErrors.description = "required";
  }

  if (!workDate) {
    fieldErrors.workDate = "required";
  } else if (!dateSchema.safeParse(workDate).success) {
    fieldErrors.workDate = "invalid-date";
  }

  if (!startTime) {
    fieldErrors.startTime = "required";
  }

  return {
    taskId,
    description,
    workDate,
    startTime,
    fieldErrors,
  };
}

function parseDurationToMinutes(duration: string) {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(duration.trim());

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const totalMinutes = hours * 60 + minutes;

  return totalMinutes >= 1 ? totalMinutes : null;
}

export function validateManualTimeEntry(
  input: ManualTimeEntryInput,
): ManualTimeEntryValidationResult {
  const common = validateCommon(input);

  if (input.manualMode === "end") {
    const endTime = requiredText(input.endTime);

    if (!endTime) {
      common.fieldErrors.endTime = "required";
    }

    if (Object.keys(common.fieldErrors).length > 0) {
      return { ok: false, fieldErrors: common.fieldErrors };
    }

    const calculated = calculateTimeEntryFromStartEnd({
      startTime: common.startTime ?? "",
      endTime: endTime ?? "",
    });

    if (!calculated.ok) {
      return {
        ok: false,
        fieldErrors: {
          startTime: calculated.errors[0],
          endTime: calculated.errors[0],
        },
      };
    }

    return {
      ok: true,
      value: {
        taskId: common.taskId ?? "",
        description: common.description ?? "",
        workDate: common.workDate ?? "",
        billable: input.billable,
        ...calculated.value,
      },
    };
  }

  const durationInput = requiredText(input.durationMinutes);
  const duration = durationInput ? parseDurationToMinutes(durationInput) : null;

  if (!durationInput) {
    common.fieldErrors.durationMinutes = "required";
  } else if (duration === null) {
    common.fieldErrors.durationMinutes = "invalid-duration";
  }

  if (Object.keys(common.fieldErrors).length > 0) {
    return { ok: false, fieldErrors: common.fieldErrors };
  }

  const calculated = calculateTimeEntryFromStartAndDuration({
    startTime: common.startTime ?? "",
    durationMinutes: duration ?? 0,
  });

  if (!calculated.ok) {
    return {
      ok: false,
      fieldErrors: {
        startTime: calculated.errors[0],
        durationMinutes: calculated.errors[0],
      },
    };
  }

  return {
    ok: true,
    value: {
      taskId: common.taskId ?? "",
      description: common.description ?? "",
      workDate: common.workDate ?? "",
      billable: input.billable,
      ...calculated.value,
    },
  };
}

export function formValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

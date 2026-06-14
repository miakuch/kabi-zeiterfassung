import type {
  ManualTimeEntryFieldError,
  ManualTimeEntryValidationError,
} from "@/features/time-entry-bar/schema";

export type TimerActionState = {
  formError: string | null;
  fieldErrors: Partial<
    Record<ManualTimeEntryFieldError, ManualTimeEntryValidationError>
  >;
};

export const initialTimerActionState: TimerActionState = {
  formError: null,
  fieldErrors: {},
};

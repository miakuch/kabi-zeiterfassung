import type {
  ManualTimeEntryFieldError,
  ManualTimeEntryValidationError,
} from "@/features/time-entry-bar/schema";
import type { CurrentTimerDraft } from "./queries";

export type TimerActionState = {
  formError: string | null;
  fieldErrors: Partial<
    Record<ManualTimeEntryFieldError, ManualTimeEntryValidationError>
  >;
  draft?: CurrentTimerDraft | null;
  successMessage?: string | null;
};

export const initialTimerActionState: TimerActionState = {
  formError: null,
  fieldErrors: {},
  draft: null,
  successMessage: null,
};

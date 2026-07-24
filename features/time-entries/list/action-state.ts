import type {
  ManualTimeEntryFieldError,
  ManualTimeEntryValidationError,
} from "@/features/time-entry-bar/schema";

export type TimeEntryEditActionState = {
  formError: string | null;
  fieldErrors: Partial<
    Record<ManualTimeEntryFieldError, ManualTimeEntryValidationError>
  >;
  successMessage?: string | null;
};

export const initialTimeEntryEditActionState: TimeEntryEditActionState = {
  formError: null,
  fieldErrors: {},
  successMessage: null,
};

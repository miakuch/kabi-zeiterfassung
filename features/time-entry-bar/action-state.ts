import type {
  ManualTimeEntryFieldError,
  ManualTimeEntryValidationError,
} from "./schema";

export type ManualEntryActionState = {
  formError: string | null;
  fieldErrors: Partial<
    Record<ManualTimeEntryFieldError, ManualTimeEntryValidationError>
  >;
  successMessage?: string | null;
};

export const initialManualEntryActionState: ManualEntryActionState = {
  formError: null,
  fieldErrors: {},
  successMessage: null,
};

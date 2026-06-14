import type {
  ManualTimeEntryFieldError,
  ManualTimeEntryValidationError,
} from "./schema";

export type ManualEntryActionState = {
  formError: string | null;
  fieldErrors: Partial<
    Record<ManualTimeEntryFieldError, ManualTimeEntryValidationError>
  >;
};

export const initialManualEntryActionState: ManualEntryActionState = {
  formError: null,
  fieldErrors: {},
};

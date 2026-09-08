import type {
  ManualTimeEntryFieldError,
  ManualTimeEntryValidationError,
} from "@/features/time-entry-bar/schema";
import type { TimeEntrySegmentErrors } from "@/features/time-entries/segments/domain";

export type TimeEntryEditActionState = {
  formError: string | null;
  fieldErrors: Partial<
    Record<ManualTimeEntryFieldError, ManualTimeEntryValidationError>
  >;
  segmentErrors: TimeEntrySegmentErrors;
  successMessage?: string | null;
};

export const initialTimeEntryEditActionState: TimeEntryEditActionState = {
  formError: null,
  fieldErrors: {},
  segmentErrors: {},
  successMessage: null,
};

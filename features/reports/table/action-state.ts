import type { TimeEntrySegmentErrors } from "@/features/time-entries/segments/domain";

export type ReportTimeEntryEditField = "description" | "startTime" | "endTime";

export type ReportTimeEntryEditState = {
  formError: string | null;
  fieldErrors: Partial<Record<ReportTimeEntryEditField, string>>;
  segmentErrors: TimeEntrySegmentErrors;
};

export const initialReportTimeEntryEditState: ReportTimeEntryEditState = {
  formError: null,
  fieldErrors: {},
  segmentErrors: {},
};

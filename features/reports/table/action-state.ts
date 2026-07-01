export type ReportTimeEntryEditField = "description" | "startTime" | "endTime";

export type ReportTimeEntryEditState = {
  formError: string | null;
  fieldErrors: Partial<Record<ReportTimeEntryEditField, string>>;
};

export const initialReportTimeEntryEditState: ReportTimeEntryEditState = {
  formError: null,
  fieldErrors: {},
};

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEmployeeSession } from "@/lib/auth/require-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateTimeEntrySegments } from "@/features/time-entries/segments/domain";
import { formValue } from "@/features/time-entry-bar/schema";
import type { ReportTimeEntryEditState } from "./action-state";

type ExistingTimeEntryRow = {
  employee_id: string;
  task_id: string;
  work_date: string;
  billable: boolean;
};

function safeReturnTo(value: string) {
  return value === "/berichte" || value.startsWith("/berichte?")
    ? value
    : "/berichte";
}

function formValues(formData: FormData, key: string) {
  return formData.getAll(key).map((value) =>
    typeof value === "string" ? value : "",
  );
}

function resultPath(
  returnTo: string,
  kind: "error" | "success",
  code: string,
) {
  const [pathname, query = ""] = safeReturnTo(returnTo).split("?");
  const params = new URLSearchParams(query);

  params.delete("error");
  params.delete("success");
  params.set(kind, code);

  return `${pathname}?${params.toString()}`;
}

export async function deleteReportTimeEntryAction(formData: FormData) {
  const employee = await requireEmployeeSession();
  const entryId = formValue(formData, "entryId");
  const returnTo = safeReturnTo(formValue(formData, "returnTo"));

  if (!entryId) {
    redirect(resultPath(returnTo, "error", "zeit-ungueltig"));
  }

  const supabase = await createSupabaseServerClient();
  const { data: existingData, error: existingError } = await supabase
    .from("time_entries")
    .select("employee_id")
    .eq("id", entryId)
    .maybeSingle();

  if (
    existingError ||
    !existingData ||
    (employee.role !== "admin" && existingData.employee_id !== employee.id)
  ) {
    redirect(resultPath(returnTo, "error", "zeit-ungueltig"));
  }

  let deleteQuery = supabase.from("time_entries").delete().eq("id", entryId);

  if (employee.role !== "admin") {
    deleteQuery = deleteQuery.eq("employee_id", employee.id);
  }

  const { data: deletedData, error: deleteError } = await deleteQuery
    .select("id")
    .maybeSingle();

  revalidatePath("/berichte");
  revalidatePath("/zeiten");
  redirect(
    deleteError || !deletedData
      ? resultPath(returnTo, "error", "zeit-loeschen")
      : resultPath(returnTo, "success", "zeit-geloescht"),
  );
}

export async function updateReportTimeEntryAction(
  _previousState: ReportTimeEntryEditState,
  formData: FormData,
): Promise<ReportTimeEntryEditState> {
  const employee = await requireEmployeeSession();
  const entryId = formValue(formData, "entryId");
  const description = formValue(formData, "description").trim();
  const segmentStartTimes = formValues(formData, "segmentStartTime");
  const segmentEndTimes = formValues(formData, "segmentEndTime");
  const segmentCount = Math.max(segmentStartTimes.length, segmentEndTimes.length);
  const parsedSegments = validateTimeEntrySegments(
    Array.from({ length: segmentCount }, (_, index) => ({
      startTime: segmentStartTimes[index] ?? "",
      endTime: segmentEndTimes[index] ?? "",
    })),
  );
  const returnTo = safeReturnTo(formValue(formData, "returnTo"));
  const fieldErrors: ReportTimeEntryEditState["fieldErrors"] = {};

  if (!entryId) {
    return {
      formError: "Der Eintrag wurde nicht gefunden.",
      fieldErrors: {},
      segmentErrors: {},
    };
  }

  if (!description) {
    fieldErrors.description = "Bitte gib eine Beschreibung ein.";
  }

  if (Object.keys(fieldErrors).length > 0 || !parsedSegments.ok) {
    return {
      formError:
        !parsedSegments.ok && parsedSegments.reason === "overlapping-segments"
          ? "Zeiträume innerhalb eines Eintrags dürfen sich nicht überschneiden."
          : "Bitte prüfe die markierten Felder und Zeiträume.",
      fieldErrors,
      segmentErrors: parsedSegments.ok ? {} : parsedSegments.segmentErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existingData, error: existingError } = await supabase
    .from("time_entries")
    .select("employee_id, task_id, work_date, billable")
    .eq("id", entryId)
    .maybeSingle();

  if (existingError || !existingData) {
    return {
      formError: "Der Eintrag wurde nicht gefunden.",
      fieldErrors: {},
      segmentErrors: {},
    };
  }

  const existing = existingData as ExistingTimeEntryRow;

  if (employee.role !== "admin" && existing.employee_id !== employee.id) {
    return {
      formError: "Du darfst diesen Eintrag nicht bearbeiten.",
      fieldErrors: {},
      segmentErrors: {},
    };
  }

  const { error: updateError } = await supabase.rpc("save_time_entry_with_segments", {
    p_entry_id: entryId,
    p_task_id: existing.task_id,
    p_description: description,
    p_work_date: existing.work_date,
    p_billable: existing.billable,
    p_segments: parsedSegments.value.segments.map((segment) => ({
      start_time: segment.startTime,
      end_time: segment.endTime,
    })),
  });

  if (updateError) {
    return {
      formError: "Der Eintrag konnte nicht gespeichert werden.",
      fieldErrors: {},
      segmentErrors: {},
    };
  }

  revalidatePath("/berichte");
  revalidatePath("/zeiten");
  redirect(returnTo);
}

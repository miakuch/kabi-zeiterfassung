"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEmployeeSession } from "@/lib/auth/require-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { replaceTimeEntrySegments } from "@/features/time-entries/segments/actions";
import { calculateTimeEntryFromStartEnd } from "@/features/time/domain/time-calculation";
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
  const startTime = formValue(formData, "startTime");
  const endTime = formValue(formData, "endTime");
  const returnTo = safeReturnTo(formValue(formData, "returnTo"));
  const fieldErrors: ReportTimeEntryEditState["fieldErrors"] = {};

  if (!entryId) {
    return {
      formError: "Der Eintrag wurde nicht gefunden.",
      fieldErrors: {},
    };
  }

  if (!description) {
    fieldErrors.description = "Bitte gib eine Beschreibung ein.";
  }

  if (!startTime) {
    fieldErrors.startTime = "Bitte gib eine Startzeit ein.";
  }

  if (!endTime) {
    fieldErrors.endTime = "Bitte gib eine Endzeit ein.";
  }

  const calculated = calculateTimeEntryFromStartEnd({ startTime, endTime });

  if (!calculated.ok && startTime && endTime) {
    const message =
      calculated.errors[0] === "end-not-after-start"
        ? "Die Endzeit muss nach der Startzeit liegen."
        : "Bitte prüfe Start- und Endzeit.";
    fieldErrors.startTime = message;
    fieldErrors.endTime = message;
  }

  if (Object.keys(fieldErrors).length > 0 || !calculated.ok) {
    return {
      formError: "Bitte prüfe die markierten Felder.",
      fieldErrors,
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
    };
  }

  const existing = existingData as ExistingTimeEntryRow;

  if (employee.role !== "admin" && existing.employee_id !== employee.id) {
    return {
      formError: "Du darfst diesen Eintrag nicht bearbeiten.",
      fieldErrors: {},
    };
  }

  let updateQuery = supabase
    .from("time_entries")
    .update({
      description,
      start_time: calculated.value.startTime,
      end_time: calculated.value.endTime,
      duration_minutes: calculated.value.durationMinutes,
      updated_by_employee_id: employee.id,
    })
    .eq("id", entryId);

  if (employee.role !== "admin") {
    updateQuery = updateQuery.eq("employee_id", employee.id);
  }

  const { error: updateError } = await updateQuery;

  if (updateError) {
    return {
      formError: "Der Eintrag konnte nicht gespeichert werden.",
      fieldErrors: {},
    };
  }

  const { error: segmentError } = await replaceTimeEntrySegments({
    entryId,
    segment: {
      workDate: existing.work_date,
      startTime: calculated.value.startTime,
      endTime: calculated.value.endTime,
      durationMinutes: calculated.value.durationMinutes,
    },
  });

  if (segmentError) {
    return {
      formError: "Die Arbeitszeit-Segmente konnten nicht gespeichert werden.",
      fieldErrors: {},
    };
  }

  revalidatePath("/berichte");
  revalidatePath("/zeiten");
  redirect(returnTo);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEmployeeSession } from "@/lib/auth/require-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canBookTaskForEmployee } from "@/features/tasks/task-picker/bookable-task";
import {
  formValue,
  validateManualTimeEntry,
} from "@/features/time-entry-bar/schema";
import { validateTimeEntrySegments } from "@/features/time-entries/segments/domain";
import type { TimeEntryEditActionState } from "./action-state";
import { parseTimeEntriesPageSize, type TimeEntriesPageSize } from "./queries";

function timesPath(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);

  return `/zeiten?${searchParams.toString()}`;
}

function successPath(success: string) {
  return timesPath({ success });
}

function errorPath(error: string) {
  return timesPath({ error });
}

function parseBillable(formData: FormData) {
  return formData.get("billable") === "1";
}

function formValues(formData: FormData, key: string) {
  return formData.getAll(key).map((value) =>
    typeof value === "string" ? value : "",
  );
}

async function getOwnTimeEntry(entryId: string, employeeId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("time_entries")
    .select(
      "id, task_id, description, work_date, start_time, end_time, duration_minutes, billable",
    )
    .eq("id", entryId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id as string,
    taskId: data.task_id as string,
    description: data.description as string,
    workDate: data.work_date as string,
    startTime: data.start_time as string,
    endTime: data.end_time as string,
    durationMinutes: data.duration_minutes as number,
    billable: data.billable as boolean,
  };
}

export async function upsertTimeEntryFromListAction(
  _previousState: TimeEntryEditActionState,
  formData: FormData,
): Promise<TimeEntryEditActionState> {
  const employee = await requireEmployeeSession();
  const intent = formValue(formData, "intent") === "duplicate" ? "duplicate" : "edit";
  const entryId = formValue(formData, "entryId");
  const segmentStartTimes = formValues(formData, "segmentStartTime");
  const segmentEndTimes = formValues(formData, "segmentEndTime");
  const segmentCount = Math.max(segmentStartTimes.length, segmentEndTimes.length);
  const parsedSegments = validateTimeEntrySegments(
    Array.from({ length: segmentCount }, (_, index) => ({
      startTime: segmentStartTimes[index] ?? "",
      endTime: segmentEndTimes[index] ?? "",
    })),
  );
  const parsedCommon = validateManualTimeEntry({
    taskId: formValue(formData, "taskId"),
    description: formValue(formData, "description"),
    workDate: formValue(formData, "workDate"),
    startTime: "00:00",
    endTime: "00:01",
    durationMinutes: "",
    billable: parseBillable(formData),
    manualMode: "end",
  });

  if (!parsedCommon.ok || !parsedSegments.ok) {
    const segmentFormError = !parsedSegments.ok
      ? parsedSegments.reason === "no-segments"
        ? "Mindestens ein Zeitraum ist erforderlich."
        : parsedSegments.reason === "overlapping-segments"
          ? "Zeiträume innerhalb eines Eintrags dürfen sich nicht überschneiden."
          : "Bitte prüfe die markierten Zeiträume."
      : null;

    return {
      formError: segmentFormError ?? "Bitte prüfe die markierten Felder.",
      fieldErrors: parsedCommon.ok ? {} : parsedCommon.fieldErrors,
      segmentErrors: parsedSegments.ok ? {} : parsedSegments.segmentErrors,
    };
  }

  const canBookTask = await canBookTaskForEmployee({
    employeeId: employee.id,
    taskId: parsedCommon.value.taskId,
  });

  if (!canBookTask) {
    return {
      formError: "Diese Aufgabe ist nicht mehr aktiv oder nicht freigegeben.",
      fieldErrors: { taskId: "not-bookable" },
      segmentErrors: {},
    };
  }

  if (intent === "edit" && !entryId) {
    return {
      formError: "Eintrag wurde nicht gefunden.",
      fieldErrors: {},
      segmentErrors: {},
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_time_entry_with_segments", {
    p_entry_id: intent === "duplicate" ? null : entryId,
    p_task_id: parsedCommon.value.taskId,
    p_description: parsedCommon.value.description,
    p_work_date: parsedCommon.value.workDate,
    p_billable: parsedCommon.value.billable,
    p_segments: parsedSegments.value.segments.map((segment) => ({
      start_time: segment.startTime,
      end_time: segment.endTime,
    })),
  });

  if (error) {
    return {
      formError:
        intent === "duplicate"
          ? "Eintrag konnte nicht dupliziert werden."
          : "Eintrag konnte nicht gespeichert werden.",
      fieldErrors: {},
      segmentErrors: {},
    };
  }

  revalidatePath("/zeiten");
  return {
    formError: null,
    fieldErrors: {},
    segmentErrors: {},
    successMessage:
      intent === "duplicate" ? "Eintrag wurde dupliziert." : "Zeit wurde aktualisiert.",
  };
}

export async function toggleTimeEntryBillableAction(formData: FormData) {
  const employee = await requireEmployeeSession();
  const entryId = formValue(formData, "entryId");
  const nextBillable = parseBillable(formData);

  if (!entryId) {
    redirect(errorPath("zeit-ungueltig"));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("time_entries")
    .update({
      billable: nextBillable,
      updated_by_employee_id: employee.id,
    })
    .eq("id", entryId)
    .eq("employee_id", employee.id);

  revalidatePath("/zeiten");
  redirect(error ? errorPath("zeit-speichern") : successPath("zeit-aktualisiert"));
}

export async function deleteTimeEntryAction(formData: FormData) {
  const employee = await requireEmployeeSession();
  const entryId = formValue(formData, "entryId");

  if (!entryId) {
    redirect(errorPath("zeit-ungueltig"));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("time_entries")
    .delete()
    .eq("id", entryId)
    .eq("employee_id", employee.id);

  revalidatePath("/zeiten");
  redirect(error ? errorPath("zeit-loeschen") : successPath("zeit-geloescht"));
}

export async function continueTimeEntryAction(formData: FormData) {
  const employee = await requireEmployeeSession();
  const entryId = formValue(formData, "entryId");
  const entry = entryId ? await getOwnTimeEntry(entryId, employee.id) : null;

  if (!entry) {
    redirect(errorPath("zeit-ungueltig"));
  }

  const supabase = await createSupabaseServerClient();
  const { data: existingDraft, error: draftError } = await supabase
    .from("timer_drafts")
    .select("id")
    .eq("employee_id", employee.id)
    .maybeSingle();

  if (draftError || existingDraft) {
    redirect(errorPath("timer-besteht"));
  }

  const canBookTask = await canBookTaskForEmployee({
    employeeId: employee.id,
    taskId: entry.taskId,
  });

  if (!canBookTask) {
    redirect(errorPath("timer-aufgabe"));
  }

  const { error } = await supabase.from("timer_drafts").insert({
    employee_id: employee.id,
    resumed_time_entry_id: entry.id,
    task_id: entry.taskId,
    description: entry.description,
    billable: entry.billable,
    started_at_utc: new Date().toISOString(),
    status: "running",
  });

  await supabase.from("user_preferences").upsert(
    {
      employee_id: employee.id,
      last_entry_mode: "timer",
    },
    { onConflict: "employee_id" },
  );

  revalidatePath("/zeiten");
  redirect(error ? errorPath("timer-starten") : successPath("timer-gestartet"));
}

export async function updateTimeEntriesPageSizeAction(formData: FormData) {
  const employee = await requireEmployeeSession();
  const pageSize: TimeEntriesPageSize = parseTimeEntriesPageSize(
    formValue(formData, "pageSize"),
  );
  const supabase = await createSupabaseServerClient();

  await supabase.from("user_preferences").upsert(
    {
      employee_id: employee.id,
      time_entries_page_size: pageSize,
    },
    { onConflict: "employee_id" },
  );

  revalidatePath("/zeiten");
  redirect("/zeiten");
}

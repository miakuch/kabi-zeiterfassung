"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEmployeeSession } from "@/lib/auth/require-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addTimeEntrySegment,
  replaceTimeEntrySegments,
} from "@/features/time-entries/segments/actions";
import {
  formValue,
  validateManualTimeEntry,
} from "@/features/time-entry-bar/schema";
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
  const parsed = validateManualTimeEntry({
    taskId: formValue(formData, "taskId"),
    description: formValue(formData, "description"),
    workDate: formValue(formData, "workDate"),
    startTime: formValue(formData, "startTime"),
    endTime: formValue(formData, "endTime"),
    durationMinutes: "",
    billable: parseBillable(formData),
    manualMode: "end",
  });

  if (!parsed.ok) {
    return {
      formError: "Bitte prüfe die markierten Felder.",
      fieldErrors: parsed.fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (intent === "duplicate") {
    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        employee_id: employee.id,
        task_id: parsed.value.taskId,
        description: parsed.value.description,
        work_date: parsed.value.workDate,
        start_time: parsed.value.startTime,
        end_time: parsed.value.endTime,
        duration_minutes: parsed.value.durationMinutes,
        billable: parsed.value.billable,
        created_by_employee_id: employee.id,
        updated_by_employee_id: employee.id,
      })
      .select("id")
      .single();

    if (error || !data) {
      return {
        formError: "Eintrag konnte nicht dupliziert werden.",
        fieldErrors: {},
      };
    }

    const { error: segmentError } = await addTimeEntrySegment({
      entryId: data.id as string,
      segment: {
        workDate: parsed.value.workDate,
        startTime: parsed.value.startTime,
        endTime: parsed.value.endTime,
        durationMinutes: parsed.value.durationMinutes,
      },
    });

    if (segmentError) {
      return {
        formError: "Eintrag konnte nicht vollständig dupliziert werden.",
        fieldErrors: {},
      };
    }

    revalidatePath("/zeiten");
    redirect(successPath("zeit-dupliziert"));
  }

  if (!entryId) {
    return {
      formError: "Eintrag wurde nicht gefunden.",
      fieldErrors: {},
    };
  }

  const { error } = await supabase
    .from("time_entries")
    .update({
      task_id: parsed.value.taskId,
      description: parsed.value.description,
      work_date: parsed.value.workDate,
      start_time: parsed.value.startTime,
      end_time: parsed.value.endTime,
      duration_minutes: parsed.value.durationMinutes,
      billable: parsed.value.billable,
      updated_by_employee_id: employee.id,
    })
    .eq("id", entryId)
    .eq("employee_id", employee.id);

  if (error) {
    return {
      formError: "Eintrag konnte nicht gespeichert werden.",
      fieldErrors: {},
    };
  }

  const { error: segmentError } = await replaceTimeEntrySegments({
    entryId,
    segment: {
      workDate: parsed.value.workDate,
      startTime: parsed.value.startTime,
      endTime: parsed.value.endTime,
      durationMinutes: parsed.value.durationMinutes,
    },
  });

  if (segmentError) {
    return {
      formError: "Eintragssegmente konnten nicht gespeichert werden.",
      fieldErrors: {},
    };
  }

  revalidatePath("/zeiten");
  redirect(successPath("zeit-aktualisiert"));
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

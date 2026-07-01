"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEmployeeSession } from "@/lib/auth/require-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addTimeEntrySegment } from "@/features/time-entries/segments/actions";
import {
  canSaveStoppedTimerDraft,
  type TimerDraft,
} from "./domain/timer-draft";
import {
  mergeResumedTimeEntry,
  type ResumableTimeEntry,
} from "./domain/resume-entry";
import {
  formValue,
  validateManualTimeEntry,
} from "@/features/time-entry-bar/schema";
import type { TimerActionState } from "./action-state";

function trimmedOrNull(value: string) {
  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function timesPath(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);

  return `/zeiten?${searchParams.toString()}`;
}

async function updateTimerPreferenceToTimer(employeeId: string) {
  const supabase = await createSupabaseServerClient();

  await supabase.from("user_preferences").upsert(
    {
      employee_id: employeeId,
      last_entry_mode: "timer",
    },
    { onConflict: "employee_id" },
  );
}

async function getOwnedTimerDraft(draftId: string, employeeId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("timer_drafts")
    .select("id, resumed_time_entry_id, task_id, description, billable, started_at_utc, stopped_at_utc, status")
    .eq("id", draftId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id as string,
    resumedTimeEntryId: data.resumed_time_entry_id as string | null,
    taskId: data.task_id as string,
    description: data.description as string | null,
    billable: data.billable as boolean,
    startedAtUtc: data.started_at_utc as string,
    stoppedAtUtc: data.stopped_at_utc as string | null,
    status: data.status as TimerDraft["status"],
  };
}

async function getResumedTimeEntry(entryId: string, employeeId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("time_entries")
    .select("id, work_date, start_time, end_time, duration_minutes")
    .eq("id", entryId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    workDate: data.work_date as string,
    startTime: data.start_time as string,
    endTime: data.end_time as string,
    durationMinutes: data.duration_minutes as number,
  } satisfies ResumableTimeEntry;
}

async function deleteTimerDraft(draftId: string, employeeId: string) {
  const supabase = await createSupabaseServerClient();

  await supabase
    .from("timer_drafts")
    .delete()
    .eq("id", draftId)
    .eq("employee_id", employeeId);
}

export async function startTimerDraftAction(
  _previousState: TimerActionState,
  formData: FormData,
): Promise<TimerActionState> {
  const employee = await requireEmployeeSession();
  const taskId = formValue(formData, "taskId");

  if (!taskId) {
    return {
      formError: "Bitte wähle eine Aufgabe.",
      fieldErrors: { taskId: "required" },
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existingDraft, error: existingError } = await supabase
    .from("timer_drafts")
    .select("id")
    .eq("employee_id", employee.id)
    .maybeSingle();

  if (existingError) {
    return {
      formError: "Timer konnte nicht geprüft werden.",
      fieldErrors: {},
    };
  }

  if (existingDraft) {
    return {
      formError: "Es gibt bereits einen Timer-Entwurf.",
      fieldErrors: {},
    };
  }

  const { error } = await supabase.from("timer_drafts").insert({
    employee_id: employee.id,
    task_id: taskId,
    description: trimmedOrNull(formValue(formData, "description")),
    billable: formData.get("billable") === "1",
    started_at_utc: new Date().toISOString(),
    status: "running",
  });

  if (error) {
    return {
      formError: "Timer konnte nicht gestartet werden.",
      fieldErrors: {},
    };
  }

  await updateTimerPreferenceToTimer(employee.id);

  revalidatePath("/zeiten");
  redirect(timesPath({ success: "timer-gestartet" }));
}

export async function updateTimerDraftAction(formData: FormData) {
  const employee = await requireEmployeeSession();
  const draftId = formValue(formData, "draftId");
  const taskId = formValue(formData, "taskId");

  if (!draftId || !taskId) {
    redirect(timesPath({ error: "timer-ungueltig" }));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("timer_drafts")
    .update({
      task_id: taskId,
      description: trimmedOrNull(formValue(formData, "description")),
      billable: formData.get("billable") === "1",
    })
    .eq("id", draftId)
    .eq("employee_id", employee.id);

  revalidatePath("/zeiten");
  redirect(timesPath(error ? { error: "timer-speichern" } : { success: "timer-aktualisiert" }));
}

export async function stopTimerDraftAction(formData: FormData) {
  const employee = await requireEmployeeSession();
  const draftId = formValue(formData, "draftId");
  const taskId = formValue(formData, "taskId");

  if (!draftId || !taskId) {
    redirect(timesPath({ error: "timer-ungueltig" }));
  }

  const draft = await getOwnedTimerDraft(draftId, employee.id);

  if (!draft || draft.status !== "running") {
    redirect(timesPath({ error: "timer-stoppen" }));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("timer_drafts")
    .update({
      task_id: taskId,
      description: trimmedOrNull(formValue(formData, "description")),
      billable: formData.get("billable") === "1",
      stopped_at_utc: new Date().toISOString(),
      status: "stopped",
    })
    .eq("id", draftId)
    .eq("employee_id", employee.id);

  revalidatePath("/zeiten");
  redirect(timesPath(error ? { error: "timer-stoppen" } : { success: "timer-gestoppt" }));
}

export async function discardTimerDraftAction(formData: FormData) {
  const employee = await requireEmployeeSession();
  const draftId = formValue(formData, "draftId");

  if (!draftId) {
    redirect(timesPath({ error: "timer-ungueltig" }));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("timer_drafts")
    .delete()
    .eq("id", draftId)
    .eq("employee_id", employee.id);

  revalidatePath("/zeiten");
  redirect(timesPath(error ? { error: "timer-verwerfen" } : { success: "timer-verworfen" }));
}

export async function saveStoppedTimerDraftAction(
  _previousState: TimerActionState,
  formData: FormData,
): Promise<TimerActionState> {
  const employee = await requireEmployeeSession();
  const draftId = formValue(formData, "draftId");
  const taskId = formValue(formData, "taskId");
  const draft = draftId ? await getOwnedTimerDraft(draftId, employee.id) : null;

  if (!draft) {
    return {
      formError: "Timer-Entwurf wurde nicht gefunden.",
      fieldErrors: {},
    };
  }

  const parsed = validateManualTimeEntry({
    taskId,
    description: formValue(formData, "description"),
    workDate: formValue(formData, "workDate"),
    startTime: formValue(formData, "startTime"),
    endTime: formValue(formData, "endTime"),
    durationMinutes: "",
    billable: formData.get("billable") === "1",
    manualMode: "end",
  });

  if (!parsed.ok) {
    return {
      formError: "Bitte prüfe die markierten Felder.",
      fieldErrors: parsed.fieldErrors,
    };
  }

  const readiness = canSaveStoppedTimerDraft({
    ...draft,
    taskId: parsed.value.taskId,
    description: parsed.value.description,
    billable: parsed.value.billable,
  });

  if (!readiness.ok) {
    return {
      formError:
        readiness.reason === "missing-description"
          ? "Bitte ergänze eine Beschreibung."
          : "Timer muss zuerst gestoppt werden.",
      fieldErrors:
        readiness.reason === "missing-description"
          ? { description: "required" }
          : {},
    };
  }

  const supabase = await createSupabaseServerClient();
  const resumedEntry = draft.resumedTimeEntryId
    ? await getResumedTimeEntry(draft.resumedTimeEntryId, employee.id)
    : null;

  if (draft.resumedTimeEntryId && !resumedEntry) {
    return {
      formError: "Der fortgesetzte Eintrag wurde nicht gefunden.",
      fieldErrors: {},
    };
  }

  if (draft.resumedTimeEntryId && resumedEntry) {
    const mergedEntry = mergeResumedTimeEntry({
      existingEntry: resumedEntry,
      segment: {
        workDate: parsed.value.workDate,
        startTime: parsed.value.startTime,
        endTime: parsed.value.endTime,
        durationMinutes: parsed.value.durationMinutes,
      },
    });
    const { error: updateError } = await supabase
      .from("time_entries")
      .update({
        task_id: parsed.value.taskId,
        description: parsed.value.description,
        work_date: mergedEntry.workDate,
        start_time: mergedEntry.startTime,
        end_time: mergedEntry.endTime,
        duration_minutes: mergedEntry.durationMinutes,
        billable: parsed.value.billable,
        updated_by_employee_id: employee.id,
      })
      .eq("id", draft.resumedTimeEntryId)
      .eq("employee_id", employee.id);

    if (updateError) {
      return {
        formError: "Fortgesetzter Eintrag konnte nicht gespeichert werden.",
        fieldErrors: {},
      };
    }

    const { error: segmentError } = await addTimeEntrySegment({
      entryId: draft.resumedTimeEntryId,
      segment: {
        workDate: parsed.value.workDate,
        startTime: parsed.value.startTime,
        endTime: parsed.value.endTime,
        durationMinutes: parsed.value.durationMinutes,
      },
    });

    if (segmentError) {
      return {
        formError: "Fortgesetztes Segment konnte nicht gespeichert werden.",
        fieldErrors: {},
      };
    }

    await deleteTimerDraft(draft.id, employee.id);

    revalidatePath("/zeiten");
    redirect(timesPath({ success: "zeit-aktualisiert" }));
  }

  const { data, error: insertError } = await supabase
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

  if (insertError || !data) {
    return {
      formError: "Timer konnte nicht als Zeiteintrag gespeichert werden.",
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
      formError: "Timersegment konnte nicht gespeichert werden.",
      fieldErrors: {},
    };
  }

  await deleteTimerDraft(draft.id, employee.id);

  revalidatePath("/zeiten");
  redirect(timesPath({ success: "timer-gespeichert" }));
}

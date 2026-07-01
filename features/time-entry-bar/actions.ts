"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEmployeeSession } from "@/lib/auth/require-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addTimeEntrySegment } from "@/features/time-entries/segments/actions";
import {
  formValue,
  timeEntryPreferenceSchema,
  validateManualTimeEntry,
  type EntryMode,
  type ManualEntryMode,
} from "./schema";
import type { ManualEntryActionState } from "./action-state";
import { resolveTimeEntryTargetEmployee } from "./target-employee";
import { canBookTaskForEmployee } from "@/features/tasks/task-picker/bookable-task";

function timesPath(
  params: Record<string, string>,
  targetEmployeeId?: string,
  currentEmployeeId?: string,
) {
  const searchParams = new URLSearchParams(params);

  if (targetEmployeeId && targetEmployeeId !== currentEmployeeId) {
    searchParams.set("employee", targetEmployeeId);
  }

  return `/zeiten?${searchParams.toString()}`;
}

export async function updateTimeEntryPreferences(input: {
  entryMode: EntryMode;
  manualMode: ManualEntryMode;
}) {
  const employee = await requireEmployeeSession();
  const parsed = timeEntryPreferenceSchema.safeParse(input);

  if (!parsed.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from("user_preferences").upsert(
    {
      employee_id: employee.id,
      last_entry_mode: parsed.data.entryMode,
      last_manual_mode: parsed.data.manualMode,
    },
    { onConflict: "employee_id" },
  );
}

export async function createManualTimeEntry(
  _previousState: ManualEntryActionState,
  formData: FormData,
): Promise<ManualEntryActionState> {
  const employee = await requireEmployeeSession();
  const targetEmployee = await resolveTimeEntryTargetEmployee({
    currentEmployee: employee,
    requestedEmployeeId: formValue(formData, "employeeId"),
  });
  const manualMode =
    formValue(formData, "manualMode") === "duration" ? "duration" : "end";
  const parsed = validateManualTimeEntry({
    taskId: formValue(formData, "taskId"),
    description: formValue(formData, "description"),
    workDate: formValue(formData, "workDate"),
    startTime: formValue(formData, "startTime"),
    endTime: formValue(formData, "endTime"),
    durationMinutes: formValue(formData, "durationMinutes"),
    billable: formData.get("billable") === "1",
    manualMode,
  });

  if (!targetEmployee.ok) {
    return {
      formError: targetEmployee.formError,
      fieldErrors: {},
    };
  }

  if (!parsed.ok) {
    return {
      formError: "Bitte prüfe die markierten Felder.",
      fieldErrors: parsed.fieldErrors,
    };
  }

  const canBookTask = await canBookTaskForEmployee({
    employeeId: targetEmployee.employeeId,
    taskId: parsed.value.taskId,
  });

  if (!canBookTask) {
    return {
      formError: "Diese Aufgabe ist für diese:n Mitarbeitende:n nicht freigegeben.",
      fieldErrors: { taskId: "not-bookable" },
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      employee_id: targetEmployee.employeeId,
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
      formError: "Der Eintrag konnte nicht gespeichert werden.",
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
      formError: "Der Eintrag konnte nicht vollständig gespeichert werden.",
      fieldErrors: {},
    };
  }

  await updateTimeEntryPreferences({
    entryMode: "manual",
    manualMode,
  });

  revalidatePath("/zeiten");
  redirect(timesPath(
    { success: "zeit-gespeichert" },
    targetEmployee.employeeId,
    employee.id,
  ));
}

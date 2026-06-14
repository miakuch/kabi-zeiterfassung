"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEmployeeSession } from "@/lib/auth/require-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  formValue,
  timeEntryPreferenceSchema,
  validateManualTimeEntry,
  type EntryMode,
  type ManualEntryMode,
} from "./schema";
import type { ManualEntryActionState } from "./action-state";

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

  if (!parsed.ok) {
    return {
      formError: "Bitte prüfe die markierten Felder.",
      fieldErrors: parsed.fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("time_entries").insert({
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
  });

  if (error) {
    return {
      formError: "Der Eintrag konnte nicht gespeichert werden.",
      fieldErrors: {},
    };
  }

  await updateTimeEntryPreferences({
    entryMode: "manual",
    manualMode,
  });

  revalidatePath("/zeiten");
  redirect("/zeiten?success=zeit-gespeichert");
}

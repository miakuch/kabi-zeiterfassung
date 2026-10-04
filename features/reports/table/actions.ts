"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEmployeeSession } from "@/lib/auth/require-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateTimeEntrySegments } from "@/features/time-entries/segments/domain";
import { formValue } from "@/features/time-entry-bar/schema";
import { z } from "zod";
import type { ReportTimeEntryEditState } from "./action-state";

type ExistingTimeEntryRow = {
  employee_id: string;
};

const uuidSchema = z.string().uuid();
const dateSchema = z.string().date();

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
  const employeeId = formValue(formData, "employeeId");
  const projectId = formValue(formData, "projectId");
  const taskId = formValue(formData, "taskId");
  const workDate = formValue(formData, "workDate");
  const description = formValue(formData, "description").trim();
  const billable = formData.get("billable") === "1";
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

  if (!uuidSchema.safeParse(projectId).success) {
    fieldErrors.projectId = "Bitte wähle ein Projekt aus.";
  }

  if (!uuidSchema.safeParse(taskId).success) {
    fieldErrors.taskId = "Bitte wähle eine Aufgabe aus.";
  }

  if (!dateSchema.safeParse(workDate).success) {
    fieldErrors.workDate = "Bitte gib ein gültiges Datum ein.";
  }

  if (!uuidSchema.safeParse(employeeId).success) {
    fieldErrors.employeeId = "Bitte wähle eine:n Mitarbeitende:n aus.";
  } else if (employee.role !== "admin" && employeeId !== employee.id) {
    fieldErrors.employeeId = "Du darfst den Mitarbeitenden nicht ändern.";
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
    .select("employee_id")
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

  const [
    { data: taskData, error: taskError },
    { data: targetEmployee, error: employeeError },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, project_id")
      .eq("id", taskId)
      .maybeSingle(),
    supabase
      .from("employees")
      .select("id")
      .eq("id", employeeId)
      .maybeSingle(),
  ]);

  if (taskError || !taskData || taskData.project_id !== projectId) {
    return {
      formError: "Bitte prüfe Projekt und Aufgabe.",
      fieldErrors: {
        projectId: "Projekt und Aufgabe passen nicht zusammen.",
        taskId: "Projekt und Aufgabe passen nicht zusammen.",
      },
      segmentErrors: {},
    };
  }

  if (employeeError || !targetEmployee) {
    return {
      formError: "Die mitarbeitende Person wurde nicht gefunden.",
      fieldErrors: {
        employeeId: "Bitte wähle eine:n gültige:n Mitarbeitende:n aus.",
      },
      segmentErrors: {},
    };
  }

  const { error: updateError } = await supabase.rpc("update_time_entry_with_segments", {
    p_entry_id: entryId,
    p_employee_id: employeeId,
    p_task_id: taskId,
    p_description: description,
    p_work_date: workDate,
    p_billable: billable,
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

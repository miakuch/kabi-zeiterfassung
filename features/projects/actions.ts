"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { type z } from "zod";
import { requireAdminSession } from "@/lib/auth/require-session";
import {
  CACHE_TAG_PROJECT_DETAIL_OPTIONS,
  CACHE_TAG_REPORT_FILTER_OPTIONS,
  CACHE_TAG_TASK_PICKER_ITEMS,
} from "@/lib/cache/tags";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  formValue,
  formValues,
  memberRateFormSchema,
  projectFormSchema,
  projectIdSchema,
  projectStatusSchema,
  taskIdSchema,
  taskFormSchema,
} from "./schema";

function projectsPath(
  params: Record<string, string>,
  listStatus: "active" | "inactive" = "active",
) {
  const searchParams = new URLSearchParams(params);

  if (listStatus === "inactive") {
    searchParams.set("status", "inactive");
  }

  const query = searchParams.toString();

  return query ? `/projekte?${query}` : "/projekte";
}

function projectDetailPath(projectId: string, params?: Record<string, string>) {
  if (!params) {
    return `/projekte/${projectId}`;
  }

  const searchParams = new URLSearchParams(params);

  return `/projekte/${projectId}?${searchParams.toString()}`;
}

function newProjectPath(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);

  return `/projekte/neu?${searchParams.toString()}`;
}

function isUniqueViolation(error: { code?: string }) {
  return error.code === "23505";
}

function isForeignKeyViolation(error: { code?: string }) {
  return error.code === "23503";
}

function revalidateProjectMasterData() {
  updateTag(CACHE_TAG_PROJECT_DETAIL_OPTIONS);
  updateTag(CACHE_TAG_REPORT_FILTER_OPTIONS);
  updateTag(CACHE_TAG_TASK_PICKER_ITEMS);
}

function projectPayload(parsed: z.infer<typeof projectFormSchema>) {
  return {
    customer_id: parsed.customerId,
    name: parsed.name,
    code: parsed.code,
    color: parsed.color,
    status: parsed.status,
    hourly_budget: parsed.hourlyBudget,
    amount_budget: parsed.amountBudget,
    budget_alert_basis: parsed.budgetAlertBasis,
    default_hourly_rate: parsed.defaultHourlyRate,
  };
}

export async function createProject(formData: FormData) {
  await requireAdminSession();

  const parsed = projectFormSchema.safeParse({
    customerId: formValue(formData, "customerId"),
    name: formValue(formData, "name"),
    code: formValue(formData, "code"),
    color: formValue(formData, "color") || "#2498ac",
    status: formValue(formData, "status") || "active",
    hourlyBudget: formValue(formData, "hourlyBudget"),
    amountBudget: formValue(formData, "amountBudget"),
    budgetAlertBasis: formValue(formData, "budgetAlertBasis"),
    defaultHourlyRate: formValue(formData, "defaultHourlyRate"),
    createGeneralTask: formData.get("createGeneralTask") === "1",
  });

  if (!parsed.success) {
    redirect(newProjectPath({ error: "ungueltige-eingabe" }));
  }

  const admin = createSupabaseAdminClient();
  const { data: project, error } = await admin
    .from("projects")
    .insert(projectPayload(parsed.data))
    .select("id")
    .single();

  if (error) {
    redirect(newProjectPath({ error: "speichern" }));
  }

  if (parsed.data.createGeneralTask) {
    await admin.from("tasks").insert({
      project_id: project.id,
      name: "Allgemein",
      status: "active",
      default_billable: true,
      assignment_mode: "selected",
    });
  }

  revalidatePath("/projekte");
  revalidateProjectMasterData();
  redirect(projectDetailPath(project.id as string, { success: "angelegt" }));
}

export async function updateProject(formData: FormData) {
  await requireAdminSession();

  const projectId = formValue(formData, "projectId");
  const parsedId = projectIdSchema.safeParse(projectId);

  if (!parsedId.success) {
    redirect(projectsPath({ error: "ungueltige-eingabe" }));
  }

  const parsed = projectFormSchema.safeParse({
    customerId: formValue(formData, "customerId"),
    name: formValue(formData, "name"),
    code: formValue(formData, "code"),
    color: formValue(formData, "color") || "#2498ac",
    status: formValue(formData, "status") || "active",
    hourlyBudget: formValue(formData, "hourlyBudget"),
    amountBudget: formValue(formData, "amountBudget"),
    budgetAlertBasis: formValue(formData, "budgetAlertBasis"),
    defaultHourlyRate: formValue(formData, "defaultHourlyRate"),
    createGeneralTask: false,
  });

  if (!parsed.success) {
    redirect(projectDetailPath(parsedId.data, { error: "ungueltige-eingabe" }));
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("projects")
    .update(projectPayload(parsed.data))
    .eq("id", parsedId.data);

  if (error) {
    redirect(projectDetailPath(parsedId.data, { error: "speichern" }));
  }

  revalidatePath("/projekte");
  revalidatePath(`/projekte/${parsedId.data}`);
  revalidateProjectMasterData();
  redirect(projectDetailPath(parsedId.data, { success: "aktualisiert" }));
}

export async function deleteProject(formData: FormData) {
  await requireAdminSession();

  const parsedId = projectIdSchema.safeParse(formValue(formData, "projectId"));
  const parsedListStatus = projectStatusSchema.safeParse(
    formValue(formData, "listStatus") || "active",
  );
  const listStatus = parsedListStatus.success ? parsedListStatus.data : "active";

  if (!parsedId.success) {
    redirect(projectsPath({ error: "ungueltige-eingabe" }, listStatus));
  }

  const admin = createSupabaseAdminClient();
  const { data: tasksData, error: tasksError } = await admin
    .from("tasks")
    .select("id")
    .eq("project_id", parsedId.data);

  if (tasksError) {
    redirect(projectsPath({ error: "loeschen" }, listStatus));
  }

  const taskIds = ((tasksData ?? []) as Array<{ id: string }>).map(
    (task) => task.id,
  );

  if (taskIds.length > 0) {
    const [
      { count: timeEntryCount, error: timeEntryError },
      { count: timerDraftCount, error: timerDraftError },
    ] = await Promise.all([
      admin
        .from("time_entries")
        .select("id", { count: "exact", head: true })
        .in("task_id", taskIds),
      admin
        .from("timer_drafts")
        .select("id", { count: "exact", head: true })
        .in("task_id", taskIds),
    ]);

    if (timeEntryError || timerDraftError) {
      redirect(projectsPath({ error: "loeschen" }, listStatus));
    }

    if ((timeEntryCount ?? 0) > 0 || (timerDraftCount ?? 0) > 0) {
      redirect(projectsPath({ error: "loeschen-verwendet" }, listStatus));
    }
  }

  const { data: deletedProject, error } = await admin
    .from("projects")
    .delete()
    .eq("id", parsedId.data)
    .select("id")
    .maybeSingle();

  if (error) {
    redirect(
      projectsPath(
        {
          error: isForeignKeyViolation(error) ? "loeschen-verwendet" : "loeschen",
        },
        listStatus,
      ),
    );
  }

  if (!deletedProject) {
    redirect(projectsPath({ error: "nicht-gefunden" }, listStatus));
  }

  revalidatePath("/projekte");
  revalidateProjectMasterData();
  redirect(projectsPath({ success: "geloescht" }, listStatus));
}

export async function upsertTask(formData: FormData) {
  await requireAdminSession();

  const parsed = taskFormSchema.safeParse({
    projectId: formValue(formData, "projectId"),
    taskId: formValue(formData, "taskId") || undefined,
    name: formValue(formData, "name"),
    description: formValue(formData, "description"),
    status: formValue(formData, "status") || "active",
    defaultBillable: formData.get("defaultBillable") === "1",
    assignmentMode: formValue(formData, "assignmentMode") || "selected",
    assignedEmployeeIds: formValues(formData, "assignedEmployeeIds"),
  });

  if (!parsed.success) {
    redirect(projectDetailPath(formValue(formData, "projectId"), { error: "aufgabe" }));
  }

  const admin = createSupabaseAdminClient();
  const payload = {
    project_id: parsed.data.projectId,
    name: parsed.data.name,
    description: parsed.data.description,
    status: parsed.data.status,
    default_billable: parsed.data.defaultBillable,
    assignment_mode: parsed.data.assignmentMode,
  };

  const { data: task, error } = parsed.data.taskId
    ? await admin
        .from("tasks")
        .update(payload)
        .eq("id", parsed.data.taskId)
        .select("id")
        .single()
    : await admin.from("tasks").insert(payload).select("id").single();

  if (error) {
    redirect(
      projectDetailPath(parsed.data.projectId, {
        error: isUniqueViolation(error) ? "aufgabe-vergeben" : "aufgabe",
      }),
    );
  }

  const taskId = task.id as string;
  await admin.from("task_assignments").delete().eq("task_id", taskId);

  if (parsed.data.assignmentMode === "selected") {
    const assignments = parsed.data.assignedEmployeeIds.map((employeeId) => ({
      task_id: taskId,
      employee_id: employeeId,
    }));

    if (assignments.length > 0) {
      const { error: assignmentError } = await admin
        .from("task_assignments")
        .insert(assignments);

      if (assignmentError) {
        redirect(projectDetailPath(parsed.data.projectId, { error: "aufgabe" }));
      }
    }
  }

  revalidatePath(`/projekte/${parsed.data.projectId}`);
  revalidateProjectMasterData();
  redirect(projectDetailPath(parsed.data.projectId, { success: "aufgabe" }));
}

export async function deleteTask(formData: FormData) {
  await requireAdminSession();

  const parsedProjectId = projectIdSchema.safeParse(formValue(formData, "projectId"));
  const parsedTaskId = taskIdSchema.safeParse(formValue(formData, "taskId"));
  const parsedTaskStatus = projectStatusSchema.safeParse(
    formValue(formData, "taskStatus") || "active",
  );
  const taskStatus = parsedTaskStatus.success ? parsedTaskStatus.data : "active";

  if (!parsedProjectId.success || !parsedTaskId.success) {
    redirect(
      projectDetailPath(formValue(formData, "projectId"), {
        error: "aufgabe-loeschen",
        taskStatus,
      }),
    );
  }

  const admin = createSupabaseAdminClient();
  const [
    { count: timeEntryCount, error: timeEntryError },
    { count: timerDraftCount, error: timerDraftError },
  ] = await Promise.all([
    admin
      .from("time_entries")
      .select("id", { count: "exact", head: true })
      .eq("task_id", parsedTaskId.data),
    admin
      .from("timer_drafts")
      .select("id", { count: "exact", head: true })
      .eq("task_id", parsedTaskId.data),
  ]);

  if (timeEntryError || timerDraftError) {
    redirect(
      projectDetailPath(parsedProjectId.data, {
        error: "aufgabe-loeschen",
        taskStatus,
      }),
    );
  }

  if ((timeEntryCount ?? 0) > 0 || (timerDraftCount ?? 0) > 0) {
    redirect(
      projectDetailPath(parsedProjectId.data, {
        error: "aufgabe-loeschen-verwendet",
        taskStatus,
      }),
    );
  }

  const { data: deletedTask, error } = await admin
    .from("tasks")
    .delete()
    .eq("id", parsedTaskId.data)
    .eq("project_id", parsedProjectId.data)
    .select("id")
    .maybeSingle();

  if (error) {
    redirect(
      projectDetailPath(parsedProjectId.data, {
        error: isForeignKeyViolation(error)
          ? "aufgabe-loeschen-verwendet"
          : "aufgabe-loeschen",
        taskStatus,
      }),
    );
  }

  if (!deletedTask) {
    redirect(
      projectDetailPath(parsedProjectId.data, {
        error: "aufgabe-nicht-gefunden",
        taskStatus,
      }),
    );
  }

  revalidatePath("/projekte");
  revalidatePath(`/projekte/${parsedProjectId.data}`);
  revalidateProjectMasterData();
  redirect(
    projectDetailPath(parsedProjectId.data, {
      success: "aufgabe-geloescht",
      taskStatus,
    }),
  );
}

export async function upsertMemberRate(formData: FormData) {
  await requireAdminSession();

  const parsed = memberRateFormSchema.safeParse({
    projectId: formValue(formData, "projectId"),
    employeeId: formValue(formData, "employeeId"),
    hourlyRate: formValue(formData, "hourlyRate"),
  });

  if (!parsed.success) {
    redirect(projectDetailPath(formValue(formData, "projectId"), { error: "stundensatz" }));
  }

  const admin = createSupabaseAdminClient();

  if (parsed.data.hourlyRate === null) {
    const { error } = await admin
      .from("project_member_rates")
      .delete()
      .eq("project_id", parsed.data.projectId)
      .eq("employee_id", parsed.data.employeeId);

    if (error) {
      redirect(projectDetailPath(parsed.data.projectId, { error: "stundensatz" }));
    }
  } else {
    const { error } = await admin.from("project_member_rates").upsert(
      {
        project_id: parsed.data.projectId,
        employee_id: parsed.data.employeeId,
        hourly_rate: parsed.data.hourlyRate,
      },
      { onConflict: "project_id,employee_id" },
    );

    if (error) {
      redirect(projectDetailPath(parsed.data.projectId, { error: "stundensatz" }));
    }
  }

  revalidatePath(`/projekte/${parsed.data.projectId}`);
  redirect(projectDetailPath(parsed.data.projectId, { success: "stundensatz" }));
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type z } from "zod";
import { requireAdminSession } from "@/lib/auth/require-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  formValue,
  formValues,
  memberRateFormSchema,
  projectFormSchema,
  projectIdSchema,
  taskFormSchema,
} from "./schema";

function projectsPath(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);

  return `/projekte?${searchParams.toString()}`;
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
  redirect(projectDetailPath(parsedId.data, { success: "aktualisiert" }));
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
  redirect(projectDetailPath(parsed.data.projectId, { success: "aufgabe" }));
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

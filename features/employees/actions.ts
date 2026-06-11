"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/require-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { wouldRemoveLastActiveAdmin } from "./domain";
import {
  createEmployeeSchema,
  employeeStatusActionSchema,
  formValue,
  updateEmployeeSchema,
} from "./schema";
import { getActiveAdminCount, getEmployeeAdminState } from "./queries";

function employeesPath(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);

  return `/mitarbeitende?${searchParams.toString()}`;
}

function employeeErrorPath(error: string) {
  return employeesPath({ error });
}

function employeeSuccessPath(success: string) {
  return employeesPath({ success });
}

function isUniqueViolation(error: { code?: string }) {
  return error.code === "23505";
}

async function ensureLastAdminIsPreserved({
  employeeId,
  nextRole,
  nextStatus,
}: {
  employeeId: string;
  nextRole: "admin" | "employee";
  nextStatus: "active" | "inactive";
}) {
  const [current, activeAdminCount] = await Promise.all([
    getEmployeeAdminState(employeeId),
    getActiveAdminCount(),
  ]);

  if (!current) {
    redirect(employeeErrorPath("nicht-gefunden"));
  }

  if (
    wouldRemoveLastActiveAdmin({
      activeAdminCount,
      current,
      nextRole,
      nextStatus,
    })
  ) {
    redirect(employeeErrorPath("letzter-admin"));
  }
}

export async function createEmployee(formData: FormData) {
  await requireAdminSession();

  const parsed = createEmployeeSchema.safeParse({
    name: formValue(formData, "name"),
    email: formValue(formData, "email"),
    role: formValue(formData, "role"),
  });

  if (!parsed.success) {
    redirect(employeeErrorPath("ungueltige-eingabe"));
  }

  const supabase = await createSupabaseServerClient();
  const { data: employee, error } = await supabase
    .from("employees")
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    redirect(
      employeeErrorPath(isUniqueViolation(error) ? "email-vergeben" : "speichern"),
    );
  }

  await supabase.from("user_preferences").insert({
    employee_id: employee.id,
  });

  revalidatePath("/mitarbeitende");
  redirect(employeeSuccessPath("angelegt"));
}

export async function updateEmployee(formData: FormData) {
  await requireAdminSession();

  const parsed = updateEmployeeSchema.safeParse({
    id: formValue(formData, "id"),
    name: formValue(formData, "name"),
    email: formValue(formData, "email"),
    role: formValue(formData, "role"),
    status: formValue(formData, "status"),
  });

  if (!parsed.success) {
    redirect(employeeErrorPath("ungueltige-eingabe"));
  }

  await ensureLastAdminIsPreserved({
    employeeId: parsed.data.id,
    nextRole: parsed.data.role,
    nextStatus: parsed.data.status,
  });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("employees")
    .update({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      status: parsed.data.status,
    })
    .eq("id", parsed.data.id);

  if (error) {
    redirect(
      employeeErrorPath(isUniqueViolation(error) ? "email-vergeben" : "speichern"),
    );
  }

  revalidatePath("/mitarbeitende");
  redirect(employeeSuccessPath("aktualisiert"));
}

export async function deactivateEmployee(formData: FormData) {
  await requireAdminSession();

  const parsed = employeeStatusActionSchema.safeParse({
    id: formValue(formData, "id"),
  });

  if (!parsed.success) {
    redirect(employeeErrorPath("ungueltige-eingabe"));
  }

  await ensureLastAdminIsPreserved({
    employeeId: parsed.data.id,
    nextRole: "employee",
    nextStatus: "inactive",
  });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("employees")
    .update({ status: "inactive" })
    .eq("id", parsed.data.id);

  if (error) {
    redirect(employeeErrorPath("speichern"));
  }

  revalidatePath("/mitarbeitende");
  redirect(employeeSuccessPath("deaktiviert"));
}

export async function activateEmployee(formData: FormData) {
  await requireAdminSession();

  const parsed = employeeStatusActionSchema.safeParse({
    id: formValue(formData, "id"),
  });

  if (!parsed.success) {
    redirect(employeeErrorPath("ungueltige-eingabe"));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("employees")
    .update({ status: "active" })
    .eq("id", parsed.data.id);

  if (error) {
    redirect(employeeErrorPath("speichern"));
  }

  revalidatePath("/mitarbeitende");
  redirect(employeeSuccessPath("aktiviert"));
}

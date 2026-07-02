"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/require-session";
import {
  CACHE_TAG_PROJECT_DETAIL_OPTIONS,
  CACHE_TAG_REPORT_FILTER_OPTIONS,
} from "@/lib/cache/tags";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

function isAuthEmailConflict(error: { code?: string; message?: string }) {
  return (
    error.code === "email_exists" ||
    error.code === "user_already_exists" ||
    error.message?.toLowerCase().includes("email") === true
  );
}

function revalidateEmployeeMasterData() {
  updateTag(CACHE_TAG_PROJECT_DETAIL_OPTIONS);
  updateTag(CACHE_TAG_REPORT_FILTER_OPTIONS);
}

async function getEmployeeAuthState(employeeId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("employees")
    .select("id, email, auth_user_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) {
    throw new Error("Mitarbeitendenprofil konnte nicht geladen werden.");
  }

  return data as
    | { id: string; email: string; auth_user_id: string | null }
    | null;
}

async function updateLinkedAuthEmail({
  authUserId,
  previousEmail,
  nextEmail,
}: {
  authUserId: string | null;
  previousEmail: string;
  nextEmail: string;
}) {
  if (!authUserId || previousEmail.toLowerCase() === nextEmail.toLowerCase()) {
    return;
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.updateUserById(authUserId, {
    email: nextEmail,
    email_confirm: true,
  });

  if (error) {
    throw new Error(isAuthEmailConflict(error) ? "email-vergeben" : "auth-email");
  }
}

async function restoreLinkedAuthEmail({
  authUserId,
  previousEmail,
  nextEmail,
}: {
  authUserId: string | null;
  previousEmail: string;
  nextEmail: string;
}) {
  if (!authUserId || previousEmail.toLowerCase() === nextEmail.toLowerCase()) {
    return;
  }

  const admin = createSupabaseAdminClient();
  await admin.auth.admin.updateUserById(authUserId, {
    email: previousEmail,
    email_confirm: true,
  });
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

  if (parsed.data.role === "admin" && formData.get("confirmAdminRole") !== "1") {
    redirect(employeeErrorPath("rollenwechsel-bestaetigen"));
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
  revalidateEmployeeMasterData();
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

  const currentAdminState = await getEmployeeAdminState(parsed.data.id);

  if (!currentAdminState) {
    redirect(employeeErrorPath("nicht-gefunden"));
  }

  if (
    currentAdminState.role !== parsed.data.role &&
    formData.get("confirmRoleChange") !== "1"
  ) {
    redirect(employeeErrorPath("rollenwechsel-bestaetigen"));
  }

  const activeAdminCount = await getActiveAdminCount();

  if (
    wouldRemoveLastActiveAdmin({
      activeAdminCount,
      current: currentAdminState,
      nextRole: parsed.data.role,
      nextStatus: parsed.data.status,
    })
  ) {
    redirect(employeeErrorPath("letzter-admin"));
  }

  const currentEmployee = await getEmployeeAuthState(parsed.data.id);

  if (!currentEmployee) {
    redirect(employeeErrorPath("nicht-gefunden"));
  }

  try {
    await updateLinkedAuthEmail({
      authUserId: currentEmployee.auth_user_id,
      previousEmail: currentEmployee.email,
      nextEmail: parsed.data.email,
    });
  } catch (error) {
    redirect(
      employeeErrorPath(
        error instanceof Error && error.message === "email-vergeben"
          ? "email-vergeben"
          : "speichern",
      ),
    );
  }

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
    await restoreLinkedAuthEmail({
      authUserId: currentEmployee.auth_user_id,
      previousEmail: currentEmployee.email,
      nextEmail: parsed.data.email,
    });

    redirect(
      employeeErrorPath(isUniqueViolation(error) ? "email-vergeben" : "speichern"),
    );
  }

  revalidatePath("/mitarbeitende");
  revalidateEmployeeMasterData();
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
  revalidateEmployeeMasterData();
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
  revalidateEmployeeMasterData();
  redirect(employeeSuccessPath("aktiviert"));
}

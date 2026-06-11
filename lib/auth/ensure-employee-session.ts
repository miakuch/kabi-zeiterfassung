import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";

type EnsureEmployeeSessionInput = {
  authUserId: string;
  email: string;
  fallbackName?: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function nameFromEmail(email: string) {
  return email.split("@")[0] ?? email;
}

export async function ensureEmployeeSession({
  authUserId,
  email,
  fallbackName,
}: EnsureEmployeeSessionInput) {
  const env = getServerEnv();
  const admin = createSupabaseAdminClient();
  const normalizedEmail = normalizeEmail(email);

  const { count, error: countError } = await admin
    .from("employees")
    .select("id", { count: "exact", head: true });

  if (countError) {
    throw new Error("Mitarbeitendenstatus konnte nicht geprueft werden.");
  }

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id, auth_user_id, role, status")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (employeeError) {
    throw new Error("Mitarbeitendenprofil konnte nicht geladen werden.");
  }

  if (!employee) {
    const isInitialAdmin =
      count === 0 &&
      normalizedEmail === normalizeEmail(env.INITIAL_ADMIN_EMAIL);

    if (!isInitialAdmin) {
      throw new Error("Diese E-Mail-Adresse ist nicht fuer die App freigeschaltet.");
    }

    const name =
      fallbackName?.trim() || nameFromEmail(normalizedEmail);

    const { data: createdEmployee, error: createError } = await admin
      .from("employees")
      .insert({
        auth_user_id: authUserId,
        email: normalizedEmail,
        name,
        role: "admin",
        status: "active",
      })
      .select("id")
      .single();

    if (createError) {
      throw new Error("Erster Admin konnte nicht angelegt werden.");
    }

    await admin.from("user_preferences").insert({
      employee_id: createdEmployee.id,
    });

    return createdEmployee.id as string;
  }

  if (employee.status !== "active") {
    throw new Error("Dieses Mitarbeitendenprofil ist deaktiviert.");
  }

  if (employee.auth_user_id && employee.auth_user_id !== authUserId) {
    throw new Error("Diese E-Mail-Adresse ist bereits mit einem anderen Login verknuepft.");
  }

  if (!employee.auth_user_id) {
    const { error: linkError } = await admin
      .from("employees")
      .update({ auth_user_id: authUserId })
      .eq("id", employee.id);

    if (linkError) {
      throw new Error("Login konnte nicht mit dem Mitarbeitendenprofil verknuepft werden.");
    }
  }

  await admin
    .from("user_preferences")
    .upsert({ employee_id: employee.id }, { onConflict: "employee_id" });

  return employee.id as string;
}

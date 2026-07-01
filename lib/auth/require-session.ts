import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type EmployeeRole = "admin" | "employee";

export type CurrentEmployee = {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
};

async function requireEmployeeSessionUncached(): Promise<CurrentEmployee> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const admin = createSupabaseAdminClient();
  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id, name, email, role, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (employeeError || !employee || employee.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login?error=login-nicht-erlaubt");
  }

  return {
    id: employee.id as string,
    name: employee.name as string,
    email: employee.email as string,
    role: employee.role as EmployeeRole,
  };
}

export const requireEmployeeSession = cache(requireEmployeeSessionUncached);

export const requireAdminSession = cache(async (): Promise<CurrentEmployee> => {
  const employee = await requireEmployeeSession();

  if (employee.role !== "admin") {
    redirect("/zeiten");
  }

  return employee;
});

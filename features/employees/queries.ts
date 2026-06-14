import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type EmployeeListItem = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  status: "active" | "inactive";
  hasLogin: boolean;
};

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  status: "active" | "inactive";
  auth_user_id: string | null;
};

export async function getEmployees(): Promise<EmployeeListItem[]> {
  noStore();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, name, email, role, status, auth_user_id")
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Mitarbeitende konnten nicht geladen werden.");
  }

  return ((data ?? []) as EmployeeRow[]).map((employee) => ({
    id: employee.id,
    name: employee.name,
    email: employee.email,
    role: employee.role,
    status: employee.status,
    hasLogin: Boolean(employee.auth_user_id),
  }));
}

export async function getActiveAdminCount() {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("status", "active");

  if (error) {
    throw new Error("Aktive Admins konnten nicht geprüft werden.");
  }

  return count ?? 0;
}

export async function getEmployeeAdminState(employeeId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, role, status")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) {
    throw new Error("Mitarbeitendenstatus konnte nicht geladen werden.");
  }

  return data as
    | { id: string; role: "admin" | "employee"; status: "active" | "inactive" }
    | null;
}

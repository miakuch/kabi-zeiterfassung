import "server-only";

import type { CurrentEmployee } from "@/lib/auth/require-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TimeEntryTargetEmployeeResult =
  | {
      ok: true;
      employeeId: string;
    }
  | {
      ok: false;
      formError: string;
    };

export async function resolveTimeEntryTargetEmployee({
  currentEmployee,
  requestedEmployeeId,
}: {
  currentEmployee: CurrentEmployee;
  requestedEmployeeId: string;
}): Promise<TimeEntryTargetEmployeeResult> {
  const targetEmployeeId = requestedEmployeeId.trim();

  if (!targetEmployeeId || targetEmployeeId === currentEmployee.id) {
    return { ok: true, employeeId: currentEmployee.id };
  }

  if (currentEmployee.role !== "admin" || !uuidPattern.test(targetEmployeeId)) {
    return {
      ok: false,
      formError: "Für diesen Mitarbeitenden darf keine Zeit erfasst werden.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("id", targetEmployeeId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      formError: "Mitarbeitende:r konnte nicht gefunden werden.",
    };
  }

  return { ok: true, employeeId: data.id as string };
}

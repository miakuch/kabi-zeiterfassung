import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RelatedCustomer = {
  status: "active" | "inactive";
};

type RelatedProject = {
  status: "active" | "inactive";
  customers: RelatedCustomer | RelatedCustomer[] | null;
};

type BookableTaskRow = {
  id: string;
  status: "active" | "inactive";
  assignment_mode: "all" | "selected";
  task_assignments: Array<{
    employee_id: string;
  }> | null;
  projects: RelatedProject | RelatedProject[] | null;
};

function firstRelated<T>(value: T | T[] | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function canBookTaskForEmployee({
  employeeId,
  taskId,
}: {
  employeeId: string;
  taskId: string;
}) {
  if (!uuidPattern.test(employeeId) || !uuidPattern.test(taskId)) {
    return false;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, status, assignment_mode, task_assignments(employee_id), projects(status, customers(status))",
    )
    .eq("id", taskId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  const task = data as unknown as BookableTaskRow;
  const project = firstRelated(task.projects);
  const customer = firstRelated(project?.customers ?? null);

  if (
    task.status !== "active" ||
    project?.status !== "active" ||
    customer?.status !== "active"
  ) {
    return false;
  }

  return (
    task.assignment_mode === "all" ||
    (task.task_assignments ?? []).some(
      (assignment) => assignment.employee_id === employeeId,
    )
  );
}

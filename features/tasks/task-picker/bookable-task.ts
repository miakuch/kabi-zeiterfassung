import "server-only";

import {
  getTaskPickerRowsCached,
  type TaskPickerRow,
} from "@/features/tasks/task-picker/queries";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  const rows = await getTaskPickerRowsCached();
  const task = rows.find((row) => row.id === taskId);

  if (!task) {
    return false;
  }

  const project = firstRelated((task as TaskPickerRow).projects);
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

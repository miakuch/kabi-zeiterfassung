export type TimeEntryEmployeeOption = {
  id: string;
  name: string;
  email: string;
};

export function resolveSelectedTimeEntryEmployeeId({
  currentEmployeeId,
  employeeOptions,
  isAdmin,
  requestedEmployeeId,
}: {
  currentEmployeeId: string;
  employeeOptions: TimeEntryEmployeeOption[];
  isAdmin: boolean;
  requestedEmployeeId?: string | null;
}) {
  if (!isAdmin || !requestedEmployeeId) {
    return currentEmployeeId;
  }

  return employeeOptions.some((employee) => employee.id === requestedEmployeeId)
    ? requestedEmployeeId
    : currentEmployeeId;
}

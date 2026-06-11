type EmployeeAdminState = {
  id: string;
  role: "admin" | "employee";
  status: "active" | "inactive";
};

export function wouldRemoveLastActiveAdmin({
  activeAdminCount,
  current,
  nextRole,
  nextStatus,
}: {
  activeAdminCount: number;
  current: EmployeeAdminState;
  nextRole: "admin" | "employee";
  nextStatus: "active" | "inactive";
}) {
  const isCurrentlyActiveAdmin =
    current.role === "admin" && current.status === "active";
  const remainsActiveAdmin = nextRole === "admin" && nextStatus === "active";

  return isCurrentlyActiveAdmin && !remainsActiveAdmin && activeAdminCount <= 1;
}

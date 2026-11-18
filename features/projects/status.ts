export type ProjectStatus = "active" | "inactive" | "archived";

export const projectStatusLabels: Record<ProjectStatus, string> = {
  active: "Aktiv",
  inactive: "Inaktiv",
  archived: "Archiviert",
};

export function projectStatusFromRow(row: {
  status: "active" | "inactive";
  archived_at?: string | null;
}): ProjectStatus {
  return row.archived_at ? "archived" : row.status;
}

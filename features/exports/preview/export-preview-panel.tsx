import { AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatExportDate,
  formatExportDecimalHours,
  type ProjectMonthExportData,
} from "@/features/exports/domain/export-data";
import type { ReportFilterState } from "@/features/reports/filters/domain";
import {
  formatExportMonthValue,
  formatExportMonthLabel,
  type ExportPreviewSelection,
} from "./domain";

type ExportPreviewPanelProps = {
  filters: ReportFilterState;
  preview: ProjectMonthExportData | null;
  selection: ExportPreviewSelection;
  taskNames: string[];
};

function employeeSummary(preview: ProjectMonthExportData) {
  const names = [...new Set(preview.entries.map((entry) => entry.employeeName))];

  return names.length > 0 ? names.join(", ") : "Keine Mitarbeitenden";
}

function taskSummary(preview: ProjectMonthExportData, taskNames: string[]) {
  if (taskNames.length > 0) {
    return taskNames.join(", ");
  }

  if (preview.filteredTaskNames.length > 0) {
    return preview.filteredTaskNames.join(", ");
  }

  const entryTaskNames = [...new Set(preview.entries.map((entry) => entry.taskName))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "de"));

  return entryTaskNames.length === 1 ? entryTaskNames[0] : "";
}

function projectContext(preview: ProjectMonthExportData, taskNames: string[]) {
  return [
    preview.project.projectCode,
    preview.project.projectName,
    taskSummary(preview, taskNames),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" - ");
}

function appendReportFilterParams(
  params: URLSearchParams,
  filters: ReportFilterState,
  taskNames: string[],
) {
  for (const taskId of filters.taskIds) {
    params.append("task", taskId);
  }

  for (const taskName of taskNames) {
    params.append("taskName", taskName);
  }

  for (const employeeId of filters.employeeIds) {
    params.append("employee", employeeId);
  }

  if (filters.billable !== "all") {
    params.set("billable", filters.billable);
  }
}

function excelExportHref({
  filters,
  preview,
  taskNames,
}: {
  filters: ReportFilterState;
  preview: ProjectMonthExportData;
  taskNames: string[];
}) {
  const params = new URLSearchParams({
    project: preview.project.id,
    month: formatExportMonthValue(preview.month),
  });
  appendReportFilterParams(params, filters, taskNames);

  return `/berichte/export/excel?${params.toString()}`;
}

function pdfExportHref({
  filters,
  preview,
  taskNames,
}: {
  filters: ReportFilterState;
  preview: ProjectMonthExportData;
  taskNames: string[];
}) {
  const params = new URLSearchParams({
    project: preview.project.id,
    month: formatExportMonthValue(preview.month),
  });
  appendReportFilterParams(params, filters, taskNames);

  return `/berichte/export/pdf?${params.toString()}`;
}

export function ExportPreviewPanel({
  filters,
  preview,
  selection,
  taskNames,
}: ExportPreviewPanelProps) {
  const canPreview = Boolean(selection.projectId && selection.month);
  const hasEntries = Boolean(preview && preview.entries.length > 0);

  return (
    <section
      className="grid gap-4 rounded-md border bg-card p-4 sm:p-5"
      id="zeitnachweis-export"
    >
      <div>
        <div>
          <h2 className="text-lg font-semibold">Zeitnachweis-Export</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Projekt-Monatsnachweis für den oben gesetzten Filter, ohne
            Stundensätze und Beträge.
          </p>
        </div>
      </div>

      {selection.monthIsInvalid ? (
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Der ausgewählte Monat ist ungültig.</p>
        </div>
      ) : null}

      {!canPreview ? (
        <div className="rounded-md border bg-secondary/60 p-4 text-sm text-muted-foreground">
          Für den Export bitte oben einen vollständigen Kalendermonat und genau
          ein Projekt auswählen. Aufgaben und Mitarbeitende können zusätzlich
          eingeschränkt werden.
        </div>
      ) : null}

      {preview ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap justify-end gap-2">
            {hasEntries ? (
              <>
                <Button asChild variant="outline">
                  <a href={excelExportHref({ filters, preview, taskNames })}>
                    <Download className="size-4" aria-hidden="true" />
                    Excel herunterladen
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={pdfExportHref({ filters, preview, taskNames })}>
                    <Download className="size-4" aria-hidden="true" />
                    PDF herunterladen
                  </a>
                </Button>
              </>
            ) : (
              <>
                <Button disabled type="button" variant="outline">
                  <Download className="size-4" aria-hidden="true" />
                  Excel herunterladen
                </Button>
                <Button disabled type="button" variant="outline">
                  <Download className="size-4" aria-hidden="true" />
                  PDF herunterladen
                </Button>
              </>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                Projekt
              </p>
              <p className="mt-1 font-semibold">
                {projectContext(preview, taskNames)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {preview.project.customerName}
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                Monat
              </p>
              <p className="mt-1 font-semibold">
                {formatExportMonthLabel(preview.month)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatExportDate(preview.startDate)} bis{" "}
                {formatExportDate(preview.endDate)}
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                Abrechenbare Zeit
              </p>
              <p className="mt-1 font-semibold">
                {formatExportDecimalHours(preview.totalDecimalHours)} Stunden
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {preview.entries.length} Einträge
              </p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                Mitarbeitende
              </p>
              <p className="mt-1 text-sm font-medium">{employeeSummary(preview)}</p>
            </div>
          </div>

          {!hasEntries ? (
            <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <p>
                Keine abrechenbaren Einträge für diesen Projektmonat und Filter.
                Zeitnachweise enthalten in V1 nur abrechenbare Zeiten.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

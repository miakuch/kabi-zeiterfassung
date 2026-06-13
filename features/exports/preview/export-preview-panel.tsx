import { AlertTriangle, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatExportDate,
  formatExportDecimalHours,
  type ProjectMonthExportData,
} from "@/features/exports/domain/export-data";
import type { ReportFilterOptions } from "@/features/reports/filters/queries";
import {
  formatExportMonthValue,
  formatExportMonthLabel,
  type ExportPreviewSelection,
} from "./domain";

type PreservedParam = {
  name: string;
  value: string;
};

type ExportPreviewPanelProps = {
  options: ReportFilterOptions;
  preservedParams: PreservedParam[];
  preview: ProjectMonthExportData | null;
  selection: ExportPreviewSelection;
};

function projectLabel(project: ReportFilterOptions["projects"][number]) {
  return project.code ? `${project.code} - ${project.name}` : project.name;
}

function trimTime(value: string) {
  return value.slice(0, 5);
}

function employeeSummary(preview: ProjectMonthExportData) {
  const names = [...new Set(preview.entries.map((entry) => entry.employeeName))];

  return names.length > 0 ? names.join(", ") : "Keine Mitarbeitenden";
}

function excelExportHref(preview: ProjectMonthExportData) {
  const params = new URLSearchParams({
    project: preview.project.id,
    month: formatExportMonthValue(preview.month),
  });

  return `/berichte/export/excel?${params.toString()}`;
}

function pdfExportHref(preview: ProjectMonthExportData) {
  const params = new URLSearchParams({
    project: preview.project.id,
    month: formatExportMonthValue(preview.month),
  });

  return `/berichte/export/pdf?${params.toString()}`;
}

export function ExportPreviewPanel({
  options,
  preservedParams,
  preview,
  selection,
}: ExportPreviewPanelProps) {
  const canPreview = Boolean(selection.projectId && selection.month);
  const hasEntries = Boolean(preview && preview.entries.length > 0);
  const visibleEntries = preview?.entries.slice(0, 6) ?? [];

  return (
    <section className="grid gap-4 rounded-md border bg-card p-4 sm:p-5">
      <div>
        <div>
          <h2 className="text-lg font-semibold">Zeitnachweis-Export</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Projekt-Monatsnachweis ohne Stundensaetze und Betraege.
          </p>
        </div>
      </div>

      <form className="grid gap-4 lg:grid-cols-[1fr_180px_auto]" method="get">
        {preservedParams.map((param) => (
          <input
            key={`${param.name}:${param.value}`}
            name={param.name}
            type="hidden"
            value={param.value}
          />
        ))}

        <label className="grid gap-1 text-sm font-medium">
          Projekt
          <select
            className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            defaultValue={selection.projectId}
            name="exportProject"
          >
            <option value="">Projekt waehlen</option>
            {options.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {projectLabel(project)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Monat
          <input
            className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            defaultValue={selection.monthValue}
            name="exportMonth"
            type="month"
          />
        </label>

        <Button className="self-end" type="submit">
          <Eye className="size-4" aria-hidden="true" />
          Vorschau
        </Button>
      </form>

      {selection.monthIsInvalid ? (
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Der ausgewaehlte Monat ist ungueltig.</p>
        </div>
      ) : null}

      {!canPreview ? (
        <div className="rounded-md border bg-secondary/60 p-4 text-sm text-muted-foreground">
          Bitte Projekt und Monat fuer den Zeitnachweis waehlen.
        </div>
      ) : null}

      {preview ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap justify-end gap-2">
            {hasEntries ? (
              <>
                <Button asChild variant="outline">
                  <a href={excelExportHref(preview)}>
                    <Download className="size-4" aria-hidden="true" />
                    Excel herunterladen
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={pdfExportHref(preview)}>
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
                {preview.project.projectCode
                  ? `${preview.project.projectCode} - ${preview.project.projectName}`
                  : preview.project.projectName}
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
                {preview.entries.length} Eintraege
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
              <p>Keine abrechenbaren Eintraege fuer diesen Projektmonat.</p>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  <th className="border-b px-3 py-2 text-left font-semibold">
                    Datum
                  </th>
                  <th className="border-b px-3 py-2 text-left font-semibold">
                    Arbeitszeit
                  </th>
                  <th className="border-b px-3 py-2 text-left font-semibold">
                    Beschreibung
                  </th>
                  <th className="border-b px-3 py-2 text-left font-semibold">
                    Aufgabe
                  </th>
                  <th className="border-b px-3 py-2 text-left font-semibold">
                    Name
                  </th>
                  <th className="border-b px-3 py-2 text-right font-semibold">
                    Stunden
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.length > 0 ? (
                  visibleEntries.map((entry) => (
                    <tr className="border-b last:border-b-0" key={entry.id}>
                      <td className="whitespace-nowrap px-3 py-2 align-top">
                        {formatExportDate(entry.workDate)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-top">
                        {trimTime(entry.startTime)}-{trimTime(entry.endTime)}
                      </td>
                      <td className="px-3 py-2 align-top font-medium">
                        <span className="block max-w-[320px] truncate">
                          {entry.description}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-muted-foreground">
                        {entry.taskName}
                      </td>
                      <td className="px-3 py-2 align-top">{entry.employeeName}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right align-top">
                        {formatExportDecimalHours(entry.durationDecimalHours)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-3 py-8 text-center text-muted-foreground"
                      colSpan={6}
                    >
                      Keine Eintraege fuer die Vorschau.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {preview.entries.length > visibleEntries.length ? (
            <p className="text-sm text-muted-foreground">
              {preview.entries.length - visibleEntries.length} weitere Eintraege im
              Zeitnachweis.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

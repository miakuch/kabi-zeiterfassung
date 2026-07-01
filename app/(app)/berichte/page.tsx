import { requireEmployeeSession } from "@/lib/auth/require-session";
import { getProjectMonthExportData } from "@/features/exports/domain/queries";
import { ExportPreviewPanel } from "@/features/exports/preview/export-preview-panel";
import { resolveExportPreviewSelection } from "@/features/exports/preview/domain";
import { ReportChart } from "@/features/reports/charts/report-chart";
import { ReportFilters } from "@/features/reports/filters/report-filters";
import { parseReportFilters } from "@/features/reports/filters/domain";
import { getReportFilterOptions } from "@/features/reports/filters/queries";
import { ReportSummaryCards } from "@/features/reports/summary/report-summary-cards";
import type { ReportChartGrouping } from "@/features/reports/summary/domain";
import {
  getReportOverview,
  parseReportChartGrouping,
} from "@/features/reports/summary/queries";
import { ReportTable } from "@/features/reports/table/report-table";

type ReportsPageProps = {
  searchParams: Promise<{
    billable?: string | string[];
    customer?: string | string[];
    employee?: string | string[];
    end?: string | string[];
    exportMonth?: string | string[];
    exportProject?: string | string[];
    project?: string | string[];
    quick?: string | string[];
    showAmounts?: string | string[];
    start?: string | string[];
    task?: string | string[];
    group?: string | string[];
  }>;
};

function preservedReportParams(params: Awaited<ReportsPageProps["searchParams"]>) {
  return Object.entries(params)
    .filter(([key, value]) => Boolean(value) && !key.startsWith("export"))
    .flatMap(([name, value]) =>
      (Array.isArray(value) ? value : [value]).flatMap((item) =>
        item ? [{ name, value: item }] : [],
      ),
    );
}

function paramsHref(
  params: Awaited<ReportsPageProps["searchParams"]>,
  updates: Record<string, string | string[] | null>,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && !(key in updates)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        if (item) {
          searchParams.append(key, item);
        }
      }
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!value) {
      continue;
    }

    for (const item of Array.isArray(value) ? value : [value]) {
      if (item) {
        searchParams.append(key, item);
      }
    }
  }

  const query = searchParams.toString();

  return query ? `/berichte?${query}` : "/berichte";
}

function chartGroupLinks(
  params: Awaited<ReportsPageProps["searchParams"]>,
  groupings: Array<{ value: ReportChartGrouping; label: string }>,
) {
  return groupings.map((grouping) => ({
    ...grouping,
    href: paramsHref(params, { group: grouping.value }),
  }));
}

function ReportsLoadError() {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Auswertung
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Berichte
        </h1>
      </div>

      <div className="rounded-md border border-destructive/30 bg-card p-4 text-sm text-destructive sm:p-5">
        Berichte konnten nicht geladen werden. Bitte lade die Seite neu. Falls
        der Fehler erneut auftritt, stehen Details in den Vercel-Logs.
      </div>
    </section>
  );
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const [employee, params] = await Promise.all([
    requireEmployeeSession(),
    searchParams,
  ]);
  const filters = parseReportFilters(params);
  const grouping = parseReportChartGrouping(
    Array.isArray(params.group) ? params.group[0] : params.group,
    employee.role,
  );
  const showAmounts =
    employee.role === "admin" &&
    (Array.isArray(params.showAmounts)
      ? params.showAmounts[0]
      : params.showAmounts) === "1";
  const exportSelection = resolveExportPreviewSelection({
    exportProjectId: Array.isArray(params.exportProject)
      ? params.exportProject[0]
      : params.exportProject,
    exportMonth: Array.isArray(params.exportMonth)
      ? params.exportMonth[0]
      : params.exportMonth,
    reportProjectId:
      filters.projectIds.length === 1 ? filters.projectIds[0] : "",
    reportStartDate: filters.startDate,
    reportEndDate: filters.endDate,
  });
  const exportPreviewPromise =
    employee.role === "admin" && exportSelection.projectId && exportSelection.month
      ? getProjectMonthExportData({
          projectId: exportSelection.projectId,
          month: exportSelection.month,
        })
      : Promise.resolve(null);
  const [optionsResult, overviewResult, exportPreviewResult] =
    await Promise.allSettled([
      getReportFilterOptions(employee),
      getReportOverview({
        employee,
        filters,
        grouping,
      }),
      exportPreviewPromise,
    ]);

  if (optionsResult.status === "rejected" || overviewResult.status === "rejected") {
    console.error("Reports page failed", {
      options:
        optionsResult.status === "rejected" ? optionsResult.reason : undefined,
      overview:
        overviewResult.status === "rejected" ? overviewResult.reason : undefined,
    });

    return <ReportsLoadError />;
  }

  if (exportPreviewResult.status === "rejected") {
    console.error("Report export preview failed", exportPreviewResult.reason);
  }

  const options = optionsResult.value;
  const overview = overviewResult.value;
  const exportPreview =
    exportPreviewResult.status === "fulfilled" ? exportPreviewResult.value : null;

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Auswertung
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Berichte
        </h1>
      </div>

      <ReportFilters
        key={[
          filters.quickFilter,
          filters.startDate,
          filters.endDate,
          filters.customerIds.join(","),
          filters.projectIds.join(","),
          filters.taskIds.join(","),
          filters.employeeIds.join(","),
          filters.billable,
        ].join(":")}
        filters={filters}
        options={options}
        role={employee.role}
      />

      <ReportSummaryCards role={employee.role} summary={overview.summary} />

      <ReportChart
        activeGrouping={overview.grouping}
        data={overview.chartData}
        groupings={chartGroupLinks(params, overview.availableGroupings)}
      />

      {employee.role === "admin" ? (
        <ExportPreviewPanel
          options={options}
          preservedParams={preservedReportParams(params)}
          preview={exportPreview}
          selection={exportSelection}
        />
      ) : null}

      <ReportTable
        entries={overview.entries}
        hideAmountsHref={paramsHref(params, { showAmounts: null })}
        role={employee.role}
        showAmounts={showAmounts}
        showAmountsHref={paramsHref(params, { showAmounts: "1" })}
      />
    </section>
  );
}

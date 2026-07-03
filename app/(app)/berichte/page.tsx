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
    project?: string | string[];
    quick?: string | string[];
    start?: string | string[];
    task?: string | string[];
    group?: string | string[];
  }>;
};

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

function selectedTaskNames({
  entries,
  taskIds,
  tasks,
}: {
  entries: Array<{ taskId: string; taskName: string }>;
  taskIds: string[];
  tasks: Array<{ id: string; name: string }>;
}) {
  if (taskIds.length === 0) {
    return [];
  }

  const optionTaskNames = tasks
    .filter((task) => taskIds.includes(task.id))
    .map((task) => task.name)
    .sort((a, b) => a.localeCompare(b, "de"));

  if (optionTaskNames.length > 0) {
    return optionTaskNames;
  }

  return [...new Set(
    entries
      .filter((entry) => taskIds.includes(entry.taskId))
      .map((entry) => entry.taskName),
  )].sort((a, b) => a.localeCompare(b, "de"));
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
  const [optionsResult, overviewResult] = await Promise.allSettled([
    getReportFilterOptions(employee),
    getReportOverview({
      employee,
      filters,
      grouping,
    }),
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

  const options = optionsResult.value;
  const overview = overviewResult.value;
  const exportSelection = resolveExportPreviewSelection({
    customerIds: filters.customerIds,
    projectIds: filters.projectIds,
    taskIds: filters.taskIds,
    options,
    reportStartDate: filters.startDate,
    reportEndDate: filters.endDate,
  });
  const taskNames = selectedTaskNames({
    entries: overview.entries,
    taskIds: filters.taskIds,
    tasks: options.tasks,
  });
  const exportPreviewResult =
    employee.role === "admin" && exportSelection.projectId && exportSelection.month
      ? await getProjectMonthExportData({
          projectId: exportSelection.projectId,
          month: exportSelection.month,
          filters: {
            taskIds: filters.taskIds,
            taskNames,
            employeeIds: filters.employeeIds,
            billable: filters.billable,
          },
        }).then(
          (preview) => ({ status: "fulfilled" as const, value: preview }),
          (reason) => ({ status: "rejected" as const, reason }),
        )
      : { status: "fulfilled" as const, value: null };

  if (exportPreviewResult.status === "rejected") {
    console.error("Report export preview failed", exportPreviewResult.reason);
  }

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

      <ReportTable
        entries={overview.entries}
        role={employee.role}
      />

      {employee.role === "admin" ? (
        <ExportPreviewPanel
          filters={filters}
          preview={exportPreview}
          selection={exportSelection}
          taskNames={taskNames}
        />
      ) : null}
    </section>
  );
}

import { requireEmployeeSession } from "@/lib/auth/require-session";
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
    billable?: string;
    customer?: string;
    employee?: string;
    end?: string;
    project?: string;
    quick?: string;
    showAmounts?: string;
    start?: string;
    task?: string;
    group?: string;
  }>;
};

function paramsHref(
  params: Awaited<ReportsPageProps["searchParams"]>,
  updates: Record<string, string | null>,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && !(key in updates)) {
      searchParams.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      searchParams.set(key, value);
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

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const employee = await requireEmployeeSession();
  const params = await searchParams;
  const filters = parseReportFilters(params);
  const grouping = parseReportChartGrouping(params.group, employee.role);
  const showAmounts = employee.role === "admin" && params.showAmounts === "1";
  const [options, overview] = await Promise.all([
    getReportFilterOptions(employee),
    getReportOverview({
      employee,
      filters,
      grouping,
    }),
  ]);

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
        hideAmountsHref={paramsHref(params, { showAmounts: null })}
        role={employee.role}
        showAmounts={showAmounts}
        showAmountsHref={paramsHref(params, { showAmounts: "1" })}
      />
    </section>
  );
}

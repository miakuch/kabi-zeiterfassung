import { Banknote, Clock3 } from "lucide-react";
import type { EmployeeRole } from "@/lib/auth/require-session";
import {
  formatReportAmount,
  formatReportHours,
  type ReportSummary,
} from "./domain";

type ReportSummaryCardsProps = {
  role: EmployeeRole;
  summary: ReportSummary;
};

export function ReportSummaryCards({ role, summary }: ReportSummaryCardsProps) {
  return (
    <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
      <div className="rounded-md border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Gesamtstunden
          </h2>
          <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="mt-3 text-2xl font-semibold">
          {formatReportHours(summary.totalMinutes)}
        </p>
      </div>

      <div className="rounded-md border bg-card p-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Abrechenbar
        </h2>
        <p className="mt-3 text-2xl font-semibold">
          {formatReportHours(summary.billableMinutes)}
        </p>
      </div>

      <div className="rounded-md border bg-card p-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Nicht abrechenbar
        </h2>
        <p className="mt-3 text-2xl font-semibold">
          {formatReportHours(summary.nonBillableMinutes)}
        </p>
      </div>

      {role === "admin" ? (
        <div className="rounded-md border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Abrechenbarer Betrag
            </h2>
            <Banknote className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="mt-3 text-2xl font-semibold">
            {formatReportAmount(summary.billableAmount)}
          </p>
        </div>
      ) : null}
    </section>
  );
}

import Link from "next/link";
import { AlertTriangle, CircleDollarSign, Clock3, Plus } from "lucide-react";
import {
  getProjectOverview,
  type ProjectOverviewItem,
} from "@/features/projects/queries";
import { requireAdminSession } from "@/lib/auth/require-session";

function formatHours(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value)} h`;
}

function formatMoney(value: number | null) {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("de-DE", {
    currency: "EUR",
    style: "currency",
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)} %`;
}

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  const isActive = status === "active";

  return (
    <span
      className={
        isActive
          ? "inline-flex min-h-7 items-center rounded-md bg-accent px-2 text-xs font-medium text-accent-foreground"
          : "inline-flex min-h-7 items-center rounded-md bg-secondary px-2 text-xs font-medium text-muted-foreground"
      }
    >
      {isActive ? "Aktiv" : "Inaktiv"}
    </span>
  );
}

function BudgetStatusBadge({
  project,
}: {
  project: ProjectOverviewItem;
}) {
  if (project.budgetStatus === "no-budget") {
    return (
      <span className="inline-flex min-h-7 items-center rounded-md bg-secondary px-2 text-xs font-medium text-muted-foreground">
        Kein Budget
      </span>
    );
  }

  if (project.budgetStatus === "exceeded") {
    return (
      <span className="inline-flex min-h-7 items-center gap-1 rounded-md bg-[#ffe8e6] px-2 text-xs font-semibold text-destructive">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        Ueberschritten
      </span>
    );
  }

  if (project.budgetStatus === "warning-80") {
    return (
      <span className="inline-flex min-h-7 items-center gap-1 rounded-md bg-[#fff8e6] px-2 text-xs font-semibold text-[#6f4f00]">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        80 % erreicht
      </span>
    );
  }

  return (
    <span className="inline-flex min-h-7 items-center rounded-md bg-accent px-2 text-xs font-medium text-accent-foreground">
      Im Budget
    </span>
  );
}

function BudgetBasisLabel({
  basis,
}: {
  basis: ProjectOverviewItem["budgetAlertBasis"];
}) {
  if (basis === "hours") {
    return "Stunden";
  }

  if (basis === "amount") {
    return "Betrag";
  }

  return "-";
}

export default async function ProjectsPage() {
  await requireAdminSession();
  const projects = await getProjectOverview();

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Stammdaten</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Projekte
          </h1>
        </div>

        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[#1d7d90]"
          href="/projekte/neu"
        >
          <Plus className="size-4" aria-hidden="true" />
          Neues Projekt
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="grid grid-cols-[minmax(220px,1.2fr)_minmax(180px,1fr)_120px_160px_180px_160px] gap-3 border-b bg-secondary px-4 py-3 text-xs font-semibold uppercase text-muted-foreground max-2xl:hidden">
          <span>Projekt</span>
          <span>Kunde</span>
          <span>Status</span>
          <span>Budgetstatus</span>
          <span>Verbrauch</span>
          <span>Offen</span>
        </div>

        {projects.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            Noch keine Projekte angelegt.
          </div>
        ) : null}

        <div className="divide-y">
          {projects.map((project) => {
            const leadingPercent =
              project.budgetAlertBasis === "hours"
                ? project.hoursUsagePercent
                : project.budgetAlertBasis === "amount"
                  ? project.amountUsagePercent
                  : null;

            return (
              <Link
                className="grid gap-4 px-4 py-4 2xl:grid-cols-[minmax(220px,1.2fr)_minmax(180px,1fr)_120px_160px_180px_160px] 2xl:items-center"
                href={`/projekte/${project.id}`}
                key={project.id}
              >
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 block size-4 shrink-0 rounded-sm border"
                      style={{ backgroundColor: project.color }}
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">
                        {project.code ? `${project.code} - ` : ""}
                        {project.name}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {project.activeTaskCount} aktive Aufgaben /{" "}
                        {project.totalTaskCount} gesamt
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-1 text-sm">
                  <span className="text-xs font-semibold uppercase text-muted-foreground 2xl:hidden">
                    Kunde
                  </span>
                  <span>{project.customerName}</span>
                </div>

                <div className="grid gap-1 text-sm">
                  <span className="text-xs font-semibold uppercase text-muted-foreground 2xl:hidden">
                    Status
                  </span>
                  <StatusBadge status={project.status} />
                </div>

                <div className="grid gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase text-muted-foreground 2xl:hidden">
                    Budgetstatus
                  </span>
                  <BudgetStatusBadge project={project} />
                  <span className="text-xs text-muted-foreground">
                    Basis: {BudgetBasisLabel({ basis: project.budgetAlertBasis })}
                    {leadingPercent !== null ? ` - ${formatPercent(leadingPercent)}` : ""}
                  </span>
                </div>

                <div className="grid gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase text-muted-foreground 2xl:hidden">
                    Verbrauch
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
                    {formatHours(project.usedHours)}
                  </span>
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <CircleDollarSign className="size-4" aria-hidden="true" />
                    {formatMoney(project.usedAmount)}
                  </span>
                </div>

                <div className="grid gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase text-muted-foreground 2xl:hidden">
                    Offen
                  </span>
                  <span>{formatHours(project.remainingHours)}</span>
                  <span className="text-muted-foreground">
                    {formatMoney(project.remainingAmount)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

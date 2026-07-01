import Link from "next/link";
import {
  AlertTriangle,
  CircleDollarSign,
  Clock3,
  FolderKanban,
  ListChecks,
  Pencil,
  Plus,
} from "lucide-react";
import {
  getProjectOverview,
  type ProjectOverviewItem,
} from "@/features/projects/queries";
import { requireAdminSession } from "@/lib/auth/require-session";
import { cn } from "@/lib/utils";

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

function formatRate(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("de-DE", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)}/h`;
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
          ? "inline-flex min-h-7 items-center rounded-md bg-accent px-2.5 text-xs font-medium text-accent-foreground"
          : "inline-flex min-h-7 items-center rounded-md bg-secondary px-2.5 text-xs font-medium text-muted-foreground"
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
      <span className="inline-flex min-h-7 items-center rounded-md bg-secondary px-2.5 text-xs font-medium text-muted-foreground">
        Kein Budget
      </span>
    );
  }

  if (project.budgetStatus === "exceeded") {
    return (
      <span className="inline-flex min-h-7 items-center gap-1 rounded-md bg-[#ffe8e6] px-2.5 text-xs font-semibold text-destructive">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        Überschritten
      </span>
    );
  }

  if (project.budgetStatus === "warning-80") {
    return (
      <span className="inline-flex min-h-7 items-center gap-1 rounded-md bg-[#fff8e6] px-2.5 text-xs font-semibold text-[#6f4f00]">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        80 % erreicht
      </span>
    );
  }

  return (
    <span className="inline-flex min-h-7 items-center rounded-md bg-accent px-2.5 text-xs font-medium text-accent-foreground">
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

function leadingBudgetPercent(project: ProjectOverviewItem) {
  if (project.budgetAlertBasis === "hours") {
    return project.hoursUsagePercent;
  }

  if (project.budgetAlertBasis === "amount") {
    return project.amountUsagePercent;
  }

  return null;
}

function progressValue(value: number | null) {
  if (value === null) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 100);
}

function progressColor(project: ProjectOverviewItem) {
  if (project.budgetStatus === "exceeded") {
    return "bg-destructive";
  }

  if (project.budgetStatus === "warning-80") {
    return "bg-[#d99700]";
  }

  return "bg-primary";
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof FolderKanban;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="inline-flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ProjectMetric({
  label,
  primary,
  secondary,
  icon: Icon,
}: {
  label: string;
  primary: string;
  secondary: string;
  icon: typeof Clock3;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold tabular-nums">{primary}</p>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {secondary}
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function ProjectsPage() {
  await requireAdminSession();
  const projects = await getProjectOverview();
  const activeProjects = projects.filter((project) => project.status === "active");
  const budgetAttentionCount = projects.filter(
    (project) =>
      project.budgetStatus === "warning-80" ||
      project.budgetStatus === "exceeded",
  ).length;
  const activeTaskCount = projects.reduce(
    (total, project) => total + project.activeTaskCount,
    0,
  );

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Stammdaten</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Projekte
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {projects.length} Projekte · {activeProjects.length} aktiv ·{" "}
            {budgetAttentionCount} mit Budgethinweis
          </p>
        </div>

        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[#1d7d90]"
          href="/projekte/neu"
        >
          <Plus className="size-4" aria-hidden="true" />
          Neues Projekt
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={FolderKanban}
          label="Aktive Projekte"
          value={activeProjects.length}
        />
        <StatTile
          icon={AlertTriangle}
          label="Budgethinweise"
          value={budgetAttentionCount}
        />
        <StatTile
          icon={ListChecks}
          label="Aktive Aufgaben"
          value={activeTaskCount}
        />
      </div>

      {projects.length === 0 ? (
        <div className="rounded-md border bg-card px-4 py-8 text-sm text-muted-foreground">
          Noch keine Projekte angelegt.
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="hidden grid-cols-[minmax(260px,1.45fr)_minmax(150px,0.9fr)_minmax(180px,1fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_52px] gap-4 px-4 text-xs font-semibold uppercase text-muted-foreground xl:grid">
            <span>Projekt</span>
            <span>Kunde</span>
            <span>Budget</span>
            <span>Verbrauch</span>
            <span>Offen</span>
            <span className="text-right">Aktion</span>
          </div>

          {projects.map((project) => {
            const leadingPercent = leadingBudgetPercent(project);
            const projectLabel = project.code
              ? `${project.code} - ${project.name}`
              : project.name;
            const progress = progressValue(leadingPercent);

            return (
              <article
                className="grid gap-4 rounded-md border bg-card p-4 xl:grid-cols-[minmax(260px,1.45fr)_minmax(150px,0.9fr)_minmax(180px,1fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_52px] xl:items-center"
                key={project.id}
              >
                <div className="min-w-0">
                  <div className="flex items-start gap-3 sm:items-center">
                    <span
                      className="mt-1 block h-12 w-1.5 shrink-0 rounded-full border sm:mt-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {project.code ? (
                          <span className="inline-flex min-h-7 items-center rounded-md bg-secondary px-2.5 text-xs font-semibold text-secondary-foreground">
                            {project.code}
                          </span>
                        ) : null}
                        <StatusBadge status={project.status} />
                      </div>
                      <h2 className="mt-2 text-base font-semibold leading-snug">
                        {project.name}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground xl:hidden">
                        {project.customerName}
                      </p>
                      <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <ListChecks className="size-4" aria-hidden="true" />
                        {project.activeTaskCount} aktiv / {project.totalTaskCount} gesamt
                      </p>
                    </div>
                  </div>
                </div>

                <div className="hidden min-w-0 text-sm xl:block">
                  <p className="truncate font-medium">{project.customerName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Standardsatz {formatRate(project.defaultHourlyRate)}
                  </p>
                </div>

                <div className="grid gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase text-muted-foreground xl:hidden">
                    Budget
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <BudgetStatusBadge project={project} />
                    <span className="text-xs text-muted-foreground">
                      Basis: {BudgetBasisLabel({ basis: project.budgetAlertBasis })}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn("h-full rounded-full", progressColor(project))}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {leadingPercent !== null
                      ? `${formatPercent(leadingPercent)} genutzt`
                      : "Keine führende Budgetbasis"}
                  </p>
                </div>

                <ProjectMetric
                  icon={Clock3}
                  label="Verbrauch"
                  primary={formatHours(project.usedHours)}
                  secondary={formatMoney(project.usedAmount)}
                />

                <ProjectMetric
                  icon={CircleDollarSign}
                  label="Offen"
                  primary={formatHours(project.remainingHours)}
                  secondary={formatMoney(project.remainingAmount)}
                />

                <div className="flex justify-end xl:justify-center">
                  <Link
                    aria-label={`Projekt bearbeiten: ${projectLabel}`}
                    className="inline-flex size-11 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={`/projekte/${project.id}`}
                    title={`Projekt bearbeiten: ${projectLabel}`}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

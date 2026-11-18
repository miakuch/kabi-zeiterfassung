import type { ProjectStatus } from "@/features/projects/status";
import Link from "next/link";
import { cn } from "@/lib/utils";

type StatusTabsProps = {
  activeStatus: ProjectStatus;
  activeCount: number;
  inactiveCount: number;
  archivedCount?: number;
  basePath: string;
  queryKey?: string;
};

function hrefForStatus({
  basePath,
  queryKey,
  status,
}: {
  basePath: string;
  queryKey: string;
  status: ProjectStatus;
}) {
  if (status === "active") {
    return basePath;
  }

  const params = new URLSearchParams({ [queryKey]: status });

  return `${basePath}?${params.toString()}`;
}

export function StatusTabs({
  activeStatus,
  activeCount,
  inactiveCount,
  archivedCount,
  basePath,
  queryKey = "status",
}: StatusTabsProps) {
  const tabs = [
    { status: "active" as const, label: "Aktiv", count: activeCount },
    { status: "inactive" as const, label: "Inaktiv", count: inactiveCount },
    ...(archivedCount === undefined
      ? []
      : [{ status: "archived" as const, label: "Archiv", count: archivedCount }]),
  ];

  return (
    <nav
      aria-label="Statusfilter"
      className="inline-flex w-full rounded-md border bg-card p-1 sm:w-auto"
    >
      {tabs.map((tab) => {
        const isCurrent = tab.status === activeStatus;

        return (
          <Link
            aria-current={isCurrent ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition sm:flex-none",
              isCurrent
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
            )}
            data-preserve-scroll="true"
            href={hrefForStatus({
              basePath,
              queryKey,
              status: tab.status,
            })}
            key={tab.status}
            scroll={false}
          >
            {tab.label}
            <span
              className={cn(
                "inline-flex min-w-6 items-center justify-center rounded-md px-1.5 py-0.5 text-xs tabular-nums",
                isCurrent
                  ? "bg-primary-foreground/15 text-primary-foreground"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {tab.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

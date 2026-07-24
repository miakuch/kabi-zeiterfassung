"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { NoScrollLink } from "@/features/reports/navigation/no-scroll-link";
import type {
  ReportChartGrouping,
  ReportChartPoint,
  ReportTimeGranularity,
} from "../summary/domain";

type ReportChartProps = {
  activeGrouping: ReportChartGrouping;
  activeTimeGranularity: ReportTimeGranularity;
  data: ReportChartPoint[];
  groupings: Array<{
    href: string;
    value: ReportChartGrouping;
    label: string;
  }>;
  timeGranularities: Array<{
    href: string;
    value: ReportTimeGranularity;
    label: string;
  }>;
};

type ProjectSeriesItem = {
  key: string;
  label: string;
  color: string;
};

type StackedChartPoint = ReportChartPoint & Record<string, number | string | unknown>;

type TimeTooltipPayloadItem = {
  color?: string;
  name?: unknown;
  value?: unknown;
  payload?: {
    hours?: unknown;
  };
};

type TimeTooltipProps = {
  active?: boolean;
  granularity: ReportTimeGranularity;
  label?: unknown;
  payload?: readonly TimeTooltipPayloadItem[];
};

function timeChartWidth(dataPointCount: number, granularity: ReportTimeGranularity) {
  const widthByGranularity = {
    day: 32,
    week: 112,
    month: 128,
  } satisfies Record<ReportTimeGranularity, number>;

  return Math.max(720, dataPointCount * widthByGranularity[granularity]);
}

function timeTickLabel(value: unknown, granularity: ReportTimeGranularity) {
  if (typeof value !== "string") {
    return String(value ?? "");
  }

  if (granularity !== "day") {
    return value;
  }

  const [year, month, day] = value.split("-");

  return year && month && day ? `${day}.${month}.` : value;
}

function formatHoursValue(value: unknown) {
  const hours = Number(value);

  return `${Number.isFinite(hours)
    ? hours.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0,00"} h`;
}

function ReportTimeTooltip({
  active,
  granularity,
  label,
  payload,
}: TimeTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const totalHours =
    typeof payload[0]?.payload?.hours === "number"
      ? payload[0].payload.hours
      : payload.reduce((sum, item) => sum + Number(item.value ?? 0), 0);
  const visiblePayload = payload.filter((item) => Number(item.value ?? 0) > 0);

  return (
    <div className="min-w-44 rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{timeTickLabel(label, granularity)}</p>
      <div className="mt-2 grid gap-1">
        {visiblePayload.map((item) => (
          <div
            className="flex items-center justify-between gap-4"
            key={String(item.name)}
          >
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color ?? "#2498ac" }}
              />
              <span className="truncate">{String(item.name ?? "Projekt")}</span>
            </span>
            <span className="font-medium">{formatHoursValue(item.value)}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between gap-4 border-t pt-1 font-semibold">
          <span>Gesamt</span>
          <span>{formatHoursValue(totalHours)}</span>
        </div>
      </div>
    </div>
  );
}

export function ReportChart({
  activeGrouping,
  activeTimeGranularity,
  data,
  groupings,
  timeGranularities,
}: ReportChartProps) {
  const projectSeries = useMemo(() => {
    const series = new Map<string, ProjectSeriesItem>();

    for (const point of data) {
      for (const segment of point.projectSegments ?? []) {
        series.set(segment.key, {
          key: segment.key,
          label: segment.label,
          color: segment.color,
        });
      }
    }

    return [...series.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "de"),
    );
  }, [data]);
  const usesProjectSeries = activeGrouping === "time" && projectSeries.length > 0;
  const stackedData = useMemo(
    () =>
      data.map((point) => {
        const chartPoint: StackedChartPoint = { ...point };

        for (const segment of point.projectSegments ?? []) {
          chartPoint[segment.key] = segment.hours;
        }

        return chartPoint;
      }),
    [data],
  );

  return (
    <section className="grid gap-4 rounded-md border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-semibold">Diagramm</h2>
        <div className="grid gap-2 lg:justify-items-end">
          <div className="flex flex-wrap gap-2">
            {groupings.map((grouping) => (
              <NoScrollLink
                className={cn(
                  "inline-flex min-h-9 items-center rounded-md border px-3 text-sm font-medium transition",
                  grouping.value === activeGrouping
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-secondary",
                )}
                href={grouping.href}
                key={grouping.value}
              >
                {grouping.label}
              </NoScrollLink>
            ))}
          </div>

          {activeGrouping === "time" ? (
            <div className="flex flex-wrap justify-end">
              <div
                aria-label="Zeitverlauf gruppieren"
                className="flex w-fit flex-wrap items-center gap-2 rounded-md border bg-secondary/35 px-2 py-1.5"
                role="group"
              >
                <span className="border-r pr-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  Zeitachse
                </span>
                <div className="flex rounded-md bg-background/70 p-0.5">
                  {timeGranularities.map((granularity) => (
                    <NoScrollLink
                      className={cn(
                        "inline-flex min-h-8 items-center rounded px-2.5 text-sm font-medium transition",
                        granularity.value === activeTimeGranularity
                          ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      href={granularity.href}
                      key={granularity.value}
                    >
                      {granularity.label}
                    </NoScrollLink>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {data.length > 0 ? (
        <div className="h-[300px] min-w-0 overflow-x-auto overflow-y-hidden sm:h-[340px]">
          <div
            className="h-full"
            style={{
              minWidth:
                activeGrouping === "time"
                  ? `${timeChartWidth(data.length, activeTimeGranularity)}px`
                  : undefined,
            }}
          >
            <ResponsiveContainer height="100%" width="100%">
              {activeGrouping === "time" ? (
                <BarChart
                  data={usesProjectSeries ? stackedData : data}
                  margin={{ bottom: 8, left: 0, right: 8, top: 8 }}
                >
                  <CartesianGrid stroke="#d8e2e8" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="label"
                    interval="preserveStartEnd"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      timeTickLabel(value, activeTimeGranularity)
                    }
                  />
                  <YAxis tick={{ fontSize: 12 }} width={44} />
                  <Tooltip
                    content={(props) => (
                      <ReportTimeTooltip
                        {...props}
                        granularity={activeTimeGranularity}
                      />
                    )}
                    labelClassName="text-sm"
                  />
                  {usesProjectSeries ? (
                    projectSeries.map((project) => (
                      <Bar
                        dataKey={project.key}
                        fill={project.color}
                        key={project.key}
                        name={project.label}
                        radius={[4, 4, 0, 0]}
                        stackId={
                          projectSeries.length > 1 ? "projects" : undefined
                        }
                      />
                    ))
                  ) : (
                    <Bar dataKey="hours" fill="#2498ac" radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              ) : (
                <BarChart
                  data={data.slice(0, 12)}
                  layout="vertical"
                  margin={{ bottom: 8, left: 8, right: 16, top: 8 }}
                >
                  <CartesianGrid stroke="#d8e2e8" strokeDasharray="4 4" />
                  <XAxis tick={{ fontSize: 12 }} type="number" />
                  <YAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    type="category"
                    width={120}
                  />
                  <Tooltip formatter={(value) => [`${value} h`, "Stunden"]} />
                  <Bar dataKey="hours" fill="#2498ac" radius={[0, 4, 4, 0]}>
                    {data.slice(0, 12).map((point) => (
                      <Cell
                        fill={
                          activeGrouping === "project"
                            ? (point.color ?? "#2498ac")
                            : "#2498ac"
                        }
                        key={point.label}
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-dashed bg-background px-3 py-8 text-center text-sm text-muted-foreground">
          Keine Daten für den gewählten Filter.
        </p>
      )}
    </section>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type { ReportChartGrouping, ReportChartPoint } from "../summary/domain";

type ReportChartProps = {
  activeGrouping: ReportChartGrouping;
  data: ReportChartPoint[];
  groupings: Array<{
    href: string;
    value: ReportChartGrouping;
    label: string;
  }>;
};

export function ReportChart({
  activeGrouping,
  data,
  groupings,
}: ReportChartProps) {
  return (
    <section className="grid gap-4 rounded-md border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-semibold">Diagramm</h2>
        <div className="flex flex-wrap gap-2">
          {groupings.map((grouping) => (
            <a
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
            </a>
          ))}
        </div>
      </div>

      {data.length > 0 ? (
        <div className="h-[300px] min-w-0 overflow-hidden sm:h-[340px]">
          <ResponsiveContainer height="100%" width="100%">
            {activeGrouping === "time" ? (
              <LineChart data={data} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                <CartesianGrid stroke="#d8e2e8" strokeDasharray="4 4" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={44} />
                <Tooltip
                  formatter={(value) => [`${value} h`, "Stunden"]}
                  labelClassName="text-sm"
                />
                <Line
                  dataKey="hours"
                  dot={{ r: 3 }}
                  stroke="#2498ac"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
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
                <Bar dataKey="hours" fill="#2498ac" radius={[0, 4, 4, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="rounded-md border border-dashed bg-background px-3 py-8 text-center text-sm text-muted-foreground">
          Keine Daten für den gewählten Filter.
        </p>
      )}
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDownUp } from "lucide-react";
import type { EmployeeRole } from "@/lib/auth/require-session";
import { cn } from "@/lib/utils";
import type { ReportEntry } from "../summary/domain";
import {
  formatReportAmount,
  formatReportHours,
  reportDateSortValue,
  reportProjectContext,
  trimReportTime,
} from "./domain";

type ReportTableProps = {
  entries: ReportEntry[];
  role: EmployeeRole;
  showAmounts: boolean;
  showAmountsHref: string;
  hideAmountsHref: string;
};

function headerButton(label: string) {
  return (
    <span className="inline-flex items-center gap-2">
      {label}
      <ArrowDownUp className="size-3.5" aria-hidden="true" />
    </span>
  );
}

export function ReportTable({
  entries,
  role,
  showAmounts,
  showAmountsHref,
  hideAmountsHref,
}: ReportTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const columns = useMemo<Array<ColumnDef<ReportEntry>>>(
    () => [
      {
        id: "date",
        header: () => headerButton("Datum"),
        accessorFn: reportDateSortValue,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.workDate.split("-").reverse().join(".")}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: () => headerButton("Beschreibung"),
        cell: ({ row }) => (
          <span className="block min-w-[220px] max-w-[420px] truncate font-medium">
            {row.original.description}
          </span>
        ),
      },
      {
        id: "context",
        header: () => headerButton("Projekt / Aufgabe / Kunde"),
        accessorFn: reportProjectContext,
        cell: ({ row }) => (
          <span className="block min-w-[260px] max-w-[460px] truncate text-muted-foreground">
            {reportProjectContext(row.original)}
          </span>
        ),
      },
      ...(role === "admin"
        ? ([
            {
              accessorKey: "employeeName",
              header: () => headerButton("Mitarbeitende"),
              cell: ({ row }) => row.original.employeeName,
            } satisfies ColumnDef<ReportEntry>,
          ] satisfies Array<ColumnDef<ReportEntry>>)
        : []),
      {
        accessorKey: "startTime",
        header: () => headerButton("Start"),
        cell: ({ row }) => trimReportTime(row.original.startTime),
      },
      {
        accessorKey: "endTime",
        header: () => headerButton("Ende"),
        cell: ({ row }) => trimReportTime(row.original.endTime),
      },
      {
        accessorKey: "durationMinutes",
        header: () => headerButton("Dauer"),
        cell: ({ row }) => formatReportHours(row.original.durationMinutes),
      },
      {
        accessorKey: "billable",
        header: () => headerButton("Abrechenbar"),
        cell: ({ row }) => (row.original.billable ? "Ja" : "Nein"),
      },
      ...(role === "admin" && showAmounts
        ? ([
            {
              accessorKey: "billableAmount",
              header: () => headerButton("Betrag"),
              cell: ({ row }) => formatReportAmount(row.original.billableAmount),
            } satisfies ColumnDef<ReportEntry>,
          ] satisfies Array<ColumnDef<ReportEntry>>)
        : []),
    ],
    [role, showAmounts],
  );
  // TanStack Table exposes non-memoizable helpers; this is the supported hook API.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: entries,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <section className="grid gap-4 rounded-md border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Detailtabelle</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {entries.length} gefilterte Einträge.
          </p>
        </div>

        {role === "admin" ? (
          <a
            className={cn(
              "inline-flex min-h-10 items-center justify-center rounded-md border px-3 text-sm font-medium transition hover:bg-secondary",
              showAmounts && "border-primary bg-accent text-accent-foreground",
            )}
            href={showAmounts ? hideAmountsHref : showAmountsHref}
          >
            {showAmounts ? "Beträge ausblenden" : "Beträge anzeigen"}
          </a>
        ) : null}
      </div>

      <div className="max-w-full overflow-x-auto rounded-md border">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    className="border-b px-3 py-2 text-left font-semibold"
                    key={header.id}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        className="inline-flex text-left"
                        onClick={header.column.getToggleSortingHandler()}
                        type="button"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr className="border-b last:border-b-0" key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td className="px-3 py-2 align-top" key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-3 py-8 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  Keine Einträge für den gewählten Filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

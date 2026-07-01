"use client";

import { useActionState, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDownUp, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmployeeRole } from "@/lib/auth/require-session";
import type { ReportEntry } from "../summary/domain";
import { initialReportTimeEntryEditState } from "./action-state";
import { updateReportTimeEntryAction } from "./actions";
import {
  formatReportHours,
  reportDateSortValue,
  reportProjectContext,
  trimReportTime,
} from "./domain";

type ReportTableProps = {
  entries: ReportEntry[];
  role: EmployeeRole;
};

function headerButton(label: string) {
  return (
    <span className="inline-flex items-center gap-2">
      {label}
      <ArrowDownUp className="size-3.5" aria-hidden="true" />
    </span>
  );
}

function formatReportDate(value: string) {
  return value.split("-").reverse().join(".");
}

export function ReportTable({
  entries,
  role,
}: ReportTableProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [editor, setEditor] = useState<ReportEntry | null>(null);
  const [editState, editAction, isSaving] = useActionState(
    updateReportTimeEntryAction,
    initialReportTimeEntryEditState,
  );
  const safeEditState = editState ?? initialReportTimeEntryEditState;
  const editFieldErrors = safeEditState.fieldErrors ?? {};
  const returnTo = `${pathname}${searchParams.size > 0 ? `?${searchParams}` : ""}`;

  function inputClass(field: keyof typeof editFieldErrors) {
    return editFieldErrors[field]
      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
      : "";
  }

  const columns = useMemo<Array<ColumnDef<ReportEntry>>>(
    () => [
      {
        id: "date",
        header: () => headerButton("Datum"),
        accessorFn: reportDateSortValue,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {formatReportDate(row.original.workDate)}
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
      {
        id: "actions",
        header: () => "Aktion",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            className="size-9 px-0"
            onClick={() => setEditor(row.original)}
            type="button"
            variant="outline"
          >
            <Pencil className="size-4" aria-hidden="true" />
            <span className="sr-only">Eintrag bearbeiten</span>
          </Button>
        ),
      },
    ],
    [role],
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
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
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
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
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

      {editor ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4">
          <div className="grid max-h-[calc(100vh-2rem)] w-full max-w-2xl gap-4 overflow-y-auto rounded-md border bg-card p-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Zeiteintrag bearbeiten</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatReportDate(editor.workDate)} ·{" "}
                  {reportProjectContext(editor)}
                </p>
              </div>
              <Button
                className="size-9 px-0"
                onClick={() => setEditor(null)}
                type="button"
                variant="ghost"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Schließen</span>
              </Button>
            </div>

            <form action={editAction} className="grid gap-4">
              <input name="entryId" type="hidden" value={editor.id} />
              <input name="returnTo" type="hidden" value={returnTo} />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border bg-background p-3">
                  <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                    Mitarbeitende
                  </p>
                  <p className="mt-1 font-medium">{editor.employeeName}</p>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                    Datum
                  </p>
                  <p className="mt-1 font-medium">
                    {formatReportDate(editor.workDate)}
                  </p>
                </div>
              </div>

              <label className="grid gap-1 text-sm font-medium">
                Beschreibung
                <textarea
                  className={[
                    "min-h-28 rounded-md border bg-background px-3 py-2 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                    inputClass("description"),
                  ].join(" ")}
                  defaultValue={editor.description}
                  name="description"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">
                  Start
                  <input
                    className={[
                      "min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                      inputClass("startTime"),
                    ].join(" ")}
                    defaultValue={trimReportTime(editor.startTime)}
                    name="startTime"
                    type="time"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Ende
                  <input
                    className={[
                      "min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25",
                      inputClass("endTime"),
                    ].join(" ")}
                    defaultValue={trimReportTime(editor.endTime)}
                    name="endTime"
                    type="time"
                  />
                </label>
              </div>

              {safeEditState.formError ? (
                <div className="grid gap-1 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm text-destructive">
                  <p>{safeEditState.formError}</p>
                  {Object.entries(editFieldErrors).map(([field, error]) => (
                    <p key={field}>{error}</p>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  onClick={() => setEditor(null)}
                  type="button"
                  variant="outline"
                >
                  Abbrechen
                </Button>
                <Button disabled={isSaving} type="submit">
                  <Save className="size-4" aria-hidden="true" />
                  Speichern
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

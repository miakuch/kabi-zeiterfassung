import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-session";
import { parseExportMonth } from "@/features/exports/domain/export-data";
import { getProjectMonthExportData } from "@/features/exports/domain/queries";
import type { ReportBillableFilter } from "@/features/reports/filters/domain";
import {
  buildProjectMonthPdfFileName,
  ProjectMonthPdfDocument,
} from "@/features/exports/pdf/document";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseBillableFilter(value: string | null): ReportBillableFilter {
  return value === "billable" || value === "non-billable" ? value : "all";
}

export async function GET(request: Request) {
  await requireAdminSession();

  const requestUrl = new URL(request.url);
  const projectId = requestUrl.searchParams.get("project") ?? "";
  const monthParam = requestUrl.searchParams.get("month") ?? "";
  const month = parseExportMonth(monthParam);
  const filters = {
    taskIds: requestUrl.searchParams.getAll("task"),
    taskNames: requestUrl.searchParams.getAll("taskName"),
    employeeIds: requestUrl.searchParams.getAll("employee"),
    billable: parseBillableFilter(requestUrl.searchParams.get("billable")),
  };

  if (!projectId || !month.ok) {
    return errorResponse("Projekt und Monat sind für den Export erforderlich.", 400);
  }

  const exportData = await getProjectMonthExportData({
    projectId,
    month: month.value,
    filters,
  });

  if (!exportData) {
    return errorResponse("Projekt wurde nicht gefunden.", 404);
  }

  if (exportData.entries.length === 0) {
    return errorResponse(
      "Keine abrechenbaren Einträge für diesen Projektmonat.",
      400,
    );
  }

  const buffer = await renderToBuffer(
    <ProjectMonthPdfDocument data={exportData} />,
  );
  const fileName = buildProjectMonthPdfFileName(exportData);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
    },
  });
}

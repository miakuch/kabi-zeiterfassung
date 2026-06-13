import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-session";
import { parseExportMonth } from "@/features/exports/domain/export-data";
import { getProjectMonthExportData } from "@/features/exports/domain/queries";
import {
  buildProjectMonthPdfFileName,
  ProjectMonthPdfDocument,
} from "@/features/exports/pdf/document";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  await requireAdminSession();

  const requestUrl = new URL(request.url);
  const projectId = requestUrl.searchParams.get("project") ?? "";
  const monthParam = requestUrl.searchParams.get("month") ?? "";
  const month = parseExportMonth(monthParam);

  if (!projectId || !month.ok) {
    return errorResponse("Projekt und Monat sind fuer den Export erforderlich.", 400);
  }

  const exportData = await getProjectMonthExportData({
    projectId,
    month: month.value,
  });

  if (!exportData) {
    return errorResponse("Projekt wurde nicht gefunden.", 404);
  }

  if (exportData.entries.length === 0) {
    return errorResponse(
      "Keine abrechenbaren Eintraege fuer diesen Projektmonat.",
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

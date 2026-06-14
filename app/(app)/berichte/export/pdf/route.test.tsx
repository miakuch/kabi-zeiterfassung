import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectMonthExportData } from "@/features/exports/domain/export-data";
import { GET } from "./route";

const requireAdminSession = vi.hoisted(() => vi.fn());
const getProjectMonthExportData = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/require-session", () => ({
  requireAdminSession,
}));

vi.mock("@/features/exports/domain/queries", () => ({
  getProjectMonthExportData,
}));

const exportData: ProjectMonthExportData = {
  project: {
    id: "project-1",
    customerName: "NDR",
    projectName: "Relaunch",
    projectCode: "NDR-26",
  },
  month: {
    year: 2026,
    month: 6,
  },
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  totalMinutes: 90,
  totalDecimalHours: 1.5,
  entries: [
    {
      id: "entry-1",
      workDate: "2026-06-13",
      startTime: "09:00:00",
      endTime: "10:30:00",
      durationMinutes: 90,
      durationDecimalHours: 1.5,
      description: "Konzeption",
      employeeName: "Mia",
      employeeEmail: "mia@example.com",
      customerName: "NDR",
      projectCode: "NDR-26",
      projectName: "Relaunch",
      taskName: "Konzeption",
      billable: true,
    },
  ],
};

function request(url: string) {
  return new Request(url);
}

describe("pdf export route", () => {
  beforeEach(() => {
    requireAdminSession.mockResolvedValue({
      id: "admin-1",
      name: "Admin",
      email: "admin@example.com",
      role: "admin",
    });
    getProjectMonthExportData.mockResolvedValue(exportData);
  });

  it("requires project and month", async () => {
    const response = await GET(
      request("http://localhost:3000/berichte/export/pdf"),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Projekt und Monat sind für den Export erforderlich.",
    });
    expect(getProjectMonthExportData).not.toHaveBeenCalled();
  });

  it("blocks empty exports", async () => {
    getProjectMonthExportData.mockResolvedValueOnce({
      ...exportData,
      entries: [],
    });

    const response = await GET(
      request(
        "http://localhost:3000/berichte/export/pdf?project=project-1&month=2026-06",
      ),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Keine abrechenbaren Einträge für diesen Projektmonat.",
    });
  });

  it("returns a pdf download for valid export data", async () => {
    const response = await GET(
      request(
        "http://localhost:3000/berichte/export/pdf?project=project-1&month=2026-06",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="NDR_KABI_Zeitnachweis_2026_06.pdf"',
    );

    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });
});

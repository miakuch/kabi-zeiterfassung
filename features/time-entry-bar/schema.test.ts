import { describe, expect, it } from "vitest";
import { validateManualTimeEntry } from "./schema";

const taskId = "41d09b8c-4b62-468c-8fa9-5cf4cc88ad11";

describe("manual time entry validation", () => {
  it("resolves start and end into duration", () => {
    expect(
      validateManualTimeEntry({
        taskId,
        description: "Workshop vorbereitet",
        workDate: "2026-06-13",
        startTime: "09:00",
        endTime: "10:30",
        durationMinutes: "",
        billable: true,
        manualMode: "end",
      }),
    ).toMatchObject({
      ok: true,
      value: {
        startTime: "09:00:00",
        endTime: "10:30:00",
        durationMinutes: 90,
      },
    });
  });

  it("resolves start and duration into an end time", () => {
    expect(
      validateManualTimeEntry({
        taskId,
        description: "Dokumentation",
        workDate: "2026-06-13",
        startTime: "14:15",
        endTime: "",
        durationMinutes: "45",
        billable: false,
        manualMode: "duration",
      }),
    ).toMatchObject({
      ok: true,
      value: {
        startTime: "14:15:00",
        endTime: "15:00:00",
        durationMinutes: 45,
        billable: false,
      },
    });
  });

  it("reports required fields only after submit validation runs", () => {
    expect(
      validateManualTimeEntry({
        taskId: "",
        description: "",
        workDate: "",
        startTime: "",
        endTime: "",
        durationMinutes: "",
        billable: true,
        manualMode: "end",
      }),
    ).toMatchObject({
      ok: false,
      fieldErrors: {
        taskId: "required",
        description: "required",
        workDate: "required",
        startTime: "required",
        endTime: "required",
      },
    });
  });

  it("rejects entries crossing midnight", () => {
    expect(
      validateManualTimeEntry({
        taskId,
        description: "Spaeter Termin",
        workDate: "2026-06-13",
        startTime: "23:30",
        endTime: "",
        durationMinutes: "60",
        billable: true,
        manualMode: "duration",
      }),
    ).toMatchObject({
      ok: false,
      fieldErrors: {
        startTime: "crosses-midnight",
        durationMinutes: "crosses-midnight",
      },
    });
  });
});

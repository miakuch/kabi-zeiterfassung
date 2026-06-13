import { describe, expect, it } from "vitest";
import {
  calculateTimeEntryFromStartAndDuration,
  calculateTimeEntryFromStartEnd,
} from "./time-calculation";

describe("time entry calculation", () => {
  it("calculates duration from start and end", () => {
    expect(
      calculateTimeEntryFromStartEnd({
        startTime: "09:00",
        endTime: "10:30",
      }),
    ).toEqual({
      ok: true,
      value: {
        startTime: "09:00:00",
        endTime: "10:30:00",
        durationMinutes: 90,
        warnings: [],
      },
    });
  });

  it("rounds seconds up to a full minute", () => {
    expect(
      calculateTimeEntryFromStartEnd({
        startTime: "09:00:10",
        endTime: "09:01:00",
      }),
    ).toMatchObject({
      ok: true,
      value: {
        durationMinutes: 1,
      },
    });
  });

  it("calculates end time from start and duration", () => {
    expect(
      calculateTimeEntryFromStartAndDuration({
        startTime: "13:15",
        durationMinutes: 45,
      }),
    ).toMatchObject({
      ok: true,
      value: {
        startTime: "13:15:00",
        endTime: "14:00:00",
        durationMinutes: 45,
      },
    });
  });

  it("rejects zero minute duration", () => {
    expect(
      calculateTimeEntryFromStartAndDuration({
        startTime: "13:15",
        durationMinutes: 0,
      }),
    ).toEqual({
      ok: false,
      errors: ["invalid-duration"],
    });
  });

  it("rejects entries over midnight", () => {
    expect(
      calculateTimeEntryFromStartEnd({
        startTime: "23:30",
        endTime: "00:15",
      }),
    ).toEqual({
      ok: false,
      errors: ["crosses-midnight"],
    });
  });

  it("warns at ten hours without blocking", () => {
    expect(
      calculateTimeEntryFromStartAndDuration({
        startTime: "08:00",
        durationMinutes: 600,
      }),
    ).toMatchObject({
      ok: true,
      value: {
        warnings: ["long-duration"],
      },
    });
  });
});

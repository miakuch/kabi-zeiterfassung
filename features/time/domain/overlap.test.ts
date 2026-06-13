import { describe, expect, it } from "vitest";
import { checkTimeEntryOverlap } from "./overlap";

const existingEntries = [
  {
    id: "morning",
    workDate: "2026-06-13",
    startTime: "09:00:00",
    endTime: "10:00:00",
  },
  {
    id: "other-day",
    workDate: "2026-06-14",
    startTime: "09:30:00",
    endTime: "10:30:00",
  },
];

describe("time entry overlap check", () => {
  it("returns clear when ranges only touch", () => {
    expect(
      checkTimeEntryOverlap({
        candidate: {
          workDate: "2026-06-13",
          startTime: "10:00:00",
          endTime: "11:00:00",
        },
        existingEntries,
        confirmed: false,
      }),
    ).toEqual({
      status: "clear",
      overlappingEntries: [],
    });
  });

  it("warns for overlapping entries", () => {
    expect(
      checkTimeEntryOverlap({
        candidate: {
          workDate: "2026-06-13",
          startTime: "09:30:00",
          endTime: "10:30:00",
        },
        existingEntries,
        confirmed: false,
      }),
    ).toMatchObject({
      status: "warning",
      overlappingEntries: [{ id: "morning" }],
    });
  });

  it("allows confirmed overlaps without changing persisted data", () => {
    expect(
      checkTimeEntryOverlap({
        candidate: {
          workDate: "2026-06-13",
          startTime: "09:30:00",
          endTime: "10:30:00",
        },
        existingEntries,
        confirmed: true,
      }).status,
    ).toBe("confirmed");
  });

  it("ignores the edited entry itself", () => {
    expect(
      checkTimeEntryOverlap({
        candidate: {
          workDate: "2026-06-13",
          startTime: "09:15:00",
          endTime: "09:45:00",
        },
        existingEntries,
        ignoreEntryId: "morning",
        confirmed: false,
      }),
    ).toEqual({
      status: "clear",
      overlappingEntries: [],
    });
  });
});

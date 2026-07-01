import { describe, expect, it } from "vitest";
import {
  addElapsedMinutesToTimeInput,
  getBerlinDateTimeInputValues,
  getElapsedMinutes,
} from "./timezone";

describe("timer timezone helpers", () => {
  it("formats UTC timestamps as Berlin date and time inputs", () => {
    expect(getBerlinDateTimeInputValues("2026-06-13T07:15:00.000Z")).toEqual({
      workDate: "2026-06-13",
      time: "09:15",
    });
  });

  it("rounds elapsed seconds up to full minutes", () => {
    expect(
      getElapsedMinutes(
        "2026-06-13T07:15:00.000Z",
        "2026-06-13T07:15:01.000Z",
      ),
    ).toBe(1);
  });

  it("rounds date time input values up when requested", () => {
    expect(
      getBerlinDateTimeInputValues("2026-06-13T07:15:01.000Z", {
        roundUpMinute: true,
      }),
    ).toEqual({
      workDate: "2026-06-13",
      time: "09:16",
    });

    expect(
      getBerlinDateTimeInputValues("2026-06-13T07:15:00.000Z", {
        roundUpMinute: true,
      }),
    ).toEqual({
      workDate: "2026-06-13",
      time: "09:15",
    });
  });

  it("adds rounded elapsed timer minutes to the displayed start time", () => {
    const startTime = getBerlinDateTimeInputValues(
      "2026-06-13T07:00:50.000Z",
    ).time;
    const elapsedMinutes = getElapsedMinutes(
      "2026-06-13T07:00:50.000Z",
      "2026-06-13T07:01:10.000Z",
    );

    expect(elapsedMinutes).toBe(1);
    expect(addElapsedMinutesToTimeInput(startTime, elapsedMinutes)).toBe("09:01");
  });
});

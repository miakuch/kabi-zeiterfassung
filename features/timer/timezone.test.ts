import { describe, expect, it } from "vitest";
import {
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
});

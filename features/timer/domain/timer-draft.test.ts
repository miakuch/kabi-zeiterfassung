import { describe, expect, it } from "vitest";
import {
  canSaveStoppedTimerDraft,
  getTimerSuspicions,
  startTimerDraft,
  stopTimerDraft,
  type TimerDraft,
} from "./timer-draft";

const runningDraft: TimerDraft = {
  id: "draft-1",
  taskId: "task-1",
  description: null,
  billable: true,
  startedAtUtc: "2026-06-13T07:00:00.000Z",
  stoppedAtUtc: null,
  status: "running",
};

describe("timer draft state machine", () => {
  it("starts a timer when no draft exists", () => {
    expect(
      startTimerDraft({
        existingDraft: null,
        input: {
          id: "draft-2",
          taskId: "task-2",
          description: "  Recherche  ",
          billable: false,
          startedAtUtc: "2026-06-13T08:00:00.000Z",
        },
      }),
    ).toMatchObject({
      ok: true,
      draft: {
        description: "Recherche",
        status: "running",
      },
    });
  });

  it("blocks a new timer while any draft exists", () => {
    expect(
      startTimerDraft({
        existingDraft: {
          ...runningDraft,
          status: "stopped",
          stoppedAtUtc: "2026-06-13T08:00:00.000Z",
        },
        input: {
          id: "draft-2",
          taskId: "task-2",
          billable: true,
          startedAtUtc: "2026-06-13T08:15:00.000Z",
        },
      }),
    ).toEqual({
      ok: false,
      reason: "timer-draft-exists",
    });
  });

  it("stops a running timer without requiring a description", () => {
    expect(
      stopTimerDraft({
        draft: runningDraft,
        stoppedAtUtc: "2026-06-13T08:00:00.000Z",
      }),
    ).toMatchObject({
      ok: true,
      draft: {
        description: null,
        status: "stopped",
      },
    });
  });

  it("requires a stopped timer with description before saving", () => {
    expect(
      canSaveStoppedTimerDraft({
        ...runningDraft,
        status: "stopped",
        stoppedAtUtc: "2026-06-13T08:00:00.000Z",
      }),
    ).toEqual({
      ok: false,
      reason: "missing-description",
    });

    expect(
      canSaveStoppedTimerDraft({
        ...runningDraft,
        description: "Analyse",
        status: "stopped",
        stoppedAtUtc: "2026-06-13T08:00:00.000Z",
      }),
    ).toEqual({ ok: true });
  });

  it("warns when a timer runs over midnight or at least ten hours", () => {
    expect(
      getTimerSuspicions({
        startedAtUtc: "2026-06-13T08:00:00.000Z",
        nowUtc: "2026-06-13T18:00:00.000Z",
      }),
    ).toEqual(["long-duration"]);

    expect(
      getTimerSuspicions({
        startedAtUtc: "2026-06-13T21:30:00.000Z",
        nowUtc: "2026-06-14T02:00:00.000Z",
      }),
    ).toContain("over-midnight");
  });
});

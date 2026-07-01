import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTimerSuspicions, type TimerDraftStatus } from "./domain/timer-draft";
import {
  addElapsedMinutesToTimeInput,
  getBerlinDateTimeInputValues,
  getElapsedMinutes,
} from "./timezone";

export type CurrentTimerDraft = {
  id: string;
  resumedTimeEntryId: string | null;
  taskId: string;
  description: string | null;
  billable: boolean;
  startedAtUtc: string;
  stoppedAtUtc: string | null;
  status: TimerDraftStatus;
  correctionWorkDate: string;
  correctionStartTime: string;
  correctionEndTime: string;
  elapsedMinutes: number;
  suspicions: Array<"over-midnight" | "long-duration">;
};

type TimerDraftRow = {
  id: string;
  resumed_time_entry_id: string | null;
  task_id: string;
  description: string | null;
  billable: boolean;
  started_at_utc: string;
  stopped_at_utc: string | null;
  status: TimerDraftStatus;
};

function toCurrentTimerDraft(row: TimerDraftRow): CurrentTimerDraft {
  const nowUtc = new Date().toISOString();
  const effectiveEndUtc = row.stopped_at_utc ?? nowUtc;
  const startValues = getBerlinDateTimeInputValues(row.started_at_utc);
  const endValues = getBerlinDateTimeInputValues(effectiveEndUtc, {
    roundUpMinute: Boolean(row.stopped_at_utc),
  });
  const elapsedMinutes = getElapsedMinutes(row.started_at_utc, effectiveEndUtc);
  const correctionEndTime = row.stopped_at_utc
    ? addElapsedMinutesToTimeInput(startValues.time, elapsedMinutes)
    : endValues.time;

  return {
    id: row.id,
    resumedTimeEntryId: row.resumed_time_entry_id,
    taskId: row.task_id,
    description: row.description,
    billable: row.billable,
    startedAtUtc: row.started_at_utc,
    stoppedAtUtc: row.stopped_at_utc,
    status: row.status,
    correctionWorkDate: startValues.workDate,
    correctionStartTime: startValues.time,
    correctionEndTime,
    elapsedMinutes,
    suspicions: getTimerSuspicions({
      startedAtUtc: row.started_at_utc,
      nowUtc: effectiveEndUtc,
    }),
  };
}

export async function getCurrentTimerDraft(
  employeeId: string,
): Promise<CurrentTimerDraft | null> {
  noStore();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("timer_drafts")
    .select("id, resumed_time_entry_id, task_id, description, billable, started_at_utc, stopped_at_utc, status")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error) {
    throw new Error("Timer-Entwurf konnte nicht geladen werden.");
  }

  return data ? toCurrentTimerDraft(data as TimerDraftRow) : null;
}

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TimeEntrySegmentInput = {
  workDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

export async function addTimeEntrySegment({
  entryId,
  segment,
}: {
  entryId: string;
  segment: TimeEntrySegmentInput;
}) {
  const supabase = await createSupabaseServerClient();

  return supabase.from("time_entry_segments").insert({
    time_entry_id: entryId,
    work_date: segment.workDate,
    start_time: segment.startTime,
    end_time: segment.endTime,
    duration_minutes: segment.durationMinutes,
  });
}

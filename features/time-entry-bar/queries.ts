import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EntryMode, ManualEntryMode } from "./schema";
import type { TimeEntriesPageSize } from "@/features/time-entries/list/queries";

export type TimeEntryPreferences = {
  lastEntryMode: EntryMode;
  lastManualMode: ManualEntryMode;
  timeEntriesPageSize: TimeEntriesPageSize;
};

type PreferenceRow = {
  last_entry_mode: EntryMode;
  last_manual_mode: ManualEntryMode;
  time_entries_page_size: TimeEntriesPageSize;
};

export async function getTimeEntryPreferences(
  employeeId: string,
): Promise<TimeEntryPreferences> {
  noStore();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("last_entry_mode, last_manual_mode, time_entries_page_size")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error) {
    throw new Error("Nutzerpraeferenzen konnten nicht geladen werden.");
  }

  const preferences = data as PreferenceRow | null;

  return {
    lastEntryMode: preferences?.last_entry_mode ?? "timer",
    lastManualMode: preferences?.last_manual_mode ?? "end",
    timeEntriesPageSize: preferences?.time_entries_page_size ?? 50,
  };
}

export function getTodayInBerlin(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
}

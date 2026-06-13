export type TimeEntryListGroup<T extends { workDate: string; durationMinutes: number }> = {
  workDate: string;
  totalDurationMinutes: number;
  entries: T[];
};

export function formatDuration(minutes: number) {
  const safeMinutes = Math.max(0, minutes);
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`;
}

export function formatGermanDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}

export function groupTimeEntriesByDate<
  T extends { workDate: string; durationMinutes: number },
>(entries: T[]): Array<TimeEntryListGroup<T>> {
  const groups = new Map<string, TimeEntryListGroup<T>>();

  for (const entry of entries) {
    const group = groups.get(entry.workDate) ?? {
      workDate: entry.workDate,
      totalDurationMinutes: 0,
      entries: [],
    };

    group.totalDurationMinutes += entry.durationMinutes;
    group.entries.push(entry);
    groups.set(entry.workDate, group);
  }

  return [...groups.values()];
}

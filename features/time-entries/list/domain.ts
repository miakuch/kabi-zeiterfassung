export type TimeEntryListGroup<T extends { workDate: string; durationMinutes: number }> = {
  workDate: string;
  totalDurationMinutes: number;
  entries: T[];
};

export type TimeEntryListWeekGroup<
  T extends { workDate: string; durationMinutes: number },
> = {
  weekKey: string;
  weekLabel: string;
  dateRangeLabel: string;
  totalDurationMinutes: number;
  days: Array<TimeEntryListGroup<T>>;
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

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

function formatGermanShortDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.`;
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(value: Date) {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * MILLISECONDS_PER_DAY);
}

function getIsoWeekStart(value: Date) {
  const dayIndex = (value.getUTCDay() + 6) % 7;

  return addDays(value, -dayIndex);
}

function getIsoWeekParts(value: Date) {
  const weekStart = getIsoWeekStart(value);
  const weekThursday = addDays(weekStart, 3);
  const weekYear = weekThursday.getUTCFullYear();
  const firstWeekStart = getIsoWeekStart(new Date(Date.UTC(weekYear, 0, 4)));
  const weekNumber =
    Math.floor((weekStart.getTime() - firstWeekStart.getTime()) / (7 * MILLISECONDS_PER_DAY)) +
    1;

  return { weekNumber, weekStart, weekYear };
}

function weekMetadata(workDate: string) {
  const parsedDate = parseIsoDate(workDate);

  if (!parsedDate) {
    return {
      dateRangeLabel: formatGermanDate(workDate),
      weekKey: workDate,
      weekLabel: "KW",
    };
  }

  const { weekNumber, weekStart, weekYear } = getIsoWeekParts(parsedDate);
  const weekEnd = addDays(weekStart, 6);
  const weekStartIso = formatIsoDate(weekStart);
  const weekEndIso = formatIsoDate(weekEnd);

  return {
    dateRangeLabel: `${formatGermanShortDate(weekStartIso)}-${formatGermanDate(weekEndIso)}`,
    weekKey: `${weekYear}-W${String(weekNumber).padStart(2, "0")}`,
    weekLabel: `KW ${weekNumber}`,
  };
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

export function groupTimeEntryDaysByWeek<
  T extends { workDate: string; durationMinutes: number },
>(days: Array<TimeEntryListGroup<T>>): Array<TimeEntryListWeekGroup<T>> {
  const weeks = new Map<string, TimeEntryListWeekGroup<T>>();

  for (const day of days) {
    const metadata = weekMetadata(day.workDate);
    const week = weeks.get(metadata.weekKey) ?? {
      ...metadata,
      totalDurationMinutes: 0,
      days: [],
    };

    week.totalDurationMinutes += day.totalDurationMinutes;
    week.days.push(day);
    weeks.set(metadata.weekKey, week);
  }

  return [...weeks.values()];
}

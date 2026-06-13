export type ExportMonth = {
  year: number;
  month: number;
};

export type ExportProject = {
  id: string;
  customerName: string;
  projectName: string;
  projectCode: string | null;
};

export type ExportTimeEntry = {
  id: string;
  workDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  durationDecimalHours: number;
  description: string;
  employeeName: string;
  employeeEmail: string;
  customerName: string;
  projectCode: string | null;
  projectName: string;
  taskName: string;
  billable: boolean;
};

export type ProjectMonthExportData = {
  project: ExportProject;
  month: ExportMonth;
  startDate: string;
  endDate: string;
  totalMinutes: number;
  totalDecimalHours: number;
  entries: ExportTimeEntry[];
};

export type ExportValidationResult =
  | {
      ok: true;
      value: ExportMonth;
    }
  | {
      ok: false;
      reason: "invalid-month";
    };

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseExportMonth(value: string): ExportValidationResult {
  const match = /^(\d{4})-(\d{2})$/.exec(value);

  if (!match) {
    return { ok: false, reason: "invalid-month" };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (year < 2000 || year > 2100 || month < 1 || month > 12) {
    return { ok: false, reason: "invalid-month" };
  }

  return {
    ok: true,
    value: {
      year,
      month,
    },
  };
}

export function getMonthDateRange(month: ExportMonth) {
  const startDate = `${month.year}-${pad(month.month)}-01`;
  const end = new Date(Date.UTC(month.year, month.month, 0));
  const endDate = `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(
    end.getUTCDate(),
  )}`;

  return {
    startDate,
    endDate,
  };
}

export function minutesToDecimalHours(minutes: number) {
  return Math.round((minutes / 60) * 100) / 100;
}

export function sortExportEntries(entries: ExportTimeEntry[]) {
  return [...entries].sort((a, b) => {
    const dateCompare = a.workDate.localeCompare(b.workDate);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    const timeCompare = a.startTime.localeCompare(b.startTime);

    if (timeCompare !== 0) {
      return timeCompare;
    }

    return a.employeeName.localeCompare(b.employeeName, "de");
  });
}

export function buildProjectMonthExportData({
  project,
  month,
  entries,
}: {
  project: ExportProject;
  month: ExportMonth;
  entries: ExportTimeEntry[];
}): ProjectMonthExportData {
  const range = getMonthDateRange(month);
  const sortedEntries = sortExportEntries(entries);
  const totalMinutes = sortedEntries.reduce(
    (total, entry) => total + entry.durationMinutes,
    0,
  );

  return {
    project,
    month,
    ...range,
    entries: sortedEntries,
    totalMinutes,
    totalDecimalHours: minutesToDecimalHours(totalMinutes),
  };
}

export function formatExportDecimalHours(value: number) {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatExportDate(value: string) {
  const [year, month, day] = value.split("-");

  return year && month && day ? `${day}.${month}.${year.slice(2)}` : value;
}

export type TimeRange = {
  id?: string;
  workDate: string;
  startTime: string;
  endTime: string;
};

export type OverlapCheckResult =
  | {
      status: "clear";
      overlappingEntries: [];
    }
  | {
      status: "warning";
      overlappingEntries: TimeRange[];
    }
  | {
      status: "confirmed";
      overlappingEntries: TimeRange[];
    };

function parseClockMinutes(time: string) {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time);

  if (!match) {
    throw new Error("Ungueltige Uhrzeit.");
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function overlaps(a: TimeRange, b: TimeRange) {
  if (a.workDate !== b.workDate) {
    return false;
  }

  const aStart = parseClockMinutes(a.startTime);
  const aEnd = parseClockMinutes(a.endTime);
  const bStart = parseClockMinutes(b.startTime);
  const bEnd = parseClockMinutes(b.endTime);

  return aStart < bEnd && bStart < aEnd;
}

export function checkTimeEntryOverlap({
  candidate,
  existingEntries,
  ignoreEntryId,
  confirmed,
}: {
  candidate: TimeRange;
  existingEntries: TimeRange[];
  ignoreEntryId?: string;
  confirmed: boolean;
}): OverlapCheckResult {
  const overlappingEntries = existingEntries.filter((entry) => {
    if (ignoreEntryId && entry.id === ignoreEntryId) {
      return false;
    }

    return overlaps(candidate, entry);
  });

  if (overlappingEntries.length === 0) {
    return {
      status: "clear",
      overlappingEntries: [],
    };
  }

  return {
    status: confirmed ? "confirmed" : "warning",
    overlappingEntries,
  };
}

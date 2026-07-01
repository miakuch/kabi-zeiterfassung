export type ResumableTimeEntry = {
  workDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

type ResumeSegment = {
  workDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

function trimTime(value: string) {
  return value.slice(0, 5);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = trimTime(value).split(":").map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function mergeResumedTimeEntry({
  existingEntry,
  segment,
}: {
  existingEntry: ResumableTimeEntry;
  segment: ResumeSegment;
}): ResumableTimeEntry {
  if (existingEntry.workDate !== segment.workDate) {
    return {
      ...existingEntry,
      durationMinutes:
        existingEntry.durationMinutes + segment.durationMinutes,
    };
  }

  return {
    workDate: existingEntry.workDate,
    startTime: minutesToTime(
      Math.min(timeToMinutes(existingEntry.startTime), timeToMinutes(segment.startTime)),
    ),
    endTime: minutesToTime(
      Math.max(timeToMinutes(existingEntry.endTime), timeToMinutes(segment.endTime)),
    ),
    durationMinutes: existingEntry.durationMinutes + segment.durationMinutes,
  };
}

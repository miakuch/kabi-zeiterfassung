import {
  calculateTimeEntryFromStartEnd,
  type TimeCalculationError,
} from "@/features/time/domain/time-calculation";

export type EditableTimeEntrySegment = {
  startTime: string;
  endTime: string;
};

export type ResolvedTimeEntrySegment = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

export type TimeEntrySegmentFieldError =
  | "required"
  | "overlap"
  | TimeCalculationError;

export type TimeEntrySegmentErrors = Record<
  number,
  {
    startTime?: TimeEntrySegmentFieldError;
    endTime?: TimeEntrySegmentFieldError;
  }
>;

export type ResolvedTimeEntrySegments = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  segments: ResolvedTimeEntrySegment[];
};

export type TimeEntrySegmentsValidationResult =
  | {
      ok: true;
      value: ResolvedTimeEntrySegments;
    }
  | {
      ok: false;
      reason: "no-segments" | "invalid-segments" | "overlapping-segments";
      segmentErrors: TimeEntrySegmentErrors;
    };

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);

  return hours * 60 + minutes;
}

export function validateTimeEntrySegments(
  input: EditableTimeEntrySegment[],
): TimeEntrySegmentsValidationResult {
  if (input.length === 0) {
    return {
      ok: false,
      reason: "no-segments",
      segmentErrors: {},
    };
  }

  const segmentErrors: TimeEntrySegmentErrors = {};
  const resolvedSegments: Array<ResolvedTimeEntrySegment & { sourceIndex: number }> = [];

  input.forEach((segment, index) => {
    const startTime = segment.startTime.trim();
    const endTime = segment.endTime.trim();

    if (!startTime || !endTime) {
      segmentErrors[index] = {
        ...(!startTime ? { startTime: "required" as const } : {}),
        ...(!endTime ? { endTime: "required" as const } : {}),
      };
      return;
    }

    const calculated = calculateTimeEntryFromStartEnd({ startTime, endTime });

    if (!calculated.ok) {
      segmentErrors[index] = {
        startTime: calculated.errors[0],
        endTime: calculated.errors[0],
      };
      return;
    }

    resolvedSegments.push({
      sourceIndex: index,
      startTime: calculated.value.startTime,
      endTime: calculated.value.endTime,
      durationMinutes: calculated.value.durationMinutes,
    });
  });

  if (Object.keys(segmentErrors).length > 0) {
    return {
      ok: false,
      reason: "invalid-segments",
      segmentErrors,
    };
  }

  const sortedSegments = resolvedSegments.toSorted(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  );
  let latestEndMinutes = -1;
  let latestEndSourceIndex = -1;

  for (const segment of sortedSegments) {
    const startMinutes = timeToMinutes(segment.startTime);
    const endMinutes = timeToMinutes(segment.endTime);

    if (startMinutes < latestEndMinutes) {
      segmentErrors[segment.sourceIndex] = {
        ...segmentErrors[segment.sourceIndex],
        startTime: "overlap",
      };
      segmentErrors[latestEndSourceIndex] = {
        ...segmentErrors[latestEndSourceIndex],
        endTime: "overlap",
      };
    }

    if (endMinutes > latestEndMinutes) {
      latestEndMinutes = endMinutes;
      latestEndSourceIndex = segment.sourceIndex;
    }
  }

  if (Object.keys(segmentErrors).length > 0) {
    return {
      ok: false,
      reason: "overlapping-segments",
      segmentErrors,
    };
  }

  const segments = sortedSegments.map((segment) => ({
    startTime: segment.startTime,
    endTime: segment.endTime,
    durationMinutes: segment.durationMinutes,
  }));

  return {
    ok: true,
    value: {
      startTime: segments[0]?.startTime ?? "",
      endTime: segments.at(-1)?.endTime ?? "",
      durationMinutes: segments.reduce(
        (total, segment) => total + segment.durationMinutes,
        0,
      ),
      segments,
    },
  };
}

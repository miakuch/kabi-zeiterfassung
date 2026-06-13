const BERLIN_TIME_ZONE = "Europe/Berlin";

function partsInBerlin(value: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BERLIN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  return new Map(parts.map((part) => [part.type, part.value]));
}

export function getBerlinDateTimeInputValues(utcValue: string) {
  const value = new Date(utcValue);

  if (Number.isNaN(value.getTime())) {
    return {
      workDate: "",
      time: "",
    };
  }

  const parts = partsInBerlin(value);

  return {
    workDate: `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`,
    time: `${parts.get("hour")}:${parts.get("minute")}`,
  };
}

export function getElapsedMinutes(startedAtUtc: string, stoppedAtUtc: string) {
  const startedAt = new Date(startedAtUtc);
  const stoppedAt = new Date(stoppedAtUtc);

  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(stoppedAt.getTime())) {
    return 0;
  }

  return Math.max(0, Math.ceil((stoppedAt.getTime() - startedAt.getTime()) / 60000));
}

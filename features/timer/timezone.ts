const BERLIN_TIME_ZONE = "Europe/Berlin";
const MINUTES_PER_DAY = 24 * 60;

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

function roundUpToNextMinute(value: Date) {
  if (value.getSeconds() === 0 && value.getMilliseconds() === 0) {
    return value;
  }

  const rounded = new Date(value);

  rounded.setSeconds(0, 0);
  rounded.setMinutes(rounded.getMinutes() + 1);

  return rounded;
}

function parseTimeInputToMinutes(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatTimeInput(minutes: number) {
  const normalizedMinutes = minutes % MINUTES_PER_DAY;
  const hours = Math.floor(normalizedMinutes / 60);
  const remainingMinutes = normalizedMinutes % 60;

  return [hours, remainingMinutes]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function getBerlinDateTimeInputValues(
  utcValue: string,
  options: { roundUpMinute?: boolean } = {},
) {
  const rawValue = new Date(utcValue);

  if (Number.isNaN(rawValue.getTime())) {
    return {
      workDate: "",
      time: "",
    };
  }

  const value = options.roundUpMinute ? roundUpToNextMinute(rawValue) : rawValue;
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

export function addElapsedMinutesToTimeInput(
  startTime: string,
  elapsedMinutes: number,
) {
  const startMinutes = parseTimeInputToMinutes(startTime);

  if (startMinutes === null || !Number.isInteger(elapsedMinutes) || elapsedMinutes < 0) {
    return "";
  }

  return formatTimeInput(startMinutes + elapsedMinutes);
}

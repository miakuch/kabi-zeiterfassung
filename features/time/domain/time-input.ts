export function completeTimeWithZeroMinutes(
  value: string,
  incompleteHour: string,
) {
  if (value) {
    return value;
  }

  if (!/^\d{1,2}$/.test(incompleteHour)) {
    return value;
  }

  const hour = Number(incompleteHour);

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return value;
  }

  return `${String(hour).padStart(2, "0")}:00`;
}

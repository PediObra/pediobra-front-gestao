export function dateInputToStartIso(value: string) {
  const date = parseDateInput(value);
  return date?.toISOString();
}

export function dateInputToNextDayIso(value: string) {
  const date = parseDateInput(value);
  if (!date) return undefined;
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

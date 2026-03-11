import { addDays, format } from "date-fns";

const normalizeWeekNumber = (week: number): number => Math.max(1, Math.floor(week));

function getFirstMondayOfWeekOne(year: number): Date {
  let firstMonday = new Date(year - 1, 11, 28);
  while (firstMonday.getDay() !== 1) {
    firstMonday = addDays(firstMonday, 1);
  }
  return firstMonday;
}

function getWeekDisplayBounds(week: number, year: number) {
  const normalizedWeek = normalizeWeekNumber(week);
  if (normalizedWeek === 1) {
    return {
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 0, 4),
    };
  }

  const startDate = addDays(getFirstMondayOfWeekOne(year), (normalizedWeek - 1) * 7);
  return {
    startDate,
    endDate: addDays(startDate, 6),
  };
}

export function getWeekStartDate(week: number, year: number = new Date().getFullYear()): Date {
  return getWeekDisplayBounds(week, year).startDate;
}

export function getWeekEndDate(week: number, year: number = new Date().getFullYear()): Date {
  return getWeekDisplayBounds(week, year).endDate;
}

export function getWeekMonth(week: number, year: number = new Date().getFullYear()): string {
  return format(getWeekStartDate(week, year), "MMMM");
}

export function getWeekDateRange(week: number, year: number = new Date().getFullYear()): string {
  const bounds = getWeekDisplayBounds(week, year);
  const startMonth = format(bounds.startDate, "MMMM");
  const startDay = format(bounds.startDate, "d");
  const endMonth = format(bounds.endDate, "MMMM");
  const endDay = format(bounds.endDate, "d");

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }

  return `${startMonth} ${startDay}-${endMonth} ${endDay}`;
}

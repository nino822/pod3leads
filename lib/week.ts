import { addDays, format } from "date-fns";

const normalizeWeekNumber = (week: number): number => Math.max(1, Math.floor(week));

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function getWeekDisplayBounds(week: number, year: number) {
  const normalizedWeek = normalizeWeekNumber(week);
  if (normalizedWeek === 1) {
    return {
      startDate: new Date(year - 1, 11, 29),
      endDate: new Date(year, 0, 4),
    };
  }

  const weekTwoStart = new Date(year, 0, 5);
  const startDate = addDays(weekTwoStart, (normalizedWeek - 2) * 7);
  return {
    startDate,
    endDate: addDays(startDate, 6),
  };
}

export function getWeekNumberForDate(date: Date): number {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let weekYear = normalized.getFullYear();
  if (normalized.getMonth() === 11 && normalized.getDate() >= 29) {
    weekYear += 1;
  }

  const weekOneStart = new Date(weekYear - 1, 11, 29);
  const weekOneEnd = new Date(weekYear, 0, 4);

  if (normalized >= weekOneStart && normalized <= weekOneEnd) {
    return 1;
  }

  const weekTwoStart = new Date(weekYear, 0, 5);
  if (normalized < weekTwoStart) {
    return 1;
  }

  const diffDays = Math.floor((normalized.getTime() - weekTwoStart.getTime()) / MS_PER_DAY);
  return Math.floor(diffDays / 7) + 2;
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

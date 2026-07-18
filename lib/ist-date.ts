/** App calendar timezone — constituency ops run on IST. */
export const APP_TIMEZONE = 'Asia/Kolkata';

export type CalendarYmd = {
  year: number;
  month: number; // 1–12
  day: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatYmd({ year, month, day }: CalendarYmd): string {
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

/** Calendar year/month/day in `timeZone` for the given instant. */
export function getCalendarYmd(
  date: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): CalendarYmd {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
  };
}

/** Today's date as `yyyy-MM-dd` in Asia/Kolkata. */
export function getTodayDateStringIST(date: Date = new Date()): string {
  return formatYmd(getCalendarYmd(date));
}

/**
 * UTC instant of 00:00:00 Asia/Kolkata for the IST calendar day of `date`.
 * IST has no DST, so `+05:30` is always correct.
 */
export function startOfDayIST(date: Date = new Date()): Date {
  return new Date(`${getTodayDateStringIST(date)}T00:00:00+05:30`);
}

/**
 * Monday 00:00 Asia/Kolkata of the week containing `date`
 * (week starts Monday, matching previous dashboard SIR logic).
 */
export function startOfWeekIST(date: Date = new Date()): Date {
  const ymd = getCalendarYmd(date);
  const weekdayShort = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
  }).format(date);
  const weekdayByShort: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayByShort[weekdayShort] ?? 0;
  const daysSinceMonday = (weekday + 6) % 7;
  const mondayUtcMs =
    Date.UTC(ymd.year, ymd.month - 1, ymd.day) -
    daysSinceMonday * 86_400_000;
  const monday = new Date(mondayUtcMs);
  const mondayYmd: CalendarYmd = {
    year: monday.getUTCFullYear(),
    month: monday.getUTCMonth() + 1,
    day: monday.getUTCDate(),
  };
  return new Date(`${formatYmd(mondayYmd)}T00:00:00+05:30`);
}

/** Difference in calendar days between two Y-M-D values (a − b). */
export function differenceInCalendarDaysYmd(
  a: CalendarYmd,
  b: CalendarYmd,
): number {
  const aDays = Date.UTC(a.year, a.month - 1, a.day) / 86_400_000;
  const bDays = Date.UTC(b.year, b.month - 1, b.day) / 86_400_000;
  return Math.round(aDays - bDays);
}

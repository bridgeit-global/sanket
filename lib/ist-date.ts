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

/**
 * Parse a DB/API instant for display. Naive `YYYY-MM-DDTHH:mm:ss` values from
 * `timestamp without time zone` columns are treated as UTC (Supabase default).
 */
export function parseInstant(value: string | Date | number): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  const trimmed = value.trim();
  if (
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(trimmed)
  ) {
    return new Date(`${trimmed.replace(' ', 'T')}Z`);
  }
  return new Date(trimmed);
}

/** Days in month for a Gregorian calendar year/month (month 1–12). */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isValidCalendarYmd({ year, month, day }: CalendarYmd): boolean {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }
  if (year < 1000 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  return true;
}

/** Format `yyyy-MM-dd` as `dd-mm-yyyy` for typed date entry. */
export function formatYmdAsDmy(ymd: string): string {
  const match = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return ymd;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Parse a user-entered date into `yyyy-MM-dd`.
 * Accepts `yyyy-MM-dd`, `dd-mm-yyyy`, and `dd/mm/yyyy` (1–2 digit day/month).
 */
export function parseFlexibleDateToYmd(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    const parts: CalendarYmd = {
      year: Number(ymdMatch[1]),
      month: Number(ymdMatch[2]),
      day: Number(ymdMatch[3]),
    };
    return isValidCalendarYmd(parts) ? formatYmd(parts) : null;
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const parts: CalendarYmd = {
      year: Number(dmyMatch[3]),
      month: Number(dmyMatch[2]),
      day: Number(dmyMatch[1]),
    };
    return isValidCalendarYmd(parts) ? formatYmd(parts) : null;
  }

  return null;
}

/** Display date as `dd-mm-yyyy` in Asia/Kolkata. */
export function formatDisplayDateIST(value: string | Date | number): string {
  return parseInstant(value)
    .toLocaleDateString('en-GB', {
      timeZone: APP_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    .replace(/\//g, '-');
}

/** Display date+time as `dd-mm-yyyy hh:mm am/pm` in Asia/Kolkata. */
export function formatDisplayDateTimeIST(value: string | Date | number): string {
  const date = parseInstant(value);
  const day = formatDisplayDateIST(date);
  const time = date.toLocaleTimeString('en-IN', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${day} ${time}`;
}

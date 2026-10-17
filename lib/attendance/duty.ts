import { APP_TIMEZONE } from '@/lib/ist-date';
import type { AttendanceStatus } from './types';

/** Duty start. A punch up to the end of this window is on time. */
export const DUTY_ON_TIME_START_LABEL = '10:00 AM';
/** Last minute that still counts as on time (11:00 AM IST inclusive). */
export const DUTY_ON_TIME_END_LABEL = '11:00 AM';
export const DUTY_WINDOW_LABEL = `${DUTY_ON_TIME_START_LABEL} – ${DUTY_ON_TIME_END_LABEL}`;

const DUTY_ON_TIME_END_MINUTES = 11 * 60;

export function istMinutesOfDay(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const rawHour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  const hour = rawHour === 24 ? 0 : rawHour;
  return hour * 60 + minute;
}

/** On time through 11:00 AM IST. After that the punch is late. */
export function punctualityStatus(at: Date = new Date()): 'on_time' | 'late' {
  return istMinutesOfDay(at) <= DUTY_ON_TIME_END_MINUTES ? 'on_time' : 'late';
}

export function effectiveAttendanceStatus(log: {
  status: AttendanceStatus | string;
  clock_in?: string | null;
}): AttendanceStatus | string {
  if (log.status === 'pending_review' || log.status === 'flagged_location' || log.status === 'early_leave') {
    return log.status;
  }
  if (!log.clock_in) return log.status;
  return punctualityStatus(new Date(log.clock_in));
}

export function attendanceRoleLabel(role?: string | null) {
  const value = role?.trim();
  if (!value) return 'Employee';
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

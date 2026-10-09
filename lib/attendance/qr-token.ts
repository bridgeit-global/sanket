const ATTENDANCE_QR_TOKEN_PATTERN = /^[A-Z0-9]{10}$/;

export function normalizeAttendanceQrToken(value: string) {
  return value.trim().toUpperCase();
}

export function isAttendanceQrToken(value: string) {
  return ATTENDANCE_QR_TOKEN_PATTERN.test(value);
}

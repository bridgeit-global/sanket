export const GOV_FOLLOW_UP_MODULE_KEY = 'gov-follow-up';

export const GOV_FOLLOW_UP_OPEN_STATUSES = [
  'pending',
  'under_process',
  'approval_pending',
] as const;

export const GOV_FOLLOW_UP_CLOSED_STATUSES = [
  'sanctioned',
  'rejected',
  'closed',
] as const;

export const GOV_FOLLOW_UP_STATUSES = [
  ...GOV_FOLLOW_UP_OPEN_STATUSES,
  ...GOV_FOLLOW_UP_CLOSED_STATUSES,
] as const;

export const GOV_FOLLOW_UP_PRIORITIES = ['urgent', 'high', 'normal'] as const;

export const GOV_FOLLOW_UP_MODES = [
  'call',
  'visit',
  'whatsapp',
  'email',
  'letter',
  'meeting',
] as const;

export const GOV_FOLLOW_UP_LOG_KINDS = [
  'submitted',
  'inward',
  'officer_identified',
  'follow_up',
  'file_movement',
  'query',
  'compliance',
  'approval',
  'order',
  'closed',
  'note',
] as const;

export const GOV_FOLLOW_UP_TABS = [
  'today',
  'upcoming',
  'overdue',
  'by-department',
  'by-officer',
  'by-staff',
  'file-movement',
  'visits',
  'closed',
] as const;

export type GovFollowUpTab = (typeof GOV_FOLLOW_UP_TABS)[number];

export const GOV_FOLLOW_UP_PRIMARY_TABS = [
  'today',
  'upcoming',
  'overdue',
  'visits',
  'closed',
] as const satisfies readonly GovFollowUpTab[];

export const GOV_FOLLOW_UP_BROWSE_TABS = [
  'by-department',
  'by-officer',
  'by-staff',
  'file-movement',
] as const satisfies readonly GovFollowUpTab[];

export const GOV_FOLLOW_UP_CHIPS = [
  'due-today',
  'overdue',
  'stale-7',
  'mantralaya',
  'bmc',
  'sra',
  'minister',
  'dept-reply',
  'sanctions',
  'recently-closed',
] as const;

export type GovFollowUpChip = (typeof GOV_FOLLOW_UP_CHIPS)[number];

export const GOV_FOLLOW_UP_KPI_CHIPS = [
  'due-today',
  'overdue',
  'stale-7',
] as const satisfies readonly GovFollowUpChip[];

export const GOV_FOLLOW_UP_QUICK_CHIPS = [
  'mantralaya',
  'bmc',
  'sra',
  'minister',
  'dept-reply',
  'sanctions',
  'recently-closed',
] as const satisfies readonly GovFollowUpChip[];

export function isOpenGovFollowUpStatus(status: string): boolean {
  return (GOV_FOLLOW_UP_OPEN_STATUSES as readonly string[]).includes(status);
}

export function isGovFollowUpTab(value: string | null): value is GovFollowUpTab {
  return (
    value != null && (GOV_FOLLOW_UP_TABS as readonly string[]).includes(value)
  );
}

export function isGovFollowUpChip(value: string | null): value is GovFollowUpChip {
  return (
    value != null && (GOV_FOLLOW_UP_CHIPS as readonly string[]).includes(value)
  );
}

/** Default Office / campus codes when a location has no department_id yet. */
export const GOV_FOLLOW_UP_DEPARTMENT_LOCATION_CODES: Record<
  string,
  readonly string[]
> = {
  bmc: ['bmc-hq', 'bmc-ward'],
  sra: ['sra'],
  mhada: ['mhada'],
  collector: ['collectorate'],
  police: ['police-hq'],
  pwd: ['pwd'],
  home: ['mantralaya'],
  minority: ['mantralaya'],
  udd: ['mantralaya'],
  'social-justice': ['mantralaya'],
  planning: ['mantralaya'],
  mantralaya: ['mantralaya'],
  other: ['other'],
};

export function locationsForDepartment<
  T extends { id: string; code: string; departmentId?: string | null },
>(
  locations: T[],
  departmentId: string | null | undefined,
  options?: {
    departmentCode?: string | null;
    includeLocationId?: string | null;
  },
): T[] {
  if (!departmentId) return [];
  const dedicated = locations.filter(
    (location) => location.departmentId === departmentId,
  );
  const codes = options?.departmentCode
    ? GOV_FOLLOW_UP_DEPARTMENT_LOCATION_CODES[options.departmentCode]
    : undefined;
  const byCode = codes
    ? locations.filter((location) => codes.includes(location.code))
    : [];
  const shared = locations.filter((location) => !location.departmentId);
  const filtered =
    dedicated.length > 0 ? dedicated : byCode.length > 0 ? byCode : shared;
  const includeLocationId = options?.includeLocationId;
  if (
    includeLocationId &&
    !filtered.some((location) => location.id === includeLocationId)
  ) {
    const extra = locations.find((location) => location.id === includeLocationId);
    if (extra) return [...filtered, extra];
  }
  return filtered;
}

export function addDaysYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number);
  if (!year || !month || !day) return ymd;
  const utc = Date.UTC(year, month - 1, day) + days * 86_400_000;
  const next = new Date(utc);
  const y = String(next.getUTCFullYear()).padStart(4, '0');
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

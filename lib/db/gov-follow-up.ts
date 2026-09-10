import 'server-only';

import { supabase } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { ChatSDKError } from '@/lib/errors';
import { getTodayDateStringIST } from '@/lib/ist-date';
import { TABLES } from '@/lib/db/schema';
import {
  mapGovFollowUpDepartmentRow,
  mapGovFollowUpLocationRow,
  mapGovFollowUpLogRow,
  mapGovFollowUpMatterRow,
} from '@/lib/db/mappers';
import {
  addDaysYmd,
  GOV_FOLLOW_UP_CLOSED_STATUSES,
  GOV_FOLLOW_UP_MODULE_KEY,
  GOV_FOLLOW_UP_OPEN_STATUSES,
  isOpenGovFollowUpStatus,
  locationsForDepartment,
  type GovFollowUpChip,
  type GovFollowUpTab,
} from '@/lib/gov-follow-up/constants';
import type {
  GovFollowUpDepartment,
  GovFollowUpLocation,
  GovFollowUpLog,
  GovFollowUpLogKind,
  GovFollowUpMatter,
  GovFollowUpMatterDetail,
  GovFollowUpMatterListItem,
  GovFollowUpMode,
} from '@/lib/db/schema';
import type {
  GovFollowUpCatalogs,
  GovFollowUpGroupRow,
  GovFollowUpLogInput,
  GovFollowUpMatterInput,
  GovFollowUpSummary,
} from '@/lib/gov-follow-up/types';
import { getLetterById, getRegisterEntryById } from '@/lib/db/queries-crud';
import {
  defaultGovFollowUpLogBody,
  suggestedStatusForLogKind,
} from '@/lib/gov-follow-up/workflow';

export type {
  GovFollowUpCatalogs,
  GovFollowUpGroupRow,
  GovFollowUpLogInput,
  GovFollowUpMatterInput,
  GovFollowUpSummary,
};

const OPEN = [...GOV_FOLLOW_UP_OPEN_STATUSES];
const CLOSED = [...GOV_FOLLOW_UP_CLOSED_STATUSES];

export type GovFollowUpListQuery = {
  tab: GovFollowUpTab;
  chip?: GovFollowUpChip | '';
  search?: string;
  departmentId?: string;
  locationId?: string;
  officer?: string;
  staffUserId?: string;
  status?: string;
  visitDate?: string;
  page?: number;
  limit?: number;
};

export type GovFollowUpListResult = {
  matters: GovFollowUpMatterListItem[];
  total: number;
  page: number;
  limit: number;
};

export type GovFollowUpVisitPlanner = {
  locationId: string;
  locationName: string;
  date: string;
  total: number;
  byDepartment: Array<{ departmentId: string; name: string; count: number }>;
  matters: GovFollowUpMatterListItem[];
};

export type GovFollowUpPrefill = {
  existingMatterId: string | null;
  subject: string;
  dateSubmitted: string;
  inwardRefNo: string;
  letterId: string | null;
  registerEntryId: string | null;
  letterReferenceNo: string | null;
  registerRefNo: string | null;
};

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function nextFollowUpNo(): Promise<string> {
  const { data, error } = await supabase.rpc('next_gov_follow_up_no');
  throwOnSupabaseError(error, 'Failed to allocate follow-up number');
  if (typeof data !== 'string' || !data) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to allocate follow-up number',
    );
  }
  return data;
}

export async function listGovFollowUpDepartments(): Promise<
  GovFollowUpDepartment[]
> {
  const { data, error } = await supabase
    .from(TABLES.govFollowUpDepartment)
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  throwOnSupabaseError(error, 'Failed to list follow-up departments');
  return (data ?? []).map(mapGovFollowUpDepartmentRow);
}

export async function listGovFollowUpLocations(
  departmentId?: string,
): Promise<GovFollowUpLocation[]> {
  const { data, error } = await supabase
    .from(TABLES.govFollowUpLocation)
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  throwOnSupabaseError(error, 'Failed to list follow-up locations');
  const locations = (data ?? []).map(mapGovFollowUpLocationRow);
  if (!departmentId) return locations;

  const { data: department, error: departmentError } = await supabase
    .from(TABLES.govFollowUpDepartment)
    .select('code')
    .eq('id', departmentId)
    .maybeSingle();
  throwOnSupabaseError(departmentError, 'Failed to load follow-up department');

  return locationsForDepartment(locations, departmentId, {
    departmentCode: department ? String(department.code) : null,
  });
}

async function listUserNameById(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from(TABLES.user)
    .select('id, user_id');
  throwOnSupabaseError(error, 'Failed to list users');
  return new Map(
    (data ?? []).map((row) => [String(row.id), String(row.user_id ?? '')]),
  );
}

async function listStaffUsers(): Promise<Array<{ id: string; userId: string }>> {
  const [usersResult, rolePermResult, userPermResult] = await Promise.all([
    supabase
      .from(TABLES.user)
      .select('id, user_id, role_id')
      .order('user_id', { ascending: true }),
    supabase
      .from(TABLES.roleModulePermissions)
      .select('role_id')
      .eq('module_key', GOV_FOLLOW_UP_MODULE_KEY)
      .eq('has_access', true),
    supabase
      .from(TABLES.userModulePermissions)
      .select('userId')
      .eq('module_key', GOV_FOLLOW_UP_MODULE_KEY)
      .eq('has_access', true),
  ]);
  throwOnSupabaseError(usersResult.error, 'Failed to list staff users');
  throwOnSupabaseError(
    rolePermResult.error,
    'Failed to list follow-up role access',
  );
  throwOnSupabaseError(
    userPermResult.error,
    'Failed to list follow-up user access',
  );

  const roleIdsWithAccess = new Set(
    (rolePermResult.data ?? []).map((row) => String(row.role_id)),
  );
  const userIdsWithAccess = new Set(
    (userPermResult.data ?? []).map((row) => String(row.userId)),
  );

  return (usersResult.data ?? [])
    .filter(
      (row) =>
        userIdsWithAccess.has(String(row.id)) ||
        (row.role_id != null &&
          roleIdsWithAccess.has(String(row.role_id))),
    )
    .map((row) => ({
      id: String(row.id),
      userId: String(row.user_id ?? ''),
    }));
}

async function catalogMaps() {
  const [departments, locations, userById] = await Promise.all([
    listGovFollowUpDepartments(),
    listGovFollowUpLocations(),
    listUserNameById(),
  ]);
  return {
    departments,
    locations,
    departmentById: new Map(departments.map((d) => [d.id, d])),
    locationById: new Map(locations.map((l) => [l.id, l])),
    userById,
  };
}

async function letterRefByIds(
  ids: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase
    .from(TABLES.letter)
    .select('id, reference_no')
    .in('id', unique);
  throwOnSupabaseError(error, 'Failed to load letter references');
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(String(row.id), String(row.reference_no ?? ''));
  }
  return map;
}

async function registerRefByIds(
  ids: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase
    .from(TABLES.registerEntry)
    .select('id, ref_no')
    .in('id', unique);
  throwOnSupabaseError(error, 'Failed to load register references');
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(String(row.id), String(row.ref_no ?? ''));
  }
  return map;
}

async function hydrateMatters(
  rows: GovFollowUpMatter[],
): Promise<GovFollowUpMatterListItem[]> {
  const catalogs = await catalogMaps();
  const [letterRefs, registerRefs] = await Promise.all([
    letterRefByIds(rows.map((r) => r.letterId ?? '')),
    registerRefByIds(rows.map((r) => r.registerEntryId ?? '')),
  ]);
  return rows.map((matter) => {
    const department = catalogs.departmentById.get(matter.departmentId);
    const location = catalogs.locationById.get(matter.locationId);
    return {
      ...matter,
      departmentName: department?.name ?? '',
      departmentCode: department?.code ?? '',
      locationName: location?.name ?? '',
      locationCode: location?.code ?? '',
      staffUserName: matter.staffUserId
        ? (catalogs.userById.get(matter.staffUserId) ?? null)
        : null,
      letterReferenceNo: matter.letterId
        ? (letterRefs.get(matter.letterId) ?? null)
        : null,
      registerRefNo: matter.registerEntryId
        ? (registerRefs.get(matter.registerEntryId) ?? null)
        : null,
    };
  });
}

function applyChipAndTabFilters(
  query: any,
  {
    tab,
    chip,
    today,
    staleCutoff,
    recentlyClosedCutoff,
    locationByCode,
    departmentByCode,
  }: {
    tab: GovFollowUpTab;
    chip: GovFollowUpChip | '';
    today: string;
    staleCutoff: string;
    recentlyClosedCutoff: string;
    locationByCode: Map<string, GovFollowUpLocation>;
    departmentByCode: Map<string, GovFollowUpDepartment>;
  },
) {
  let next = query;

  const mantralayaLocation = locationByCode.get('mantralaya');
  const bmcDept = departmentByCode.get('bmc');
  const sraDept = departmentByCode.get('sra');

  if (chip === 'due-today' || (tab === 'today' && !chip)) {
    next = next.in('status', OPEN).eq('next_follow_up_on', today);
  } else if (chip === 'overdue' || (tab === 'overdue' && !chip)) {
    next = next.in('status', OPEN).lt('next_follow_up_on', today);
  } else if (tab === 'upcoming' && !chip) {
    next = next.in('status', OPEN).gt('next_follow_up_on', today);
  } else if (chip === 'recently-closed') {
    next = next
      .in('status', CLOSED)
      .gte('updated_at', `${recentlyClosedCutoff}T00:00:00`);
  } else if (tab === 'closed') {
    next = next.in('status', CLOSED);
  } else if (tab === 'file-movement') {
    next = next.in('status', OPEN).eq('last_log_kind', 'file_movement');
  } else if (tab === 'visits') {
    next = next.in('status', OPEN).lte('next_follow_up_on', today);
  } else if (
    tab === 'by-department' ||
    tab === 'by-officer' ||
    tab === 'by-staff'
  ) {
    next = next.in('status', OPEN);
  }

  if (chip === 'stale-7') {
    next = next.in('status', OPEN).or(
      `last_follow_up_on.is.null,last_follow_up_on.lte.${staleCutoff}`,
    );
  }
  if (chip === 'mantralaya' && mantralayaLocation) {
    next = next.in('status', OPEN).eq('location_id', mantralayaLocation.id);
  }
  if (chip === 'bmc' && bmcDept) {
    next = next.in('status', OPEN).eq('department_id', bmcDept.id);
  }
  if (chip === 'sra' && sraDept) {
    next = next.in('status', OPEN).eq('department_id', sraDept.id);
  }
  if (chip === 'minister') {
    next = next.in('status', OPEN).ilike('present_stage', '%minister%');
  }
  if (chip === 'dept-reply') {
    next = next
      .in('status', OPEN)
      .or('present_stage.ilike.%reply%,next_action.ilike.%reply%');
  }
  if (chip === 'sanctions') {
    next = next.eq('status', 'approval_pending');
  }

  return next;
}

export async function listGovFollowUpMatters(
  filters: GovFollowUpListQuery,
): Promise<GovFollowUpListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
  const today = getTodayDateStringIST();
  const staleCutoff = addDaysYmd(today, -7);
  const recentlyClosedCutoff = addDaysYmd(today, -14);
  const [departments, locations] = await Promise.all([
    listGovFollowUpDepartments(),
    listGovFollowUpLocations(),
  ]);
  const departmentByCode = new Map(departments.map((d) => [d.code, d]));
  const locationByCode = new Map(locations.map((l) => [l.code, l]));

  let query = supabase
    .from(TABLES.govFollowUpMatter)
    .select('*', { count: 'exact' });

  query = applyChipAndTabFilters(query, {
    tab: filters.tab,
    chip: filters.chip ?? '',
    today,
    staleCutoff,
    recentlyClosedCutoff,
    locationByCode,
    departmentByCode,
  });

  if (filters.departmentId) {
    query = query.eq('department_id', filters.departmentId);
  }
  if (filters.locationId) {
    query = query.eq('location_id', filters.locationId);
  }
  if (filters.officer === '(unassigned)') {
    query = query.or('officer_name.is.null,officer_name.eq.');
  } else if (filters.officer) {
    query = query.ilike('officer_name', `%${filters.officer}%`);
  }
  if (filters.staffUserId === '(unassigned)') {
    query = query.is('staff_user_id', null);
  } else if (filters.staffUserId) {
    query = query.eq('staff_user_id', filters.staffUserId);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.search?.trim()) {
    const term = filters.search.trim();
    query = query.or(
      `subject.ilike.%${term}%,follow_up_no.ilike.%${term}%,officer_name.ilike.%${term}%,office_name.ilike.%${term}%,inward_ref_no.ilike.%${term}%,present_stage.ilike.%${term}%`,
    );
  }

  const closedLike =
    filters.tab === 'closed' || filters.chip === 'recently-closed';
  if (closedLike) {
    query = query
      .order('updated_at', { ascending: false })
      .order('follow_up_no', { ascending: false });
  } else {
    query = query
      .order('next_follow_up_on', { ascending: true, nullsFirst: false })
      .order('subject', { ascending: true });
  }

  const from = (page - 1) * limit;
  const { data, error, count } = await query.range(from, from + limit - 1);
  throwOnSupabaseError(error, 'Failed to list follow-up matters');

  const matters = await hydrateMatters(
    (data ?? []).map(mapGovFollowUpMatterRow),
  );
  return { matters, total: count ?? 0, page, limit };
}

export async function getGovFollowUpSummary(): Promise<GovFollowUpSummary> {
  const today = getTodayDateStringIST();
  const staleCutoff = addDaysYmd(today, -7);
  const recentlyClosedCutoff = addDaysYmd(today, -14);
  const [departments, locations] = await Promise.all([
    listGovFollowUpDepartments(),
    listGovFollowUpLocations(),
  ]);
  const locationByCode = new Map(locations.map((l) => [l.code, l]));
  const departmentByCode = new Map(departments.map((d) => [d.code, d]));

  const { data, error } = await supabase
    .from(TABLES.govFollowUpMatter)
    .select(
      'id, status, next_follow_up_on, last_follow_up_on, date_submitted, department_id, location_id, present_stage, next_action, updated_at',
    );
  throwOnSupabaseError(error, 'Failed to load follow-up summary');

  const mantralayaId = locationByCode.get('mantralaya')?.id;
  const bmcId = departmentByCode.get('bmc')?.id;
  const sraId = departmentByCode.get('sra')?.id;

  const summary: GovFollowUpSummary = {
    dueToday: 0,
    upcoming: 0,
    overdue: 0,
    visits: 0,
    closed: 0,
    stale7: 0,
    mantralaya: 0,
    bmc: 0,
    sra: 0,
    minister: 0,
    deptReply: 0,
    sanctions: 0,
    recentlyClosed: 0,
  };

  for (const raw of data ?? []) {
    const status = String(raw.status ?? '');
    const nextOn = raw.next_follow_up_on ? String(raw.next_follow_up_on) : '';
    const lastOn = raw.last_follow_up_on
      ? String(raw.last_follow_up_on)
      : null;
    const submitted = raw.date_submitted ? String(raw.date_submitted) : '';
    const stage = String(raw.present_stage ?? '').toLowerCase();
    const nextAction = String(raw.next_action ?? '').toLowerCase();
    const updatedAt = String(raw.updated_at ?? '');
    const open = isOpenGovFollowUpStatus(status);

    if (open && nextOn === today) summary.dueToday += 1;
    if (open && nextOn && nextOn > today) summary.upcoming += 1;
    if (open && nextOn && nextOn < today) summary.overdue += 1;
    if (open && nextOn && nextOn <= today) summary.visits += 1;
    if (CLOSED.includes(status as (typeof CLOSED)[number])) {
      summary.closed += 1;
    }
    if (open) {
      const last = lastOn ?? submitted;
      if (!last || last <= staleCutoff) summary.stale7 += 1;
    }
    if (open && mantralayaId && raw.location_id === mantralayaId) {
      summary.mantralaya += 1;
    }
    if (open && bmcId && raw.department_id === bmcId) summary.bmc += 1;
    if (open && sraId && raw.department_id === sraId) summary.sra += 1;
    if (open && stage.includes('minister')) summary.minister += 1;
    if (open && (stage.includes('reply') || nextAction.includes('reply'))) {
      summary.deptReply += 1;
    }
    if (status === 'approval_pending') summary.sanctions += 1;
    if (
      CLOSED.includes(status as (typeof CLOSED)[number]) &&
      updatedAt >= `${recentlyClosedCutoff}T00:00:00`
    ) {
      summary.recentlyClosed += 1;
    }
  }

  return summary;
}

export async function listGovFollowUpGroups(
  by: 'department' | 'officer' | 'staff',
): Promise<GovFollowUpGroupRow[]> {
  const { data, error } = await supabase
    .from(TABLES.govFollowUpMatter)
    .select('department_id, officer_name, staff_user_id')
    .in('status', OPEN);
  throwOnSupabaseError(error, 'Failed to group follow-up matters');

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    let key = '';
    if (by === 'department') key = String(row.department_id ?? '');
    else if (by === 'officer')
      key = String(row.officer_name ?? '').trim() || '(unassigned)';
    else key = String(row.staff_user_id ?? '') || '(unassigned)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  if (by === 'department') {
    const departments = await listGovFollowUpDepartments();
    return departments
      .map((dept) => ({
        key: dept.id,
        label: dept.name,
        count: counts.get(dept.id) ?? 0,
      }))
      .filter((row) => row.count > 0);
  }

  if (by === 'staff') {
    const userById = await listUserNameById();
    return [...counts.entries()]
      .map(([key, count]) => ({
        key,
        label:
          key === '(unassigned)'
            ? 'Unassigned'
            : (userById.get(key) ?? key),
        count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  return [...counts.entries()]
    .map(([key, count]) => ({
      key,
      label: key === '(unassigned)' ? 'Unassigned' : key,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export async function getGovFollowUpVisitPlanner(options: {
  locationId?: string;
  date?: string;
}): Promise<GovFollowUpVisitPlanner> {
  const today = getTodayDateStringIST();
  const date = options.date || today;
  const locations = await listGovFollowUpLocations();
  const location =
    locations.find((item) => item.id === options.locationId) ??
    locations.find((item) => item.code === 'mantralaya') ??
    locations[0];
  if (!location) {
    return {
      locationId: '',
      locationName: '',
      date,
      total: 0,
      byDepartment: [],
      matters: [],
    };
  }

  const { data, error } = await supabase
    .from(TABLES.govFollowUpMatter)
    .select('*')
    .in('status', OPEN)
    .eq('location_id', location.id)
    .lte('next_follow_up_on', date)
    .order('department_id', { ascending: true })
    .order('subject', { ascending: true });
  throwOnSupabaseError(error, 'Failed to load visit planner');

  const matters = await hydrateMatters(
    (data ?? []).map(mapGovFollowUpMatterRow),
  );
  const byDept = new Map<string, { name: string; count: number }>();
  for (const matter of matters) {
    const current = byDept.get(matter.departmentId) ?? {
      name: matter.departmentName,
      count: 0,
    };
    current.count += 1;
    byDept.set(matter.departmentId, current);
  }

  return {
    locationId: location.id,
    locationName: location.name,
    date,
    total: matters.length,
    byDepartment: [...byDept.entries()].map(([departmentId, value]) => ({
      departmentId,
      name: value.name,
      count: value.count,
    })),
    matters,
  };
}

export async function getGovFollowUpCatalogs(): Promise<GovFollowUpCatalogs> {
  const [departments, locations, users, officerRows, officeRows, deskRows] =
    await Promise.all([
      listGovFollowUpDepartments(),
      listGovFollowUpLocations(),
      listStaffUsers(),
      supabase
        .from(TABLES.govFollowUpMatter)
        .select('officer_name')
        .not('officer_name', 'is', null),
      supabase
        .from(TABLES.govFollowUpMatter)
        .select('office_name')
        .not('office_name', 'is', null),
      supabase
        .from(TABLES.govFollowUpMatter)
        .select('desk_name')
        .not('desk_name', 'is', null),
    ]);

  throwOnSupabaseError(officerRows.error, 'Failed to load officer typeahead');
  throwOnSupabaseError(officeRows.error, 'Failed to load office typeahead');
  throwOnSupabaseError(deskRows.error, 'Failed to load desk typeahead');

  const uniq = (values: Array<string | null | undefined>) =>
    [
      ...new Set(
        values
          .map((value) => value?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ].sort((a, b) => a.localeCompare(b));

  return {
    departments,
    locations,
    users,
    officers: uniq((officerRows.data ?? []).map((row) => row.officer_name)),
    offices: uniq((officeRows.data ?? []).map((row) => row.office_name)),
    desks: uniq((deskRows.data ?? []).map((row) => row.desk_name)),
  };
}

export async function getGovFollowUpMatterById(
  id: string,
): Promise<GovFollowUpMatterDetail | null> {
  const { data, error } = await supabase
    .from(TABLES.govFollowUpMatter)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  throwOnSupabaseError(error, 'Failed to load follow-up matter');
  if (!data) return null;

  const [hydrated] = await hydrateMatters([mapGovFollowUpMatterRow(data)]);
  if (!hydrated) return null;

  const { data: logRows, error: logError } = await supabase
    .from(TABLES.govFollowUpLog)
    .select('*')
    .eq('matter_id', id)
    .order('occurred_on', { ascending: true })
    .order('created_at', { ascending: true });
  throwOnSupabaseError(logError, 'Failed to load follow-up history');

  const userById = await listUserNameById();
  const logs = (logRows ?? []).map((row) => {
    const log = mapGovFollowUpLogRow(row);
    return {
      ...log,
      performedByName: userById.get(log.performedBy) ?? null,
    };
  });

  return { ...hydrated, logs };
}

export async function findMatterByLetterId(
  letterId: string,
): Promise<GovFollowUpMatter | null> {
  const { data, error } = await supabase
    .from(TABLES.govFollowUpMatter)
    .select('*')
    .eq('letter_id', letterId)
    .order('created_at', { ascending: false })
    .limit(1);
  throwOnSupabaseError(error, 'Failed to find follow-up by letter');
  return data?.[0] ? mapGovFollowUpMatterRow(data[0]) : null;
}

export async function attachLetterToGovFollowUpMatter(params: {
  matterId: string;
  letterId: string;
}): Promise<void> {
  const { error } = await supabase
    .from(TABLES.govFollowUpMatter)
    .update({
      letter_id: params.letterId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.matterId);
  throwOnSupabaseError(error, 'Failed to link letter to follow-up matter');
}

export async function findOpenMatterByLetterId(
  letterId: string,
): Promise<GovFollowUpMatter | null> {
  const { data, error } = await supabase
    .from(TABLES.govFollowUpMatter)
    .select('*')
    .eq('letter_id', letterId)
    .in('status', OPEN)
    .limit(1);
  throwOnSupabaseError(error, 'Failed to find follow-up by letter');
  return data?.[0] ? mapGovFollowUpMatterRow(data[0]) : null;
}

export async function findOpenMatterByRegisterEntryId(
  registerEntryId: string,
): Promise<GovFollowUpMatter | null> {
  const { data, error } = await supabase
    .from(TABLES.govFollowUpMatter)
    .select('*')
    .eq('register_entry_id', registerEntryId)
    .in('status', OPEN)
    .limit(1);
  throwOnSupabaseError(error, 'Failed to find follow-up by register entry');
  return data?.[0] ? mapGovFollowUpMatterRow(data[0]) : null;
}

export async function getGovFollowUpPrefill(options: {
  letterId?: string;
  registerEntryId?: string;
}): Promise<GovFollowUpPrefill> {
  const today = getTodayDateStringIST();
  if (options.letterId) {
    const existing = await findOpenMatterByLetterId(options.letterId);
    const letter = await getLetterById(options.letterId);
    return {
      existingMatterId: existing?.id ?? null,
      subject: letter?.title ?? '',
      dateSubmitted: letter
        ? getTodayDateStringIST(letter.createdAt)
        : today,
      inwardRefNo: '',
      letterId: options.letterId,
      registerEntryId: null,
      letterReferenceNo: letter?.referenceNo ?? null,
      registerRefNo: null,
    };
  }
  if (options.registerEntryId) {
    const existing = await findOpenMatterByRegisterEntryId(
      options.registerEntryId,
    );
    const entry = await getRegisterEntryById(options.registerEntryId);
    return {
      existingMatterId: existing?.id ?? null,
      subject: entry?.subject ?? '',
      dateSubmitted: entry?.date ?? today,
      inwardRefNo: entry?.type === 'inward' ? (entry.refNo ?? '') : '',
      letterId: null,
      registerEntryId: options.registerEntryId,
      letterReferenceNo: null,
      registerRefNo: entry?.refNo ?? null,
    };
  }
  return {
    existingMatterId: null,
    subject: '',
    dateSubmitted: today,
    inwardRefNo: '',
    letterId: null,
    registerEntryId: null,
    letterReferenceNo: null,
    registerRefNo: null,
  };
}

function pendingSnapshot(input: {
  departmentId: string;
  locationId: string;
  officeName?: string | null;
  officerName?: string | null;
  designation?: string | null;
  deskName?: string | null;
  presentStage?: string | null;
}) {
  return {
    department_id: input.departmentId,
    location_id: input.locationId,
    office_name: emptyToNull(input.officeName),
    officer_name: emptyToNull(input.officerName),
    designation: emptyToNull(input.designation),
    desk_name: emptyToNull(input.deskName),
    present_stage: emptyToNull(input.presentStage),
  };
}

async function insertLog(params: {
  matterId: string;
  occurredOn: string;
  kind: GovFollowUpLogKind;
  mode?: GovFollowUpMode | null;
  body: string;
  snapshot: ReturnType<typeof pendingSnapshot>;
  nextFollowUpOn?: string | null;
  nextAction?: string | null;
  performedBy: string;
}): Promise<GovFollowUpLog> {
  const { data, error } = await supabase
    .from(TABLES.govFollowUpLog)
    .insert({
      matter_id: params.matterId,
      occurred_on: params.occurredOn,
      kind: params.kind,
      mode: params.mode ?? null,
      body: params.body,
      ...params.snapshot,
      next_follow_up_on: params.nextFollowUpOn ?? null,
      next_action: emptyToNull(params.nextAction),
      performed_by: params.performedBy,
    })
    .select('*')
    .single();
  throwOnSupabaseError(error, 'Failed to write follow-up history');
  return mapGovFollowUpLogRow(data);
}

export async function createGovFollowUpMatter(params: {
  input: GovFollowUpMatterInput;
  createdBy: string;
}): Promise<GovFollowUpMatterDetail> {
  const { input, createdBy } = params;
  const subject = input.subject.trim();
  if (!subject) {
    throw new ChatSDKError('bad_request:database', 'Subject is required');
  }
  const status = input.status ?? 'pending';
  const nextFollowUpOn = emptyToNull(input.nextFollowUpOn);
  if (isOpenGovFollowUpStatus(status) && !nextFollowUpOn) {
    throw new ChatSDKError(
      'bad_request:database',
      'Next follow-up date is required for open matters',
    );
  }

  const followUpNo = await nextFollowUpNo();
  const now = new Date().toISOString();
  const snapshot = pendingSnapshot(input);

  const { data, error } = await supabase
    .from(TABLES.govFollowUpMatter)
    .insert({
      follow_up_no: followUpNo,
      subject,
      letter_id: emptyToNull(input.letterId),
      register_entry_id: emptyToNull(input.registerEntryId),
      beneficiary_service_id: emptyToNull(input.beneficiaryServiceId),
      project_id: emptyToNull(input.projectId),
      ...snapshot,
      contact_phone: emptyToNull(input.contactPhone),
      contact_email: emptyToNull(input.contactEmail),
      staff_user_id: emptyToNull(input.staffUserId),
      date_submitted: input.dateSubmitted,
      inward_ref_no: emptyToNull(input.inwardRefNo),
      next_action: emptyToNull(input.nextAction),
      next_follow_up_on: nextFollowUpOn,
      last_log_kind: 'submitted',
      priority: input.priority ?? 'normal',
      status,
      remarks: emptyToNull(input.remarks),
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();
  throwOnSupabaseError(error, 'Failed to create follow-up matter');

  const matter = mapGovFollowUpMatterRow(data);
  const departments = await listGovFollowUpDepartments();
  const departmentName =
    departments.find((dept) => dept.id === input.departmentId)?.name ?? null;
  const body = defaultGovFollowUpLogBody('submitted', {
    departmentName,
    officeName: input.officeName,
    inwardRefNo: input.inwardRefNo,
  });
  await insertLog({
    matterId: matter.id,
    occurredOn: input.dateSubmitted,
    kind: 'submitted',
    mode: 'letter',
    body,
    snapshot,
    nextFollowUpOn,
    nextAction: input.nextAction,
    performedBy: createdBy,
  });

  const detail = await getGovFollowUpMatterById(matter.id);
  if (!detail) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to reload follow-up matter',
    );
  }
  return detail;
}

function pendingWithChanged(
  current: GovFollowUpMatter,
  next: {
    departmentId?: string;
    locationId?: string;
    officeName?: string | null;
    officerName?: string | null;
    designation?: string | null;
    deskName?: string | null;
    presentStage?: string | null;
  },
): boolean {
  return (
    (next.departmentId != null && next.departmentId !== current.departmentId) ||
    (next.locationId != null && next.locationId !== current.locationId) ||
    (next.officeName !== undefined &&
      emptyToNull(next.officeName) !== current.officeName) ||
    (next.officerName !== undefined &&
      emptyToNull(next.officerName) !== current.officerName) ||
    (next.designation !== undefined &&
      emptyToNull(next.designation) !== current.designation) ||
    (next.deskName !== undefined &&
      emptyToNull(next.deskName) !== current.deskName) ||
    (next.presentStage !== undefined &&
      emptyToNull(next.presentStage) !== current.presentStage)
  );
}

export async function updateGovFollowUpMatter(params: {
  id: string;
  patch: Partial<GovFollowUpMatterInput>;
  updatedBy: string;
}): Promise<GovFollowUpMatterDetail> {
  const current = await getGovFollowUpMatterById(params.id);
  if (!current) {
    throw new ChatSDKError('not_found:database', 'Follow-up matter not found');
  }

  const nextStatus = params.patch.status ?? current.status;
  const nextFollowUpOn =
    params.patch.nextFollowUpOn !== undefined
      ? emptyToNull(params.patch.nextFollowUpOn)
      : current.nextFollowUpOn;
  if (isOpenGovFollowUpStatus(nextStatus) && !nextFollowUpOn) {
    throw new ChatSDKError(
      'bad_request:database',
      'Next follow-up date is required for open matters',
    );
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };
  const patch = params.patch;
  if (patch.subject != null) update.subject = patch.subject.trim();
  if (patch.departmentId != null) update.department_id = patch.departmentId;
  if (patch.locationId != null) update.location_id = patch.locationId;
  if (patch.officeName !== undefined)
    update.office_name = emptyToNull(patch.officeName);
  if (patch.officerName !== undefined)
    update.officer_name = emptyToNull(patch.officerName);
  if (patch.designation !== undefined)
    update.designation = emptyToNull(patch.designation);
  if (patch.contactPhone !== undefined)
    update.contact_phone = emptyToNull(patch.contactPhone);
  if (patch.contactEmail !== undefined)
    update.contact_email = emptyToNull(patch.contactEmail);
  if (patch.deskName !== undefined)
    update.desk_name = emptyToNull(patch.deskName);
  if (patch.presentStage !== undefined)
    update.present_stage = emptyToNull(patch.presentStage);
  if (patch.staffUserId !== undefined)
    update.staff_user_id = emptyToNull(patch.staffUserId);
  if (patch.dateSubmitted != null) update.date_submitted = patch.dateSubmitted;
  if (patch.inwardRefNo !== undefined)
    update.inward_ref_no = emptyToNull(patch.inwardRefNo);
  if (patch.nextAction !== undefined)
    update.next_action = emptyToNull(patch.nextAction);
  if (patch.nextFollowUpOn !== undefined)
    update.next_follow_up_on = nextFollowUpOn;
  if (patch.priority != null) update.priority = patch.priority;
  if (patch.status != null) update.status = patch.status;
  if (patch.remarks !== undefined) update.remarks = emptyToNull(patch.remarks);
  if (patch.letterId !== undefined)
    update.letter_id = emptyToNull(patch.letterId);
  if (patch.registerEntryId !== undefined)
    update.register_entry_id = emptyToNull(patch.registerEntryId);
  if (patch.beneficiaryServiceId !== undefined) {
    update.beneficiary_service_id = emptyToNull(patch.beneficiaryServiceId);
  }
  if (patch.projectId !== undefined)
    update.project_id = emptyToNull(patch.projectId);

  const moved = pendingWithChanged(current, patch);
  if (moved) {
    update.last_log_kind = 'file_movement';
  }

  const { error } = await supabase
    .from(TABLES.govFollowUpMatter)
    .update(update)
    .eq('id', params.id);
  throwOnSupabaseError(error, 'Failed to update follow-up matter');

  if (moved) {
    const merged = {
      departmentId: patch.departmentId ?? current.departmentId,
      locationId: patch.locationId ?? current.locationId,
      officeName:
        patch.officeName !== undefined ? patch.officeName : current.officeName,
      officerName:
        patch.officerName !== undefined
          ? patch.officerName
          : current.officerName,
      designation:
        patch.designation !== undefined
          ? patch.designation
          : current.designation,
      deskName: patch.deskName !== undefined ? patch.deskName : current.deskName,
      presentStage:
        patch.presentStage !== undefined
          ? patch.presentStage
          : current.presentStage,
    };
    const fromLabel = [current.officerName, current.officeName, current.presentStage]
      .filter(Boolean)
      .join(' / ');
    const toLabel = [merged.officerName, merged.officeName, merged.presentStage]
      .filter(Boolean)
      .join(' / ');
    await insertLog({
      matterId: params.id,
      occurredOn: getTodayDateStringIST(),
      kind: 'file_movement',
      body: `File moved from ${fromLabel || 'previous desk'} to ${toLabel || 'new desk'}.`,
      snapshot: pendingSnapshot(merged),
      nextFollowUpOn: nextFollowUpOn,
      nextAction:
        patch.nextAction !== undefined ? patch.nextAction : current.nextAction,
      performedBy: params.updatedBy,
    });
  }

  const detail = await getGovFollowUpMatterById(params.id);
  if (!detail) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to reload follow-up matter',
    );
  }
  return detail;
}

export async function addGovFollowUpLog(params: {
  matterId: string;
  input: GovFollowUpLogInput;
  performedBy: string;
}): Promise<GovFollowUpMatterDetail> {
  const current = await getGovFollowUpMatterById(params.matterId);
  if (!current) {
    throw new ChatSDKError('not_found:database', 'Follow-up matter not found');
  }

  const kind = params.input.kind;
  const impliedStatus = suggestedStatusForLogKind(kind);
  const nextStatus =
    params.input.status ?? impliedStatus ?? current.status;
  const nextFollowUpOn = !isOpenGovFollowUpStatus(nextStatus)
    ? null
    : params.input.nextFollowUpOn !== undefined
      ? emptyToNull(params.input.nextFollowUpOn)
      : current.nextFollowUpOn;
  if (isOpenGovFollowUpStatus(nextStatus) && !nextFollowUpOn) {
    throw new ChatSDKError(
      'bad_request:database',
      'Next follow-up date is required for open matters',
    );
  }

  const merged = {
    departmentId: params.input.departmentId ?? current.departmentId,
    locationId: params.input.locationId ?? current.locationId,
    officeName:
      params.input.officeName !== undefined
        ? params.input.officeName
        : current.officeName,
    officerName:
      params.input.officerName !== undefined
        ? params.input.officerName
        : current.officerName,
    designation:
      params.input.designation !== undefined
        ? params.input.designation
        : current.designation,
    deskName:
      params.input.deskName !== undefined
        ? params.input.deskName
        : current.deskName,
    presentStage:
      params.input.presentStage !== undefined
        ? params.input.presentStage
        : current.presentStage,
  };

  const snapshot = pendingSnapshot(merged);
  const inwardRefNo =
    params.input.inwardRefNo !== undefined
      ? emptyToNull(params.input.inwardRefNo)
      : current.inwardRefNo;
  const body =
    params.input.body.trim() ||
    defaultGovFollowUpLogBody(kind, {
      departmentName: current.departmentName,
      officeName: merged.officeName,
      officerName: merged.officerName,
      designation: merged.designation,
      deskName: merged.deskName,
      inwardRefNo,
    });
  await insertLog({
    matterId: params.matterId,
    occurredOn: params.input.occurredOn,
    kind,
    mode: params.input.mode,
    body,
    snapshot,
    nextFollowUpOn,
    nextAction: params.input.nextAction ?? current.nextAction,
    performedBy: params.performedBy,
  });

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    updated_at: now,
    last_log_kind: kind,
    last_follow_up_on: params.input.occurredOn,
    last_follow_up_mode: params.input.mode ?? current.lastFollowUpMode,
    last_response: body,
    department_id: merged.departmentId,
    location_id: merged.locationId,
    office_name: snapshot.office_name,
    officer_name: snapshot.officer_name,
    designation: snapshot.designation,
    desk_name: snapshot.desk_name,
    present_stage: snapshot.present_stage,
    next_follow_up_on: nextFollowUpOn,
    next_action: emptyToNull(params.input.nextAction) ?? current.nextAction,
    status: nextStatus,
  };

  if (params.input.inwardRefNo !== undefined) {
    update.inward_ref_no = emptyToNull(params.input.inwardRefNo);
  }
  if (params.input.contactPhone !== undefined) {
    update.contact_phone = emptyToNull(params.input.contactPhone);
  }
  if (params.input.contactEmail !== undefined) {
    update.contact_email = emptyToNull(params.input.contactEmail);
  }

  const { error } = await supabase
    .from(TABLES.govFollowUpMatter)
    .update(update)
    .eq('id', params.matterId);
  throwOnSupabaseError(error, 'Failed to update matter after follow-up');

  const detail = await getGovFollowUpMatterById(params.matterId);
  if (!detail) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to reload follow-up matter',
    );
  }
  return detail;
}

import 'server-only';

import { supabase } from '@/lib/supabase/server';
import { sql as pgSql } from '@/lib/db/postgres';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { TABLES } from './schema';
import {
  mapCadreGeographicUnitRow,
  mapCadreMemberRow,
  mapCadrePositionLevelRow,
  mapCadrePositionRow,
  mapCadreVerticalCategoryRow,
  mapCadreVerticalRow,
  mapUserRow,
} from './mappers';
import type {
  CadreGeographicUnit,
  CadreMember,
  CadrePosition,
  CadrePositionLevel,
  CadreVertical,
  CadreVerticalCategory,
} from './schema';
import type {
  CadreConfig,
  CadreGeographicUnitType,
  CadreMemberCard,
  CadreMemberPostDetail,
  WardSummary,
} from '@/lib/hierarchy/types';
import {
  collectCanvasMemberIds,
  hydrateCanvasData,
  resolveHierarchyCanvasData,
  type HierarchyCanvasData,
} from '@/lib/hierarchy/canvas-data';
import {
  buildStubMembersFromPosts,
  resolveHierarchyLeaders,
  type HierarchyLeaders,
} from '@/lib/hierarchy/leaders';
import {
  getBoothGeoUnits,
  normalizeBoothScopedPostGeo,
  type GeoUnitMeta,
} from '@/lib/hierarchy/booth-geo-units';
import {
  extractWardNumber,
  sortMembers,
} from '@/lib/hierarchy/member-list';
import {
  extractBoothNumbersFromQuery,
  extractSearchDigits,
  extractWardNumbersFromQuery,
  parseSearchTerms,
} from '@/lib/hierarchy/member-search';
import type { CadreWhatsAppBroadcastTarget } from './schema';

export async function getCadreConfig() {
  // Sequential reads — avoids pool deadlock when max pool size is 1 (session pooler).
  const categoriesRes = await pgSql`
    SELECT id, name, sort_order, is_active, created_at, updated_at
    FROM "CadreVerticalCategory"
    ORDER BY sort_order ASC
  `;
  const verticalsRes = await pgSql`
    SELECT v.id, v.category_id, v.name, v.sort_order, v.is_active, c.name AS category_name
    FROM "CadreVertical" v
    INNER JOIN "CadreVerticalCategory" c ON v.category_id = c.id
    ORDER BY v.sort_order ASC
  `;
  const levelsRes = await pgSql`
    SELECT id, key, name, sort_order, created_at, updated_at
    FROM "CadrePositionLevel"
    ORDER BY sort_order ASC
  `;
  const positionsRes = await pgSql`
    SELECT p.id, p.level_id, p.name, p.sort_order, p.is_active, l.key AS level_key, l.name AS level_name
    FROM "CadrePosition" p
    INNER JOIN "CadrePositionLevel" l ON p.level_id = l.id
    ORDER BY p.sort_order ASC
  `;
  const geoRes = await pgSql`
    SELECT id, type, name, parent_id, ac_no, sort_order, is_active, created_at, updated_at
    FROM "CadreGeographicUnit"
    ORDER BY sort_order ASC
  `;

  return {
    categories: categoriesRes.map(mapCadreVerticalCategoryRow),
    verticals: verticalsRes.map((row) => ({
      id: String(row.id),
      categoryId: String(row.category_id),
      name: String(row.name),
      sortOrder: Number(row.sort_order),
      isActive: Boolean(row.is_active),
      categoryName: String(row.category_name),
    })),
    levels: levelsRes.map(mapCadrePositionLevelRow),
    positions: positionsRes.map((row) => ({
      id: String(row.id),
      levelId: String(row.level_id),
      name: String(row.name),
      sortOrder: Number(row.sort_order),
      isActive: Boolean(row.is_active),
      levelKey: String(row.level_key),
      levelName: String(row.level_name),
    })),
    geoUnits: geoRes.map(mapCadreGeographicUnitRow),
  };
}

async function upsertCadreRow<T>(
  table: string,
  id: string | undefined,
  values: Record<string, unknown>,
  mapper: (row: Record<string, unknown>) => T,
): Promise<T> {
  if (id) {
    const { data, error } = await supabase
      .from(table)
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    throwOnSupabaseError(error, `Failed to update ${table}`);
    return mapper(data);
  }
  const { data, error } = await supabase
    .from(table)
    .insert(values)
    .select()
    .single();
  throwOnSupabaseError(error, `Failed to insert ${table}`);
  return mapper(data);
}

export async function upsertCadreVerticalCategory(data: {
  id?: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<CadreVerticalCategory> {
  return upsertCadreRow(
    TABLES.cadreVerticalCategory,
    data.id,
    {
      name: data.name,
      sort_order: data.sortOrder ?? 0,
      is_active: data.isActive ?? true,
    },
    mapCadreVerticalCategoryRow,
  );
}

export async function upsertCadreVertical(data: {
  id?: string;
  categoryId: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<CadreVertical> {
  return upsertCadreRow(
    TABLES.cadreVertical,
    data.id,
    {
      category_id: data.categoryId,
      name: data.name,
      sort_order: data.sortOrder ?? 0,
      is_active: data.isActive ?? true,
    },
    mapCadreVerticalRow,
  );
}

export async function upsertCadrePosition(data: {
  id?: string;
  levelId: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<CadrePosition> {
  return upsertCadreRow(
    TABLES.cadrePosition,
    data.id,
    {
      level_id: data.levelId,
      name: data.name,
      sort_order: data.sortOrder ?? 0,
      is_active: data.isActive ?? true,
    },
    mapCadrePositionRow,
  );
}

export async function upsertCadrePositionLevel(data: {
  id?: string;
  key: string;
  name: string;
  sortOrder?: number;
}): Promise<CadrePositionLevel> {
  return upsertCadreRow(
    TABLES.cadrePositionLevel,
    data.id,
    {
      key: data.key.trim(),
      name: data.name.trim(),
      sort_order: data.sortOrder ?? 0,
    },
    mapCadrePositionLevelRow,
  );
}

export type CadreConfigReferenceCounts = {
  categories: Record<string, { verticalCount: number }>;
  verticals: Record<string, { nodeCount: number }>;
  levels: Record<string, { positionCount: number }>;
  positions: Record<string, { nodeCount: number }>;
  geoUnits: Record<string, { nodeCount: number; childGeoCount: number }>;
};

export class CadreConfigDeleteError extends Error {
  readonly code = 'IN_USE' as const;
  readonly usage: {
    nodeCount?: number;
    verticalCount?: number;
    positionCount?: number;
    childGeoCount?: number;
  };

  constructor(
    message: string,
    usage: {
      nodeCount?: number;
      verticalCount?: number;
      positionCount?: number;
      childGeoCount?: number;
    } = {},
  ) {
    super(message);
    this.name = 'CadreConfigDeleteError';
    this.usage = usage;
  }
}

export async function getCadreConfigReferenceCounts(): Promise<CadreConfigReferenceCounts> {
  const verticalsByCategory = await pgSql`
    SELECT category_id, COUNT(*)::int AS total
    FROM "CadreVertical"
    GROUP BY category_id
  `;
  const nodesByVertical = await pgSql`
    SELECT vertical_id, COUNT(*)::int AS total
    FROM "CadreMemberVertical"
    GROUP BY vertical_id
  `;
  const positionsByLevel = await pgSql`
    SELECT level_id, COUNT(*)::int AS total
    FROM "CadrePosition"
    GROUP BY level_id
  `;
  const nodesByPosition = await pgSql`
    SELECT position_id, COUNT(*)::int AS total
    FROM "CadreMemberPost"
    GROUP BY position_id
  `;
  const childGeoByParent = await pgSql`
    SELECT parent_id, COUNT(*)::int AS total
    FROM "CadreGeographicUnit"
    WHERE parent_id IS NOT NULL
    GROUP BY parent_id
  `;
  const geoNodeRows = await pgSql`
    SELECT taluka_id, ward_geo_id
    FROM "CadreMemberPost"
  `;

  const categories: CadreConfigReferenceCounts['categories'] = {};
  for (const row of verticalsByCategory) {
    categories[String(row.category_id)] = { verticalCount: Number(row.total) };
  }

  const verticals: CadreConfigReferenceCounts['verticals'] = {};
  for (const row of nodesByVertical) {
    verticals[String(row.vertical_id)] = { nodeCount: Number(row.total) };
  }

  const levels: CadreConfigReferenceCounts['levels'] = {};
  for (const row of positionsByLevel) {
    levels[String(row.level_id)] = { positionCount: Number(row.total) };
  }

  const positions: CadreConfigReferenceCounts['positions'] = {};
  for (const row of nodesByPosition) {
    positions[String(row.position_id)] = { nodeCount: Number(row.total) };
  }

  const geoUnits: CadreConfigReferenceCounts['geoUnits'] = {};
  for (const row of childGeoByParent) {
    const parentId = String(row.parent_id);
    geoUnits[parentId] = { nodeCount: 0, childGeoCount: Number(row.total) };
  }
  for (const row of geoNodeRows) {
    for (const geoId of [row.taluka_id, row.ward_geo_id]) {
      if (!geoId) continue;
      const id = String(geoId);
      const existing = geoUnits[id] ?? { nodeCount: 0, childGeoCount: 0 };
      geoUnits[id] = { ...existing, nodeCount: existing.nodeCount + 1 };
    }
  }

  return { categories, verticals, levels, positions, geoUnits };
}

export async function deleteCadreVerticalCategory(id: string): Promise<void> {
  const [usage] = await pgSql`
    SELECT COUNT(*)::int AS total
    FROM "CadreVertical"
    WHERE category_id = ${id}
  `;
  const verticalCount = Number(usage?.total ?? 0);
  if (verticalCount > 0) {
    throw new CadreConfigDeleteError(
      `Cannot delete — ${verticalCount} vertical${verticalCount === 1 ? '' : 's'} use this category`,
      { verticalCount },
    );
  }
  const { error } = await supabase
    .from(TABLES.cadreVerticalCategory)
    .delete()
    .eq('id', id);
  throwOnSupabaseError(error, 'Failed to delete cadre vertical category');
}

export async function deleteCadreVertical(id: string): Promise<void> {
  const [usage] = await pgSql`
    SELECT COUNT(*)::int AS total
    FROM "CadreMemberVertical"
    WHERE vertical_id = ${id}
  `;
  const nodeCount = Number(usage?.total ?? 0);
  if (nodeCount > 0) {
    throw new CadreConfigDeleteError(
      `Cannot delete — ${nodeCount} member${nodeCount === 1 ? '' : 's'} ${nodeCount === 1 ? 'is' : 'are'} assigned to this vertical`,
      { nodeCount },
    );
  }
  const { error } = await supabase.from(TABLES.cadreVertical).delete().eq('id', id);
  throwOnSupabaseError(error, 'Failed to delete cadre vertical');
}

export async function deleteCadrePositionLevel(id: string): Promise<void> {
  const [usage] = await pgSql`
    SELECT COUNT(*)::int AS total
    FROM "CadrePosition"
    WHERE level_id = ${id}
  `;
  const positionCount = Number(usage?.total ?? 0);
  if (positionCount > 0) {
    throw new CadreConfigDeleteError(
      `Cannot delete — ${positionCount} position${positionCount === 1 ? '' : 's'} use this level`,
      { positionCount },
    );
  }
  const { error } = await supabase
    .from(TABLES.cadrePositionLevel)
    .delete()
    .eq('id', id);
  throwOnSupabaseError(error, 'Failed to delete cadre position level');
}

export async function deleteCadrePosition(id: string): Promise<void> {
  const [usage] = await pgSql`
    SELECT COUNT(*)::int AS total
    FROM "CadreMemberPost"
    WHERE position_id = ${id}
  `;
  const nodeCount = Number(usage?.total ?? 0);
  if (nodeCount > 0) {
    throw new CadreConfigDeleteError(
      `Cannot delete — ${nodeCount} member post${nodeCount === 1 ? '' : 's'} use this position`,
      { nodeCount },
    );
  }
  const { error } = await supabase.from(TABLES.cadrePosition).delete().eq('id', id);
  throwOnSupabaseError(error, 'Failed to delete cadre position');
}

export async function deleteCadreGeographicUnit(id: string, name?: string): Promise<void> {
  const [childUsage, nodeRows] = await Promise.all([
    pgSql`
      SELECT COUNT(*)::int AS total
      FROM "CadreGeographicUnit"
      WHERE parent_id = ${id}
    `,
    pgSql`
      SELECT taluka_id, ward_geo_id
      FROM "CadreMemberPost"
      WHERE taluka_id = ${id}
        OR ward_geo_id = ${id}
    `,
  ]);

  const childGeoCount = Number(childUsage[0]?.total ?? 0);
  const nodeCount = nodeRows.length;
  if (childGeoCount > 0 || nodeCount > 0) {
    const label = name ? `"${name}"` : 'This unit';
    const parts: string[] = [];
    if (nodeCount > 0) {
      parts.push(
        `${nodeCount} member post${nodeCount === 1 ? '' : 's'} ${nodeCount === 1 ? 'is' : 'are'} assigned to ${label}`,
      );
    }
    if (childGeoCount > 0) {
      parts.push(
        `${childGeoCount} child geographic unit${childGeoCount === 1 ? '' : 's'} depend on ${label}`,
      );
    }
    throw new CadreConfigDeleteError(`Cannot delete — ${parts.join('; ')}`, {
      nodeCount,
      childGeoCount,
    });
  }
  const { error } = await supabase
    .from(TABLES.cadreGeographicUnit)
    .delete()
    .eq('id', id);
  throwOnSupabaseError(error, 'Failed to delete cadre geographic unit');
}

export async function upsertCadreGeographicUnit(data: {
  id?: string;
  type: CadreGeographicUnitType;
  name: string;
  parentId?: string | null;
  acNo?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<CadreGeographicUnit> {
  return upsertCadreRow(
    TABLES.cadreGeographicUnit,
    data.id,
    {
      type: data.type,
      name: data.name,
      parent_id: data.parentId ?? null,
      ac_no: data.acNo ?? null,
      sort_order: data.sortOrder ?? 0,
      is_active: data.isActive ?? true,
    },
    mapCadreGeographicUnitRow,
  );
}

type PositionMeta = {
  name: string;
  sortOrder: number;
  levelKey: string;
  levelName: string;
  levelSortOrder: number;
};

async function buildMemberCards(members: CadreMember[]): Promise<CadreMemberCard[]> {
  if (members.length === 0) return [];

  const memberIds = members.map((m) => m.id);
  const userIds = [...new Set(members.map((m) => m.userId).filter(Boolean))] as string[];
  const epicNumbers = [...new Set(members.map((m) => m.epicNumber).filter(Boolean))] as string[];

  const [
    verticalLinksRes,
    postRowsRes,
    usersRes,
    votersRes,
    mobilesRes,
    whatsappRes,
  ] = await Promise.all([
    supabase
      .from(TABLES.cadreMemberVertical)
      .select('member_id, vertical_id, is_primary')
      .in('member_id', memberIds),
    supabase
      .from(TABLES.cadreMemberPost)
      .select('*')
      .in('member_id', memberIds)
      .order('is_primary', { ascending: false })
      .order('sort_order', { ascending: true }),
    userIds.length > 0
      ? supabase.from(TABLES.user).select('id, user_id').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    epicNumbers.length > 0
      ? supabase
          .from(TABLES.voterMaster)
          .select('epic_number, full_name')
          .in('epic_number', epicNumbers)
      : Promise.resolve({ data: [], error: null }),
    epicNumbers.length > 0
      ? supabase
          .from(TABLES.voterMobileNumber)
          .select('epic_number, mobile_number')
          .in('epic_number', epicNumbers)
          .eq('sort_order', 1)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from(TABLES.cadreMemberWhatsApp)
      .select('member_id, whatsapp_phone')
      .in('member_id', memberIds),
  ]);

  throwOnSupabaseError(verticalLinksRes.error, 'Failed to load member verticals');
  throwOnSupabaseError(postRowsRes.error, 'Failed to load member posts');
  throwOnSupabaseError(usersRes.error, 'Failed to load linked users');
  throwOnSupabaseError(votersRes.error, 'Failed to load linked voters');
  throwOnSupabaseError(mobilesRes.error, 'Failed to load voter mobiles');
  throwOnSupabaseError(whatsappRes.error, 'Failed to load member WhatsApp numbers');

  const verticalLinks = verticalLinksRes.data ?? [];
  const postRows = postRowsRes.data ?? [];
  const verticalIds = [...new Set(verticalLinks.map((row) => String(row.vertical_id)))];
  const positionIds = [...new Set(postRows.map((row) => String(row.position_id)))];
  const geoIds = [
    ...new Set(
      postRows.flatMap((row) => [
        row.taluka_id ? String(row.taluka_id) : null,
        row.ward_geo_id ? String(row.ward_geo_id) : null,
      ]).filter((id): id is string => Boolean(id)),
    ),
  ];

  const geoMeta = await loadGeoMetaForIds(geoIds);

  const [verticalsRes, positionsRes] = await Promise.all([
    verticalIds.length > 0
      ? supabase
          .from(TABLES.cadreVertical)
          .select('id, name, sort_order')
          .in('id', verticalIds)
      : Promise.resolve({ data: [], error: null }),
    positionIds.length > 0
      ? supabase
          .from(TABLES.cadrePosition)
          .select('id, name, sort_order, level_id')
          .in('id', positionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  throwOnSupabaseError(verticalsRes.error, 'Failed to load verticals');
  throwOnSupabaseError(positionsRes.error, 'Failed to load positions');

  const verticalById = new Map(
    (verticalsRes.data ?? []).map((row) => [
      String(row.id),
      {
        id: String(row.id),
        name: String(row.name),
        sortOrder: Number(row.sort_order ?? 0),
      },
    ]),
  );

  const levelIds = [
    ...new Set((positionsRes.data ?? []).map((row) => String(row.level_id))),
  ];
  const levelsRes =
    levelIds.length > 0
      ? await supabase
          .from(TABLES.cadrePositionLevel)
          .select('id, key, name, sort_order')
          .in('id', levelIds)
      : { data: [], error: null };
  throwOnSupabaseError(levelsRes.error, 'Failed to load position levels');

  const levelById = new Map(
    (levelsRes.data ?? []).map((row) => [
      String(row.id),
      {
        key: String(row.key),
        name: String(row.name),
        sortOrder: Number(row.sort_order ?? 0),
      },
    ]),
  );

  const positionById = new Map<string, PositionMeta>();
  for (const row of positionsRes.data ?? []) {
    const level = levelById.get(String(row.level_id));
    positionById.set(String(row.id), {
      name: String(row.name),
      sortOrder: Number(row.sort_order ?? 0),
      levelKey: level?.key ?? '',
      levelName: level?.name ?? '',
      levelSortOrder: level?.sortOrder ?? 0,
    });
  }

  const verticalsByMember = new Map<string, CadreMemberCard['verticals']>();
  for (const link of verticalLinks) {
    const vertical = verticalById.get(String(link.vertical_id));
    if (!vertical) continue;
    const list = verticalsByMember.get(String(link.member_id)) ?? [];
    list.push({
      id: vertical.id,
      name: vertical.name,
      isPrimary: Boolean(link.is_primary),
      sortOrder: vertical.sortOrder,
    });
    verticalsByMember.set(String(link.member_id), list);
  }
  for (const list of verticalsByMember.values()) {
    list.sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
  }

  const postsByMember = new Map<string, CadreMemberCard['posts']>();
  for (const row of postRows) {
    const position = positionById.get(String(row.position_id));
    const list = postsByMember.get(String(row.member_id)) ?? [];
    list.push(
      mapPostRowToDetail(row, position, geoMeta),
    );
    postsByMember.set(String(row.member_id), list);
  }

  const userById = new Map(
    (usersRes.data ?? []).map((row) => [
      String(row.id),
      { id: String(row.id), userId: String(row.user_id) },
    ]),
  );
  const voterByEpic = new Map(
    (votersRes.data ?? []).map((row) => [
      String(row.epic_number),
      {
        epicNumber: String(row.epic_number),
        fullName: String(row.full_name),
        mobile: null as string | null,
      },
    ]),
  );
  for (const row of mobilesRes.data ?? []) {
    const voter = voterByEpic.get(String(row.epic_number));
    if (voter) {
      voter.mobile = row.mobile_number ? String(row.mobile_number) : null;
    }
  }

  const whatsappByMember = new Map(
    (whatsappRes.data ?? []).map((row) => [
      String(row.member_id),
      row.whatsapp_phone ? String(row.whatsapp_phone) : null,
    ]),
  );

  return members.map((member) => ({
    id: member.id,
    constituencyId: member.constituencyId,
    personName: member.personName,
    personPhone: member.personPhone,
    personEmail: member.personEmail,
    photoUrl: member.photoUrl,
    userId: member.userId,
    epicNumber: member.epicNumber,
    notes: member.notes,
    isActive: member.isActive,
    verticals: verticalsByMember.get(member.id) ?? [],
    posts: postsByMember.get(member.id) ?? [],
    linkedUser: member.userId ? userById.get(member.userId) ?? null : null,
    linkedVoter: member.epicNumber ? voterByEpic.get(member.epicNumber) ?? null : null,
    whatsappPhone: whatsappByMember.get(member.id) ?? null,
  }));
}

export type CadreMembersPage = {
  members: CadreMemberCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

async function resolveCadreMemberIdsForVertical(
  verticalId: string,
): Promise<string[] | null> {
  const { data, error } = await supabase
    .from(TABLES.cadreMemberVertical)
    .select('member_id')
    .eq('vertical_id', verticalId);
  throwOnSupabaseError(error, 'Failed to filter members by vertical');
  const memberIds = (data ?? []).map((row) => String(row.member_id));
  return memberIds.length > 0 ? memberIds : null;
}

export async function getCadreMembers(filters: {
  verticalId?: string;
  constituencyId?: string;
}): Promise<CadreMemberCard[]> {
  const memberIds = filters.verticalId
    ? await resolveCadreMemberIdsForVertical(filters.verticalId)
    : undefined;
  if (memberIds === null) return [];

  let query = supabase
    .from(TABLES.cadreMember)
    .select('*')
    .eq('is_active', true)
    .order('person_name', { ascending: true });

  if (memberIds) {
    query = query.in('id', memberIds);
  }
  if (filters.constituencyId) {
    query = query.or(
      `constituency_id.eq.${filters.constituencyId},constituency_id.is.null`,
    );
  }

  const { data, error } = await query;
  throwOnSupabaseError(error, 'Failed to load cadre members');
  return buildMemberCards((data ?? []).map(mapCadreMemberRow));
}

export async function getCadreMembersPaginated(filters: {
  verticalId?: string;
  constituencyId?: string;
  page: number;
  pageSize: number;
  hasEpic?: 'yes' | 'no';
}): Promise<CadreMembersPage> {
  const page = Math.max(1, filters.page);
  const pageSize = Math.max(1, filters.pageSize);

  const memberIds = filters.verticalId
    ? await resolveCadreMemberIdsForVertical(filters.verticalId)
    : undefined;
  if (memberIds === null) {
    return { members: [], total: 0, page, pageSize, totalPages: 1 };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from(TABLES.cadreMember)
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('person_name', { ascending: true });

  if (memberIds) {
    query = query.in('id', memberIds);
  }
  if (filters.constituencyId) {
    query = query.or(
      `constituency_id.eq.${filters.constituencyId},constituency_id.is.null`,
    );
  }
  if (filters.hasEpic === 'yes') {
    query = query.not('epic_number', 'is', null);
  } else if (filters.hasEpic === 'no') {
    query = query.is('epic_number', null);
  }

  const { data, error, count } = await query.range(from, to);
  throwOnSupabaseError(error, 'Failed to load cadre members');
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const members = await buildMemberCards((data ?? []).map(mapCadreMemberRow));

  return { members, total, page, pageSize, totalPages };
}

const POST_FETCH_CHUNK = 100;

function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size));
  }
  return chunks;
}

async function filterMemberIdsByEpicStatus(
  memberIds: Set<string>,
  hasEpic: 'yes' | 'no',
): Promise<Set<string>> {
  if (memberIds.size === 0) return memberIds;

  const matched = new Set<string>();
  for (const chunk of chunkIds([...memberIds], POST_FETCH_CHUNK)) {
    let query = supabase
      .from(TABLES.cadreMember)
      .select('id')
      .in('id', chunk)
      .eq('is_active', true);

    if (hasEpic === 'yes') {
      query = query.not('epic_number', 'is', null);
    } else {
      query = query.is('epic_number', null);
    }

    const { data, error } = await query;
    throwOnSupabaseError(error, 'Failed to filter members by voter ID status');
    for (const row of data ?? []) {
      matched.add(String(row.id));
    }
  }
  return matched;
}

function intersectMemberIdSets(a: Set<string>, b: Set<string>): Set<string> {
  const result = new Set<string>();
  for (const id of a) {
    if (b.has(id)) result.add(id);
  }
  return result;
}

async function loadConstituencyMemberIds(constituencyId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from(TABLES.cadreMember)
    .select('id')
    .eq('is_active', true)
    .or(`constituency_id.eq.${constituencyId},constituency_id.is.null`);
  throwOnSupabaseError(error, 'Failed to load member ids');
  return new Set((data ?? []).map((row) => String(row.id)));
}

async function resolvePostScopedMemberIds(filters: {
  wardGeoId?: string;
  boothNo?: string;
  positionId?: string;
}): Promise<Set<string> | null> {
  if (!filters.wardGeoId && !filters.boothNo && !filters.positionId) return null;

  let postQuery = supabase.from(TABLES.cadreMemberPost).select('member_id');
  if (filters.wardGeoId) {
    postQuery = postQuery.eq('ward_geo_id', filters.wardGeoId);
  }
  if (filters.boothNo) {
    postQuery = postQuery.eq('booth_no', filters.boothNo);
  }
  if (filters.positionId) {
    postQuery = postQuery.eq('position_id', filters.positionId);
  }

  const { data, error } = await postQuery;
  throwOnSupabaseError(error, 'Failed to filter members by post');
  const ids = (data ?? []).map((row) => String(row.member_id));
  return new Set(ids);
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

async function resolveSearchMemberIds(
  query: string,
  constituencyId: string,
  geoUnits: CadreConfig['geoUnits'],
  allowedIds: Set<string>,
): Promise<Set<string>> {
  const trimmed = query.trim();
  if (!trimmed || allowedIds.size === 0) return new Set();

  const matches = new Set<string>();
  const terms = parseSearchTerms(trimmed);
  const qLower = trimmed.toLowerCase();
  const queryDigits = extractSearchDigits(trimmed);
  const ilike = (value: string) => `%${escapeIlikePattern(value)}%`;

  const addIds = (ids: string[]) => {
    for (const id of ids) {
      if (allowedIds.has(id)) matches.add(id);
    }
  };

  const constituencyOr = `constituency_id.eq.${constituencyId},constituency_id.is.null`;

  let memberQuery = supabase
    .from(TABLES.cadreMember)
    .select('id')
    .eq('is_active', true)
    .or(constituencyOr);

  if (terms.length <= 1) {
    memberQuery = memberQuery.or(
      `person_name.ilike.${ilike(qLower)},person_phone.ilike.${ilike(trimmed)},epic_number.ilike.${ilike(qLower)}`,
    );
  } else {
    for (const term of terms) {
      memberQuery = memberQuery.ilike('person_name', ilike(term));
    }
  }

  const { data: memberRows, error: memberError } = await memberQuery;
  throwOnSupabaseError(memberError, 'Failed to search members by profile');
  addIds((memberRows ?? []).map((row) => String(row.id)));

  if (queryDigits.length >= 3) {
    const { data: phoneRows, error: phoneError } = await supabase
      .from(TABLES.cadreMember)
      .select('id')
      .eq('is_active', true)
      .or(constituencyOr)
      .ilike('person_phone', `%${queryDigits}%`);
    throwOnSupabaseError(phoneError, 'Failed to search members by phone');
    addIds((phoneRows ?? []).map((row) => String(row.id)));

    const { data: waRows, error: waError } = await supabase
      .from(TABLES.cadreMemberWhatsApp)
      .select('member_id')
      .ilike('whatsapp_phone', `%${queryDigits}%`);
    throwOnSupabaseError(waError, 'Failed to search members by WhatsApp');
    addIds((waRows ?? []).map((row) => String(row.member_id)));
  }

  const { data: voterRows, error: voterError } = await supabase
    .from(TABLES.voterMaster)
    .select('epic_number')
    .ilike('full_name', ilike(qLower));
  throwOnSupabaseError(voterError, 'Failed to search linked voters by name');
  const voterEpics = (voterRows ?? []).map((row) => String(row.epic_number));
  if (voterEpics.length > 0) {
    for (const chunk of chunkIds(voterEpics, POST_FETCH_CHUNK)) {
      const { data: epicMembers, error: epicError } = await supabase
        .from(TABLES.cadreMember)
        .select('id')
        .eq('is_active', true)
        .or(constituencyOr)
        .in('epic_number', chunk);
      throwOnSupabaseError(epicError, 'Failed to search members by linked voter');
      addIds((epicMembers ?? []).map((row) => String(row.id)));
    }
  }

  if (queryDigits.length >= 3) {
    const { data: mobileRows, error: mobileError } = await supabase
      .from(TABLES.voterMobileNumber)
      .select('epic_number')
      .ilike('mobile_number', `%${queryDigits}%`);
    throwOnSupabaseError(mobileError, 'Failed to search voter mobiles');
    const mobileEpics = [
      ...new Set((mobileRows ?? []).map((row) => String(row.epic_number))),
    ];
    if (mobileEpics.length > 0) {
      for (const chunk of chunkIds(mobileEpics, POST_FETCH_CHUNK)) {
        const { data: mobileMembers, error: mobileMemberError } = await supabase
          .from(TABLES.cadreMember)
          .select('id')
          .eq('is_active', true)
          .or(constituencyOr)
          .in('epic_number', chunk);
        throwOnSupabaseError(mobileMemberError, 'Failed to search members by voter mobile');
        addIds((mobileMembers ?? []).map((row) => String(row.id)));
      }
    }
  }

  if (terms.length === 1) {
    const term = terms[0];
    const { data: labelRows, error: labelError } = await supabase
      .from(TABLES.cadreMemberPost)
      .select('member_id')
      .ilike('label', ilike(term));
    throwOnSupabaseError(labelError, 'Failed to search members by post label');
    addIds((labelRows ?? []).map((row) => String(row.member_id)));

    const { data: positions, error: positionError } = await supabase
      .from(TABLES.cadrePosition)
      .select('id')
      .ilike('name', ilike(term));
    throwOnSupabaseError(positionError, 'Failed to search positions');
    const positionIds = (positions ?? []).map((row) => String(row.id));
    if (positionIds.length > 0) {
      for (const chunk of chunkIds(positionIds, POST_FETCH_CHUNK)) {
        const { data: postRows, error: postError } = await supabase
          .from(TABLES.cadreMemberPost)
          .select('member_id')
          .in('position_id', chunk);
        throwOnSupabaseError(postError, 'Failed to search members by position');
        addIds((postRows ?? []).map((row) => String(row.member_id)));
      }
    }

    const matchingWardIds = geoUnits
      .filter((unit) => unit.type === 'ward' && unit.isActive)
      .filter((unit) => unit.name.toLowerCase().includes(term))
      .map((unit) => unit.id);
    if (matchingWardIds.length > 0) {
      for (const chunk of chunkIds(matchingWardIds, POST_FETCH_CHUNK)) {
        const { data: wardNamePosts, error: wardNameError } = await supabase
          .from(TABLES.cadreMemberPost)
          .select('member_id')
          .in('ward_geo_id', chunk);
        throwOnSupabaseError(wardNameError, 'Failed to search members by ward name');
        addIds((wardNamePosts ?? []).map((row) => String(row.member_id)));
      }
    }
  }

  const wardNumbers = extractWardNumbersFromQuery(trimmed);
  if (wardNumbers.length > 0) {
    const wardGeoIds = geoUnits
      .filter((unit) => unit.type === 'ward' && unit.isActive)
      .filter((unit) => wardNumbers.includes(extractWardNumber(unit.name)))
      .map((unit) => unit.id);
    if (wardGeoIds.length > 0) {
      for (const chunk of chunkIds(wardGeoIds, POST_FETCH_CHUNK)) {
        const { data: wardPosts, error: wardPostError } = await supabase
          .from(TABLES.cadreMemberPost)
          .select('member_id')
          .in('ward_geo_id', chunk);
        throwOnSupabaseError(wardPostError, 'Failed to search members by ward');
        addIds((wardPosts ?? []).map((row) => String(row.member_id)));
      }
    }
  }

  const boothNumbers = extractBoothNumbersFromQuery(trimmed);
  for (const boothNo of boothNumbers) {
    for (const variant of new Set([boothNo, boothNo.padStart(2, '0')])) {
      const { data: boothPosts, error: boothPostError } = await supabase
        .from(TABLES.cadreMemberPost)
        .select('member_id')
        .eq('booth_no', variant);
      throwOnSupabaseError(boothPostError, 'Failed to search members by booth');
      addIds((boothPosts ?? []).map((row) => String(row.member_id)));
    }
  }

  return matches;
}

export async function getCadreMembersPage(filters: {
  constituencyId: string;
  query?: string;
  page: number;
  pageSize: number;
  verticalId?: string;
  positionId?: string;
  wardGeoId?: string;
  boothNo?: string;
  memberId?: string;
  hasEpic?: 'yes' | 'no';
  geoUnits: CadreConfig['geoUnits'];
}): Promise<CadreMembersPage> {
  const page = Math.max(1, filters.page);
  const pageSize = Math.max(1, filters.pageSize);
  const query = filters.query?.trim() ?? '';

  let allowed = await loadConstituencyMemberIds(filters.constituencyId);

  if (filters.memberId) {
    if (!allowed.has(filters.memberId)) {
      return { members: [], total: 0, page, pageSize, totalPages: 1 };
    }
    allowed = new Set([filters.memberId]);
  }

  if (filters.verticalId) {
    const verticalIds = await resolveCadreMemberIdsForVertical(filters.verticalId);
    if (!verticalIds) return { members: [], total: 0, page, pageSize, totalPages: 1 };
    allowed = intersectMemberIdSets(allowed, new Set(verticalIds));
  }

  const postScope = await resolvePostScopedMemberIds({
    wardGeoId: filters.wardGeoId,
    boothNo: filters.boothNo,
    positionId: filters.positionId,
  });
  if (postScope !== null) {
    if (postScope.size === 0) {
      return { members: [], total: 0, page, pageSize, totalPages: 1 };
    }
    allowed = intersectMemberIdSets(allowed, postScope);
  }

  if (allowed.size === 0) {
    return { members: [], total: 0, page, pageSize, totalPages: 1 };
  }

  if (query) {
    if (filters.hasEpic) {
      allowed = await filterMemberIdsByEpicStatus(allowed, filters.hasEpic);
      if (allowed.size === 0) {
        return { members: [], total: 0, page, pageSize, totalPages: 1 };
      }
    }

    allowed = await resolveSearchMemberIds(
      query,
      filters.constituencyId,
      filters.geoUnits,
      allowed,
    );
    if (allowed.size === 0) {
      return { members: [], total: 0, page, pageSize, totalPages: 1 };
    }

    const cards: CadreMemberCard[] = [];
    for (const chunk of chunkIds([...allowed], POST_FETCH_CHUNK)) {
      const { data, error } = await supabase
        .from(TABLES.cadreMember)
        .select('*')
        .in('id', chunk)
        .eq('is_active', true);
      throwOnSupabaseError(error, 'Failed to load searched members');
      cards.push(...(await buildMemberCards((data ?? []).map(mapCadreMemberRow))));
    }

    const sorted = sortMembers(cards);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const members = sorted.slice(start, start + pageSize);

    return { members, total, page: currentPage, pageSize, totalPages };
  }

  const hasScope =
    Boolean(filters.verticalId) ||
    Boolean(filters.wardGeoId) ||
    Boolean(filters.boothNo) ||
    Boolean(filters.positionId) ||
    Boolean(filters.memberId);

  if (!hasScope) {
    return getCadreMembersPaginated({
      constituencyId: filters.constituencyId,
      verticalId: filters.verticalId,
      page,
      pageSize,
      hasEpic: filters.hasEpic,
    });
  }

  if (filters.hasEpic) {
    allowed = await filterMemberIdsByEpicStatus(allowed, filters.hasEpic);
    if (allowed.size === 0) {
      return { members: [], total: 0, page, pageSize, totalPages: 1 };
    }
  }

  const sortedIds = [...allowed].sort();
  const total = sortedIds.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageIds = sortedIds.slice(start, start + pageSize);

  if (pageIds.length === 0) {
    return { members: [], total, page: currentPage, pageSize, totalPages };
  }

  const { data, error } = await supabase
    .from(TABLES.cadreMember)
    .select('*')
    .in('id', pageIds)
    .eq('is_active', true)
    .order('person_name', { ascending: true });
  throwOnSupabaseError(error, 'Failed to load members page');
  const members = await buildMemberCards((data ?? []).map(mapCadreMemberRow));

  return { members, total, page: currentPage, pageSize, totalPages };
}

export async function getCadreMemberById(
  id: string,
): Promise<CadreMemberCard | null> {
  const { data, error } = await supabase
    .from(TABLES.cadreMember)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  throwOnSupabaseError(error, 'Failed to load cadre member');
  if (!data) return null;
  const [card] = await buildMemberCards([mapCadreMemberRow(data)]);
  return card ?? null;
}

export type CadreMemberPostInput = {
  positionId: string;
  talukaId?: string | null;
  wardGeoId?: string | null;
  electionId?: string | null;
  boothNo?: string | null;
  label?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
};

export type CadreMemberInput = {
  constituencyId?: string | null;
  personName?: string | null;
  personPhone?: string | null;
  personEmail?: string | null;
  photoUrl?: string | null;
  userId?: string | null;
  epicNumber?: string | null;
  notes?: string | null;
  appointedAt?: Date | null;
  termEndsAt?: Date | null;
  /** Vertical ids the member belongs to. */
  verticalIds?: string[];
  /** Which vertical id is primary (first badge); defaults to first. */
  primaryVerticalId?: string | null;
  posts?: CadreMemberPostInput[];
  /** WhatsApp number; stored in CadreMemberWhatsApp. */
  whatsappPhone?: string | null;
};

async function resolveMemberPersonFields(
  input: Pick<
    CadreMemberInput,
    'personName' | 'personPhone' | 'personEmail' | 'userId' | 'epicNumber'
  >,
): Promise<{
  personName: string | null;
  personPhone: string | null;
  personEmail: string | null;
}> {
  let personName = input.personName ?? null;
  let personPhone = input.personPhone ?? null;
  let personEmail = input.personEmail ?? null;

  if (input.userId && !personName) {
    const { data: u } = await supabase
      .from(TABLES.user)
      .select('*')
      .eq('id', input.userId)
      .maybeSingle();
    if (u) {
      const mapped = mapUserRow(u);
      personName = personName ?? mapped.userId;
      const meta = mapped.metadata as Record<string, string> | null;
      personPhone = personPhone ?? meta?.phone ?? null;
      personEmail = personEmail ?? meta?.email ?? null;
    }
  }

  if (input.epicNumber && !personName) {
    const { data: v } = await supabase
      .from(TABLES.voterMaster)
      .select('full_name')
      .eq('epic_number', input.epicNumber)
      .maybeSingle();
    if (v) personName = String(v.full_name);
    if (!personPhone) {
      const { data: mobile } = await supabase
        .from(TABLES.voterMobileNumber)
        .select('mobile_number')
        .eq('epic_number', input.epicNumber)
        .eq('sort_order', 1)
        .maybeSingle();
      personPhone = mobile ? String(mobile.mobile_number) : null;
    }
  }

  return { personName, personPhone, personEmail };
}

function buildVerticalRows(memberId: string, input: CadreMemberInput) {
  const ids = [...new Set((input.verticalIds ?? []).filter(Boolean))];
  const primary = input.primaryVerticalId ?? ids[0] ?? null;
  return ids.map((verticalId) => ({
    member_id: memberId,
    vertical_id: verticalId,
    is_primary: verticalId === primary,
  }));
}

function buildPostRows(memberId: string, input: CadreMemberInput) {
  const posts = input.posts ?? [];
  let hasPrimary = posts.some((p) => p.isPrimary);
  return posts.map((post, index) => {
    const isPrimary = post.isPrimary ?? (!hasPrimary && index === 0);
    if (isPrimary) hasPrimary = true;
    return {
      member_id: memberId,
      position_id: post.positionId,
      taluka_id: post.talukaId ?? null,
      ward_geo_id: post.wardGeoId ?? null,
      election_id: post.electionId ?? null,
      booth_no: post.boothNo ?? null,
      label: post.label?.trim() || null,
      is_primary: isPrimary,
      sort_order: post.sortOrder ?? index,
    };
  });
}

async function syncCadreMemberWhatsApp(
  memberId: string,
  input: CadreMemberInput,
  updatedBy: string,
): Promise<void> {
  if (input.whatsappPhone === undefined) return;

  const trimmed = input.whatsappPhone?.trim() || null;
  if (!trimmed) {
    const { error } = await supabase
      .from(TABLES.cadreMemberWhatsApp)
      .delete()
      .eq('member_id', memberId);
    throwOnSupabaseError(error, 'Failed to remove member WhatsApp number');
    return;
  }

  const { error } = await supabase.from(TABLES.cadreMemberWhatsApp).upsert({
    member_id: memberId,
    whatsapp_phone: trimmed,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  });
  throwOnSupabaseError(error, 'Failed to save member WhatsApp number');
}

export async function createCadreMember(
  input: CadreMemberInput,
  createdBy: string,
): Promise<CadreMember> {
  if (!input.personName && !input.userId && !input.epicNumber) {
    throw new Error('Person name, user link, or voter link is required');
  }
  if (!input.verticalIds || input.verticalIds.length === 0) {
    throw new Error('At least one vertical is required');
  }

  const person = await resolveMemberPersonFields(input);

  const { data, error } = await supabase
    .from(TABLES.cadreMember)
    .insert({
      constituency_id: input.constituencyId ?? null,
      person_name: person.personName,
      person_phone: person.personPhone,
      person_email: person.personEmail,
      photo_url: input.photoUrl ?? null,
      user_id: input.userId ?? null,
      epic_number: input.epicNumber ?? null,
      notes: input.notes ?? null,
      appointed_at: input.appointedAt?.toISOString() ?? null,
      term_ends_at: input.termEndsAt?.toISOString() ?? null,
      created_by: createdBy,
      updated_by: createdBy,
    })
    .select()
    .single();
  throwOnSupabaseError(error, 'Failed to create member');
  const member = mapCadreMemberRow(data);

  const verticalRows = buildVerticalRows(member.id, input);
  if (verticalRows.length > 0) {
    const { error: vErr } = await supabase
      .from(TABLES.cadreMemberVertical)
      .insert(verticalRows);
    throwOnSupabaseError(vErr, 'Failed to assign verticals');
  }

  const postRows = buildPostRows(member.id, input);
  if (postRows.length > 0) {
    const { error: pErr } = await supabase
      .from(TABLES.cadreMemberPost)
      .insert(postRows);
    throwOnSupabaseError(pErr, 'Failed to assign posts');
  }

  await syncCadreMemberWhatsApp(member.id, input, createdBy);

  return member;
}

export async function updateCadreMember(
  id: string,
  input: CadreMemberInput,
  updatedBy: string,
): Promise<CadreMember> {
  const { data: existing, error: existingError } = await supabase
    .from(TABLES.cadreMember)
    .select('id, person_name, person_phone, person_email')
    .eq('id', id)
    .maybeSingle();
  throwOnSupabaseError(existingError, 'Failed to load cadre member');
  if (!existing) throw new Error('Member not found');

  const person = await resolveMemberPersonFields(input);

  const patch: Record<string, unknown> = {
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };
  if (input.constituencyId !== undefined) patch.constituency_id = input.constituencyId;
  if (input.personName !== undefined) {
    patch.person_name = input.personName ?? person.personName;
  } else if (person.personName && !existing.person_name) {
    patch.person_name = person.personName;
  }
  if (input.personPhone !== undefined) {
    patch.person_phone = input.personPhone ?? person.personPhone;
  } else if (person.personPhone && !existing.person_phone) {
    patch.person_phone = person.personPhone;
  }
  if (input.personEmail !== undefined) {
    patch.person_email = input.personEmail ?? person.personEmail;
  } else if (person.personEmail && !existing.person_email) {
    patch.person_email = person.personEmail;
  }
  if (input.photoUrl !== undefined) patch.photo_url = input.photoUrl;
  if (input.userId !== undefined) patch.user_id = input.userId;
  if (input.epicNumber !== undefined) patch.epic_number = input.epicNumber;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.appointedAt !== undefined) {
    patch.appointed_at = input.appointedAt?.toISOString() ?? null;
  }
  if (input.termEndsAt !== undefined) {
    patch.term_ends_at = input.termEndsAt?.toISOString() ?? null;
  }

  const { data, error } = await supabase
    .from(TABLES.cadreMember)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  throwOnSupabaseError(error, 'Failed to update member');
  const member = mapCadreMemberRow(data);

  // Replace verticals when provided.
  if (input.verticalIds !== undefined) {
    const { error: delV } = await supabase
      .from(TABLES.cadreMemberVertical)
      .delete()
      .eq('member_id', id);
    throwOnSupabaseError(delV, 'Failed to update verticals');
    const verticalRows = buildVerticalRows(id, input);
    if (verticalRows.length > 0) {
      const { error: insV } = await supabase
        .from(TABLES.cadreMemberVertical)
        .insert(verticalRows);
      throwOnSupabaseError(insV, 'Failed to update verticals');
    }
  }

  // Replace posts when provided.
  if (input.posts !== undefined) {
    const { error: delP } = await supabase
      .from(TABLES.cadreMemberPost)
      .delete()
      .eq('member_id', id);
    throwOnSupabaseError(delP, 'Failed to update posts');
    const postRows = buildPostRows(id, input);
    if (postRows.length > 0) {
      const { error: insP } = await supabase
        .from(TABLES.cadreMemberPost)
        .insert(postRows);
      throwOnSupabaseError(insP, 'Failed to update posts');
    }
  }

  await syncCadreMemberWhatsApp(id, input, updatedBy);

  return member;
}

export async function deleteCadreMember(id: string): Promise<void> {
  const { error } = await supabase.from(TABLES.cadreMember).delete().eq('id', id);
  throwOnSupabaseError(error, 'Failed to delete member');
}

export async function searchUsersForCadre(query: string, limit = 20) {
  const rows = await pgSql`
    SELECT u.id, u.user_id, r.name AS role_name
    FROM "User" u
    LEFT JOIN "Role" r ON u.role_id = r.id
    WHERE u.user_id ILIKE ${`%${query}%`}
    LIMIT ${limit}
  `;
  return rows.map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    roleName: row.role_name ? String(row.role_name) : null,
  }));
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const rows = await pgSql`
    SELECT r.name AS role_name
    FROM "User" u
    LEFT JOIN "Role" r ON u.role_id = r.id
    WHERE u.id = ${userId}
    LIMIT 1
  `;
  return rows[0]?.role_name === 'admin';
}

export async function getBoothsForWard(
  electionId: string,
  wardNo: string,
): Promise<Array<{ boothNo: string; boothName: string | null }>> {
  const rows = await pgSql`
    SELECT DISTINCT csa.booth_no, bm.booth_name
    FROM "CommunityServiceArea" csa
    LEFT JOIN "BoothMaster" bm
      ON bm.election_id = ${electionId}
      AND bm.booth_no::text = csa.booth_no::text
    WHERE csa.ward_no = ${wardNo}
      AND csa.booth_no IS NOT NULL
    ORDER BY csa.booth_no ASC
  `;
  return rows.map((row) => ({
    boothNo: String(row.booth_no),
    boothName: row.booth_name != null ? String(row.booth_name) : null,
  }));
}

export type BroadcastRecipient = {
  memberId: string;
  whatsappPhone: string;
};

export async function getCadreMembersForBroadcast(
  target: CadreWhatsAppBroadcastTarget,
): Promise<{
  recipients: BroadcastRecipient[];
  skippedNoWhatsapp: number;
  matchedMemberCount: number;
}> {
  const empty = {
    recipients: [] as BroadcastRecipient[],
    skippedNoWhatsapp: 0,
    matchedMemberCount: 0,
  };

  let memberIds: Set<string> | null = null;

  if (target.verticalId) {
    const verticalIds = await resolveCadreMemberIdsForVertical(target.verticalId);
    if (!verticalIds || verticalIds.length === 0) return empty;
    memberIds = new Set(verticalIds);
  }

  if (target.wardGeoId || target.boothNo || target.positionId) {
    let postQuery = supabase.from(TABLES.cadreMemberPost).select('member_id');
    if (target.wardGeoId) {
      postQuery = postQuery.eq('ward_geo_id', target.wardGeoId);
    }
    if (target.boothNo) {
      postQuery = postQuery.eq('booth_no', target.boothNo);
    }
    if (target.positionId) {
      postQuery = postQuery.eq('position_id', target.positionId);
    }

    const { data: postRows, error: postError } = await postQuery;
    throwOnSupabaseError(postError, 'Failed to filter members by post');
    const postMemberIds = new Set(
      (postRows ?? []).map((row) => String(row.member_id)),
    );
    if (postMemberIds.size === 0) return empty;
    memberIds = memberIds
      ? intersectMemberIdSets(memberIds, postMemberIds)
      : postMemberIds;
    if (memberIds.size === 0) return empty;
  }

  let memberQuery = supabase.from(TABLES.cadreMember).select('id').eq('is_active', true);
  if (memberIds) {
    memberQuery = memberQuery.in('id', Array.from(memberIds));
  }
  if (target.constituencyId) {
    memberQuery = memberQuery.or(
      `constituency_id.eq.${target.constituencyId},constituency_id.is.null`,
    );
  }

  const { data: memberRows, error: memberError } = await memberQuery;
  throwOnSupabaseError(memberError, 'Failed to load broadcast members');
  const matchedIds = (memberRows ?? []).map((row) => String(row.id));
  if (matchedIds.length === 0) return empty;

  const { data: whatsappRows, error: whatsappError } = await supabase
    .from(TABLES.cadreMemberWhatsApp)
    .select('member_id, whatsapp_phone')
    .in('member_id', matchedIds);
  throwOnSupabaseError(whatsappError, 'Failed to load member WhatsApp numbers');

  const phoneByMember = new Map(
    (whatsappRows ?? []).map((row) => [
      String(row.member_id),
      String(row.whatsapp_phone).trim(),
    ]),
  );

  const recipients: BroadcastRecipient[] = [];
  let skippedNoWhatsapp = 0;
  for (const memberId of matchedIds) {
    const phone = phoneByMember.get(memberId);
    if (!phone) {
      skippedNoWhatsapp += 1;
      continue;
    }
    recipients.push({ memberId, whatsappPhone: phone });
  }

  return {
    recipients,
    skippedNoWhatsapp,
    matchedMemberCount: matchedIds.length,
  };
}

function mapGeoUnitRow(row: {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
}): GeoUnitMeta {
  return {
    id: String(row.id),
    type: String(row.type),
    name: String(row.name),
    parentId: row.parent_id ? String(row.parent_id) : null,
  };
}

async function loadGeoMetaForIds(ids: string[]): Promise<Map<string, GeoUnitMeta>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const map = new Map<string, GeoUnitMeta>();
  for (const chunk of chunkIds(uniqueIds, POST_FETCH_CHUNK)) {
    const { data, error } = await supabase
      .from(TABLES.cadreGeographicUnit)
      .select('id, name, type, parent_id')
      .in('id', chunk);
    throwOnSupabaseError(error, 'Failed to load geographic units');
    for (const row of data ?? []) {
      map.set(String(row.id), mapGeoUnitRow(row));
    }
  }

  const missingParentIds = [
    ...new Set(
      [...map.values()]
        .filter((geo) => geo.type === 'booth' && geo.parentId && !map.has(geo.parentId))
        .map((geo) => geo.parentId as string),
    ),
  ];
  if (missingParentIds.length > 0) {
    const parents = await loadGeoMetaForIds(missingParentIds);
    for (const [id, geo] of parents) map.set(id, geo);
  }

  return map;
}

function mapPostRowToDetail(
  row: {
    id: string | number;
    position_id: string | number;
    taluka_id?: string | number | null;
    ward_geo_id?: string | number | null;
    election_id?: string | number | null;
    booth_no?: string | number | null;
    label?: string | null;
    is_primary?: boolean | null;
    sort_order?: number | null;
  },
  position: PositionMeta | undefined,
  geoMeta: Map<string, GeoUnitMeta>,
): CadreMemberPostDetail {
  const wardGeoId = row.ward_geo_id ? String(row.ward_geo_id) : null;
  const wardGeo = wardGeoId ? geoMeta.get(wardGeoId) : null;
  const post: CadreMemberPostDetail = {
    id: String(row.id),
    positionId: String(row.position_id),
    positionName: position?.name ?? '',
    positionLevelKey: position?.levelKey ?? '',
    positionLevelName: position?.levelName ?? '',
    positionSortOrder: position?.sortOrder ?? 0,
    positionLevelSortOrder: position?.levelSortOrder ?? 0,
    talukaId: row.taluka_id ? String(row.taluka_id) : null,
    talukaName: row.taluka_id ? geoMeta.get(String(row.taluka_id))?.name ?? null : null,
    wardGeoId,
    wardGeoName: wardGeo?.name ?? null,
    electionId: row.election_id ? String(row.election_id) : null,
    boothNo: row.booth_no ? String(row.booth_no) : null,
    label: row.label ? String(row.label) : null,
    isPrimary: Boolean(row.is_primary),
    sortOrder: Number(row.sort_order ?? 0),
  };
  return normalizeBoothScopedPostGeo(post, geoMeta);
}

async function fetchPostRowsForMemberIds(memberIds: string[]) {
  const rows: Record<string, unknown>[] = [];
  for (const chunk of chunkIds(memberIds, POST_FETCH_CHUNK)) {
    const { data, error } = await supabase
      .from(TABLES.cadreMemberPost)
      .select('*')
      .in('member_id', chunk);
    throwOnSupabaseError(error, 'Failed to load member posts');
    rows.push(...(data ?? []));
  }
  return rows;
}

async function mapPostRowsToDetails(
  postRows: Record<string, unknown>[],
): Promise<Map<string, CadreMemberPostDetail[]>> {
  const positionIds = [
    ...new Set(postRows.map((row) => String(row.position_id))),
  ];
  const geoIds = [
    ...new Set(
      postRows
        .flatMap((row) => [
          row.taluka_id ? String(row.taluka_id) : null,
          row.ward_geo_id ? String(row.ward_geo_id) : null,
        ])
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [positionsRes, geoMeta] = await Promise.all([
    positionIds.length > 0
      ? supabase
          .from(TABLES.cadrePosition)
          .select('id, name, sort_order, level_id')
          .in('id', positionIds)
      : Promise.resolve({ data: [], error: null }),
    loadGeoMetaForIds(geoIds),
  ]);
  throwOnSupabaseError(positionsRes.error, 'Failed to load positions');

  const levelIds = [
    ...new Set((positionsRes.data ?? []).map((row) => String(row.level_id))),
  ];
  const levelsRes =
    levelIds.length > 0
      ? await supabase
          .from(TABLES.cadrePositionLevel)
          .select('id, key, name, sort_order')
          .in('id', levelIds)
      : { data: [], error: null };
  throwOnSupabaseError(levelsRes.error, 'Failed to load position levels');

  const levelById = new Map(
    (levelsRes.data ?? []).map((row) => [
      String(row.id),
      {
        key: String(row.key),
        name: String(row.name),
        sortOrder: Number(row.sort_order ?? 0),
      },
    ]),
  );
  const positionById = new Map<string, PositionMeta>();
  for (const row of positionsRes.data ?? []) {
    const level = levelById.get(String(row.level_id));
    positionById.set(String(row.id), {
      name: String(row.name),
      sortOrder: Number(row.sort_order ?? 0),
      levelKey: level?.key ?? '',
      levelName: level?.name ?? '',
      levelSortOrder: level?.sortOrder ?? 0,
    });
  }
  const postsByMember = new Map<string, CadreMemberPostDetail[]>();
  for (const row of postRows) {
    const position = positionById.get(String(row.position_id));
    const list = postsByMember.get(String(row.member_id)) ?? [];
    list.push(
      mapPostRowToDetail(
        row as Parameters<typeof mapPostRowToDetail>[0],
        position,
        geoMeta,
      ),
    );
    postsByMember.set(String(row.member_id), list);
  }

  return postsByMember;
}

export type TalukaLeadershipEntry = {
  verticalId: string;
  head: CadreMemberCard | null;
};

function buildWardSummaries(
  wardGeoIds: string[],
  verticalIds: string[],
  verticalLeadership: {
    verticalId: string;
    wardHeads: HierarchyLeaders['wardHeads'];
  }[],
  geoUnits: CadreConfig['geoUnits'],
  constituencyId: string,
): WardSummary[] {
  const primaryVerticalId = verticalIds[0] ?? '';

  return wardGeoIds.map((wardGeoId) => {
    const boothCount = getBoothGeoUnits(geoUnits, constituencyId, wardGeoId).length;
    const allHeads: CadreMemberCard[] = [];
    let primaryHead: CadreMemberCard | null = null;

    for (const entry of verticalLeadership) {
      const wardHead = entry.wardHeads.find((ward) => ward.wardGeoId === wardGeoId);
      const member = wardHead?.member ?? null;
      if (member) allHeads.push(member);
      if (entry.verticalId === primaryVerticalId) primaryHead = member;
    }

    return {
      wardGeoId,
      boothCount,
      wingsAssigned: allHeads.length,
      wingsTotal: verticalIds.length,
      primaryHead,
      allHeads,
    };
  });
}

export async function getCadreConstituencyLeadership(
  constituencyId: string,
  verticalIds: string[],
  wardGeoIds: string[],
  geoUnits: CadreConfig['geoUnits'],
): Promise<{
  entries: TalukaLeadershipEntry[];
  wardSummaries: WardSummary[];
}> {
  const verticalLeadership = await Promise.all(
    verticalIds.map(async (verticalId) => {
      const leaders = await getCadreHierarchyLeaders({
        constituencyId,
        verticalId,
        wardGeoIds,
      });
      return {
        verticalId,
        talukaHead: leaders.talukaAdhyaksh,
        wardHeads: leaders.wardHeads,
      };
    }),
  );

  return {
    entries: verticalLeadership.map((entry) => ({
      verticalId: entry.verticalId,
      head: entry.talukaHead,
    })),
    wardSummaries: buildWardSummaries(
      wardGeoIds,
      verticalIds,
      verticalLeadership,
      geoUnits,
      constituencyId,
    ),
  };
}

export async function getCadreTalukaLeadershipAllWings(
  constituencyId: string,
  verticalIds: string[],
): Promise<TalukaLeadershipEntry[]> {
  const { entries } = await getCadreConstituencyLeadership(
    constituencyId,
    verticalIds,
    [],
    [],
  );
  return entries;
}

export async function getCadreMembersForWardScope(
  constituencyId: string,
  wardGeoId: string,
): Promise<CadreMemberCard[]> {
  const { data: boothGeoUnits, error: boothGeoError } = await supabase
    .from(TABLES.cadreGeographicUnit)
    .select('id')
    .eq('type', 'booth')
    .eq('parent_id', wardGeoId);
  throwOnSupabaseError(boothGeoError, 'Failed to load ward booth units');

  const scopedGeoIds = [
    wardGeoId,
    ...(boothGeoUnits ?? []).map((row) => String(row.id)),
  ];

  const memberIdSet = new Set<string>();
  for (const chunk of chunkIds(scopedGeoIds, POST_FETCH_CHUNK)) {
    const { data: postRows, error: postError } = await supabase
      .from(TABLES.cadreMemberPost)
      .select('member_id')
      .in('ward_geo_id', chunk);
    throwOnSupabaseError(postError, 'Failed to load ward member posts');
    for (const row of postRows ?? []) {
      memberIdSet.add(String(row.member_id));
    }
  }

  const memberIds = [...memberIdSet];
  if (memberIds.length === 0) return [];

  const memberRows: ReturnType<typeof mapCadreMemberRow>[] = [];
  for (const chunk of chunkIds(memberIds, POST_FETCH_CHUNK)) {
    const { data, error } = await supabase
      .from(TABLES.cadreMember)
      .select('*')
      .in('id', chunk)
      .eq('is_active', true)
      .or(`constituency_id.eq.${constituencyId},constituency_id.is.null`);
    throwOnSupabaseError(error, 'Failed to load ward members');
    for (const row of data ?? []) {
      memberRows.push(mapCadreMemberRow(row));
    }
  }

  return buildMemberCards(memberRows);
}

export async function getCadreCommitteeMembers(filters: {
  constituencyId: string;
  verticalId: string;
  committeeLevel: 'taluka_committee' | 'ward_committee' | 'booth_committee';
  wardGeoId?: string;
  boothNo?: string;
}): Promise<CadreMemberCard[]> {
  const memberIds = await resolveCadreMemberIdsForVertical(filters.verticalId);
  if (!memberIds) return [];

  const postRows = await fetchPostRowsForMemberIds(memberIds);
  const postsByMember = await mapPostRowsToDetails(postRows);
  const committeeMemberIds = new Set<string>();

  for (const [memberId, posts] of postsByMember) {
    const matches = posts.some((post) => {
      if (post.positionLevelKey !== filters.committeeLevel) return false;
      if (filters.committeeLevel === 'ward_committee') {
        return post.wardGeoId === filters.wardGeoId;
      }
      if (filters.committeeLevel === 'booth_committee') {
        return (
          post.wardGeoId === filters.wardGeoId && post.boothNo === filters.boothNo
        );
      }
      return true;
    });
    if (matches) committeeMemberIds.add(memberId);
  }

  if (committeeMemberIds.size === 0) return [];

  const memberRows: ReturnType<typeof mapCadreMemberRow>[] = [];
  for (const chunk of chunkIds([...committeeMemberIds], POST_FETCH_CHUNK)) {
    const { data, error } = await supabase
      .from(TABLES.cadreMember)
      .select('*')
      .in('id', chunk)
      .eq('is_active', true)
      .or(`constituency_id.eq.${filters.constituencyId},constituency_id.is.null`);
    throwOnSupabaseError(error, 'Failed to load committee members');
    for (const row of data ?? []) {
      memberRows.push(mapCadreMemberRow(row));
    }
  }
  return buildMemberCards(memberRows);
}

export async function getCadreHierarchyLeaders(filters: {
  constituencyId: string;
  verticalId: string;
  wardGeoIds: string[];
}): Promise<HierarchyLeaders> {
  const emptyWardHeads = filters.wardGeoIds.map((wardGeoId) => ({
    wardGeoId,
    member: null,
  }));

  const memberIds = await resolveCadreMemberIdsForVertical(filters.verticalId);
  if (!memberIds) {
    return { talukaAdhyaksh: null, wardHeads: emptyWardHeads };
  }

  const postRows = await fetchPostRowsForMemberIds(memberIds);
  const postsByMember = await mapPostRowsToDetails(postRows);
  const stubMembers = buildStubMembersFromPosts(postsByMember, filters.verticalId);
  const resolved = resolveHierarchyLeaders(stubMembers, filters.wardGeoIds);

  const leaderIds = new Set<string>();
  if (resolved.talukaAdhyaksh) leaderIds.add(resolved.talukaAdhyaksh.id);
  for (const ward of resolved.wardHeads) {
    if (ward.member) leaderIds.add(ward.member.id);
  }

  if (leaderIds.size === 0) {
    return { talukaAdhyaksh: null, wardHeads: emptyWardHeads };
  }

  const { data, error } = await supabase
    .from(TABLES.cadreMember)
    .select('*')
    .in('id', Array.from(leaderIds))
    .eq('is_active', true)
    .or(
      `constituency_id.eq.${filters.constituencyId},constituency_id.is.null`,
    );
  throwOnSupabaseError(error, 'Failed to load hierarchy leaders');
  const leaderMembers = await buildMemberCards((data ?? []).map(mapCadreMemberRow));
  const byId = new Map(leaderMembers.map((member) => [member.id, member]));

  return {
    talukaAdhyaksh: resolved.talukaAdhyaksh
      ? byId.get(resolved.talukaAdhyaksh.id) ?? null
      : null,
    wardHeads: resolved.wardHeads.map((ward) => ({
      wardGeoId: ward.wardGeoId,
      member: ward.member ? byId.get(ward.member.id) ?? null : null,
    })),
  };
}

export async function getCadreHierarchyCanvasData(filters: {
  constituencyId: string;
  verticalId: string;
  wardGeoIds: string[];
  geoUnits: CadreConfig['geoUnits'];
}): Promise<HierarchyCanvasData> {
  const emptyWards = filters.wardGeoIds.map((wardGeoId) => ({
    wardGeoId,
    adhyaksh: null,
    committeeMembers: [],
    committeeTotal: 0,
    booths: [],
  }));

  const memberIds = await resolveCadreMemberIdsForVertical(filters.verticalId);
  if (!memberIds) {
    return {
      talukaAdhyaksh: null,
      talukaCommitteeMembers: [],
      talukaCommitteeTotal: 0,
      wards: emptyWards,
    };
  }

  const postRows = await fetchPostRowsForMemberIds(memberIds);
  const postsByMember = await mapPostRowsToDetails(postRows);
  const stubMembers = buildStubMembersFromPosts(postsByMember, filters.verticalId);
  const resolved = resolveHierarchyCanvasData(
    stubMembers,
    filters.verticalId,
    filters.wardGeoIds,
    filters.geoUnits,
    filters.constituencyId,
  );

  const hydrateIds = collectCanvasMemberIds(resolved);
  if (hydrateIds.size === 0) {
    return resolved;
  }

  const { data, error } = await supabase
    .from(TABLES.cadreMember)
    .select('*')
    .in('id', Array.from(hydrateIds))
    .eq('is_active', true)
    .or(
      `constituency_id.eq.${filters.constituencyId},constituency_id.is.null`,
    );
  throwOnSupabaseError(error, 'Failed to load hierarchy canvas members');
  const hydratedMembers = await buildMemberCards((data ?? []).map(mapCadreMemberRow));
  const byId = new Map(hydratedMembers.map((member) => [member.id, member]));

  return hydrateCanvasData(resolved, byId);
}

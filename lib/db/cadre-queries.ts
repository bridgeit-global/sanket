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
  CadreGeographicUnitType,
  CadreMemberCard,
} from '@/lib/hierarchy/types';

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

  const [verticalsRes, positionsRes, geoRes] = await Promise.all([
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
    geoIds.length > 0
      ? supabase
          .from(TABLES.cadreGeographicUnit)
          .select('id, name')
          .in('id', geoIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  throwOnSupabaseError(verticalsRes.error, 'Failed to load verticals');
  throwOnSupabaseError(positionsRes.error, 'Failed to load positions');
  throwOnSupabaseError(geoRes.error, 'Failed to load geographic units');

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

  const geoById = new Map(
    (geoRes.data ?? []).map((row) => [String(row.id), String(row.name)]),
  );

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
    list.push({
      id: String(row.id),
      positionId: String(row.position_id),
      positionName: position?.name ?? '',
      positionLevelKey: position?.levelKey ?? '',
      positionLevelName: position?.levelName ?? '',
      positionSortOrder: position?.sortOrder ?? 0,
      positionLevelSortOrder: position?.levelSortOrder ?? 0,
      talukaId: row.taluka_id ? String(row.taluka_id) : null,
      talukaName: row.taluka_id ? geoById.get(String(row.taluka_id)) ?? null : null,
      wardGeoId: row.ward_geo_id ? String(row.ward_geo_id) : null,
      wardGeoName: row.ward_geo_id ? geoById.get(String(row.ward_geo_id)) ?? null : null,
      electionId: row.election_id ? String(row.election_id) : null,
      boothNo: row.booth_no ? String(row.booth_no) : null,
      label: row.label ? String(row.label) : null,
      isPrimary: Boolean(row.is_primary),
      sortOrder: Number(row.sort_order ?? 0),
    });
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

export async function getCadreMembers(filters: {
  verticalId?: string;
  constituencyId?: string;
}): Promise<CadreMemberCard[]> {
  let memberIds: string[] | undefined;
  if (filters.verticalId) {
    const { data, error } = await supabase
      .from(TABLES.cadreMemberVertical)
      .select('member_id')
      .eq('vertical_id', filters.verticalId);
    throwOnSupabaseError(error, 'Failed to filter members by vertical');
    memberIds = (data ?? []).map((row) => String(row.member_id));
    if (memberIds.length === 0) return [];
  }

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
    .select('id')
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
  patch.person_name = input.personName ?? person.personName;
  patch.person_phone = input.personPhone ?? person.personPhone;
  patch.person_email = input.personEmail ?? person.personEmail;
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

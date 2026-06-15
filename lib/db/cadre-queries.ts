import 'server-only';

import { supabase } from '@/lib/supabase/server';
import { sql as pgSql } from '@/lib/db/postgres';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { TABLES } from './schema';
import {
  mapCadreGeographicUnitRow,
  mapCadreNodeRow,
  mapCadrePositionLevelRow,
  mapCadrePositionRow,
  mapCadreVerticalCategoryRow,
  mapCadreVerticalRow,
  mapUserRow,
} from './mappers';
import type {
  CadreGeographicUnit,
  CadreNode,
  CadrePosition,
  CadrePositionLevel,
  CadreVertical,
  CadreVerticalCategory,
} from './schema';

export type CadreNodeWithDetails = CadreNode & {
  positionName: string;
  positionSortOrder: number;
  positionLevelKey: string;
  positionLevelName: string;
  verticalName: string;
  divisionName: string | null;
  districtName: string | null;
  talukaName: string | null;
  wardGeoName: string | null;
  linkedUser: { id: string; userId: string } | null;
  linkedVoter: { epicNumber: string; fullName: string; mobile: string | null } | null;
};

export async function getCadreConfig() {
  const [categoriesRes, verticalsRes, levelsRes, positionsRes, geoRes] =
    await Promise.all([
      pgSql`
        SELECT id, name, sort_order, is_active, created_at, updated_at
        FROM "CadreVerticalCategory"
        ORDER BY sort_order ASC
      `,
      pgSql`
        SELECT v.id, v.category_id, v.name, v.sort_order, v.is_active, c.name AS category_name
        FROM "CadreVertical" v
        INNER JOIN "CadreVerticalCategory" c ON v.category_id = c.id
        ORDER BY v.sort_order ASC
      `,
      pgSql`
        SELECT id, key, name, sort_order, created_at, updated_at
        FROM "CadrePositionLevel"
        ORDER BY sort_order ASC
      `,
      pgSql`
        SELECT p.id, p.level_id, p.name, p.sort_order, p.is_active, l.key AS level_key, l.name AS level_name
        FROM "CadrePosition" p
        INNER JOIN "CadrePositionLevel" l ON p.level_id = l.id
        ORDER BY p.sort_order ASC
      `,
      pgSql`
        SELECT id, type, name, parent_id, ac_no, sort_order, is_active, created_at, updated_at
        FROM "CadreGeographicUnit"
        ORDER BY sort_order ASC
      `,
    ]);

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
  const [
    verticalsByCategory,
    nodesByVertical,
    positionsByLevel,
    nodesByPosition,
    childGeoByParent,
    geoNodeRows,
  ] = await Promise.all([
    pgSql`
      SELECT category_id, COUNT(*)::int AS total
      FROM "CadreVertical"
      GROUP BY category_id
    `,
    pgSql`
      SELECT vertical_id, COUNT(*)::int AS total
      FROM "CadreNode"
      GROUP BY vertical_id
    `,
    pgSql`
      SELECT level_id, COUNT(*)::int AS total
      FROM "CadrePosition"
      GROUP BY level_id
    `,
    pgSql`
      SELECT position_id, COUNT(*)::int AS total
      FROM "CadreNode"
      GROUP BY position_id
    `,
    pgSql`
      SELECT parent_id, COUNT(*)::int AS total
      FROM "CadreGeographicUnit"
      WHERE parent_id IS NOT NULL
      GROUP BY parent_id
    `,
    pgSql`
      SELECT division_id, district_id, taluka_id, ward_geo_id
      FROM "CadreNode"
    `,
  ]);

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
    for (const geoId of [
      row.division_id,
      row.district_id,
      row.taluka_id,
      row.ward_geo_id,
    ]) {
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
    FROM "CadreNode"
    WHERE vertical_id = ${id}
  `;
  const nodeCount = Number(usage?.total ?? 0);
  if (nodeCount > 0) {
    throw new CadreConfigDeleteError(
      `Cannot delete — ${nodeCount} cadre node${nodeCount === 1 ? '' : 's'} ${nodeCount === 1 ? 'is' : 'are'} assigned to this vertical`,
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
    FROM "CadreNode"
    WHERE position_id = ${id}
  `;
  const nodeCount = Number(usage?.total ?? 0);
  if (nodeCount > 0) {
    throw new CadreConfigDeleteError(
      `Cannot delete — ${nodeCount} cadre node${nodeCount === 1 ? '' : 's'} use this position`,
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
      SELECT division_id, district_id, taluka_id, ward_geo_id
      FROM "CadreNode"
      WHERE division_id = ${id}
        OR district_id = ${id}
        OR taluka_id = ${id}
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
        `${nodeCount} cadre node${nodeCount === 1 ? '' : 's'} ${nodeCount === 1 ? 'is' : 'are'} assigned to ${label}`,
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
  type: 'division' | 'district' | 'taluka' | 'ward';
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

/** When verticalId is omitted, returns the full forest across all active verticals. */
export async function getCadreTree(filters: {
  verticalId?: string;
  constituencyId?: string;
}): Promise<CadreNodeWithDetails[]> {
  const constituencyClause = filters.constituencyId
    ? pgSql`AND (TRIM(n.constituency_id) = ${filters.constituencyId} OR n.constituency_id IS NULL)`
    : pgSql``;

  const verticalClause = filters.verticalId
    ? pgSql`AND n.vertical_id = ${filters.verticalId}`
    : pgSql`AND v.is_active = true`;

  const rows = await pgSql`
    SELECT
      n.*,
      p.name AS position_name,
      p.sort_order AS position_sort_order,
      pl.key AS position_level_key,
      pl.name AS position_level_name,
      v.name AS vertical_name,
      geo_div.name AS division_name,
      geo_dist.name AS district_name,
      geo_tal.name AS taluka_name,
      geo_ward.name AS ward_geo_name,
      u.id AS linked_user_id,
      u.user_id AS linked_user_user_id,
      vm.epic_number AS linked_voter_epic,
      vm.full_name AS linked_voter_name,
      (
        SELECT vmn.mobile_number
        FROM "VoterMobileNumber" vmn
        WHERE vmn.epic_number = n.epic_number AND vmn.sort_order = 1
        LIMIT 1
      ) AS linked_voter_mobile
    FROM "CadreNode" n
    INNER JOIN "CadrePosition" p ON n.position_id = p.id
    INNER JOIN "CadrePositionLevel" pl ON p.level_id = pl.id
    INNER JOIN "CadreVertical" v ON n.vertical_id = v.id
    LEFT JOIN "CadreGeographicUnit" geo_div ON n.division_id = geo_div.id
    LEFT JOIN "CadreGeographicUnit" geo_dist ON n.district_id = geo_dist.id
    LEFT JOIN "CadreGeographicUnit" geo_tal ON n.taluka_id = geo_tal.id
    LEFT JOIN "CadreGeographicUnit" geo_ward ON n.ward_geo_id = geo_ward.id
    LEFT JOIN "User" u ON n.user_id = u.id
    LEFT JOIN "VoterMaster" vm ON n.epic_number = vm.epic_number
    WHERE n.is_active = true
      ${verticalClause}
      ${constituencyClause}
    ORDER BY p.sort_order ASC
  `;

  return rows.map((row) => {
    const node = mapCadreNodeRow(row);
    return {
      ...node,
      positionName: String(row.position_name),
      positionSortOrder: Number(row.position_sort_order),
      positionLevelKey: String(row.position_level_key),
      positionLevelName: String(row.position_level_name),
      verticalName: String(row.vertical_name),
      divisionName: row.division_name ? String(row.division_name) : null,
      districtName: row.district_name ? String(row.district_name) : null,
      talukaName: row.taluka_name ? String(row.taluka_name) : null,
      wardGeoName: row.ward_geo_name ? String(row.ward_geo_name) : null,
      linkedUser: row.linked_user_id
        ? { id: String(row.linked_user_id), userId: String(row.linked_user_user_id) }
        : null,
      linkedVoter: row.linked_voter_epic
        ? {
            epicNumber: String(row.linked_voter_epic),
            fullName: String(row.linked_voter_name),
            mobile: row.linked_voter_mobile ? String(row.linked_voter_mobile) : null,
          }
        : null,
    };
  });
}

export async function getCadreNodeById(id: string): Promise<CadreNodeWithDetails | null> {
  const [data] = await pgSql`
    SELECT vertical_id, constituency_id
    FROM "CadreNode"
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!data) return null;

  const tree = await getCadreTree({
    verticalId: String(data.vertical_id),
    constituencyId: data.constituency_id ? String(data.constituency_id).trim() : undefined,
  });
  return tree.find((n) => n.id === id) ?? null;
}

export type CadreNodeInput = {
  parentId?: string | null;
  verticalId: string;
  positionId: string;
  constituencyId?: string | null;
  divisionId?: string | null;
  districtId?: string | null;
  talukaId?: string | null;
  wardGeoId?: string | null;
  electionId?: string | null;
  boothNo?: string | null;
  personName?: string | null;
  personPhone?: string | null;
  personEmail?: string | null;
  photoUrl?: string | null;
  userId?: string | null;
  epicNumber?: string | null;
  notes?: string | null;
  isVacant?: boolean;
  appointedAt?: Date | null;
  termEndsAt?: Date | null;
};

async function resolvePersonFields(
  input: CadreNodeInput,
): Promise<Pick<CadreNodeInput, 'personName' | 'personPhone' | 'personEmail'>> {
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

export async function createCadreNode(
  input: CadreNodeInput,
  createdBy: string,
): Promise<CadreNode> {
  if (!input.isVacant && !input.personName && !input.userId && !input.epicNumber) {
    throw new Error('Person name, user link, or voter link required for non-vacant nodes');
  }

  const person = await resolvePersonFields(input);

  const { data, error } = await supabase
    .from(TABLES.cadreNode)
    .insert({
      parent_id: input.parentId ?? null,
      vertical_id: input.verticalId,
      position_id: input.positionId,
      constituency_id: input.constituencyId ?? null,
      division_id: input.divisionId ?? null,
      district_id: input.districtId ?? null,
      taluka_id: input.talukaId ?? null,
      ward_geo_id: input.wardGeoId ?? null,
      election_id: input.electionId ?? null,
      booth_no: input.boothNo ?? null,
      person_name: person.personName,
      person_phone: person.personPhone,
      person_email: person.personEmail,
      photo_url: input.photoUrl ?? null,
      user_id: input.userId ?? null,
      epic_number: input.epicNumber ?? null,
      notes: input.notes ?? null,
      is_vacant: input.isVacant ?? false,
      appointed_at: input.appointedAt?.toISOString() ?? null,
      term_ends_at: input.termEndsAt?.toISOString() ?? null,
      created_by: createdBy,
      updated_by: createdBy,
    })
    .select()
    .single();
  throwOnSupabaseError(error, 'Failed to create cadre node');
  return mapCadreNodeRow(data);
}

export async function updateCadreNode(
  id: string,
  input: Partial<CadreNodeInput>,
  updatedBy: string,
): Promise<CadreNode> {
  const person = await resolvePersonFields({
    verticalId: '',
    positionId: '',
    ...input,
  });

  const patch: Record<string, unknown> = {
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
    person_name: input.personName ?? person.personName,
    person_phone: input.personPhone ?? person.personPhone,
    person_email: input.personEmail ?? person.personEmail,
  };

  if (input.parentId !== undefined) patch.parent_id = input.parentId;
  if (input.verticalId) patch.vertical_id = input.verticalId;
  if (input.positionId) patch.position_id = input.positionId;
  if (input.constituencyId !== undefined) patch.constituency_id = input.constituencyId;
  if (input.divisionId !== undefined) patch.division_id = input.divisionId;
  if (input.districtId !== undefined) patch.district_id = input.districtId;
  if (input.talukaId !== undefined) patch.taluka_id = input.talukaId;
  if (input.wardGeoId !== undefined) patch.ward_geo_id = input.wardGeoId;
  if (input.electionId !== undefined) patch.election_id = input.electionId;
  if (input.boothNo !== undefined) patch.booth_no = input.boothNo;
  if (input.photoUrl !== undefined) patch.photo_url = input.photoUrl;
  if (input.userId !== undefined) patch.user_id = input.userId;
  if (input.epicNumber !== undefined) patch.epic_number = input.epicNumber;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.isVacant !== undefined) patch.is_vacant = input.isVacant;
  if (input.appointedAt !== undefined) {
    patch.appointed_at = input.appointedAt?.toISOString() ?? null;
  }
  if (input.termEndsAt !== undefined) {
    patch.term_ends_at = input.termEndsAt?.toISOString() ?? null;
  }

  const { data, error } = await supabase
    .from(TABLES.cadreNode)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  throwOnSupabaseError(error, 'Failed to update cadre node');
  return mapCadreNodeRow(data);
}

export async function deleteCadreNode(id: string): Promise<void> {
  const { data: children, error: childError } = await supabase
    .from(TABLES.cadreNode)
    .select('id')
    .eq('parent_id', id)
    .limit(1);
  throwOnSupabaseError(childError, 'Failed to check cadre node children');
  if ((children ?? []).length > 0) {
    throw new Error('Cannot delete node with subordinates');
  }
  const { error } = await supabase.from(TABLES.cadreNode).delete().eq('id', id);
  throwOnSupabaseError(error, 'Failed to delete cadre node');
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

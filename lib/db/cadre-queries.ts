import 'server-only';

import { and, asc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import {
  cadreGeographicUnit,
  cadreNode,
  cadrePosition,
  cadrePositionLevel,
  cadreVertical,
  cadreVerticalCategory,
  role,
  user,
  VoterMaster,
  voterMobileNumber,
  type CadreGeographicUnit,
  type CadreNode,
  type CadrePosition,
  type CadreVertical,
  type CadreVerticalCategory,
} from './schema';
import { db } from './client';

export type CadreNodeWithDetails = CadreNode & {
  positionName: string;
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
  const [categories, verticals, levels, positions, geoUnits] = await Promise.all([
    db.select().from(cadreVerticalCategory).orderBy(asc(cadreVerticalCategory.sortOrder)),
    db
      .select({
        id: cadreVertical.id,
        categoryId: cadreVertical.categoryId,
        name: cadreVertical.name,
        sortOrder: cadreVertical.sortOrder,
        isActive: cadreVertical.isActive,
        categoryName: cadreVerticalCategory.name,
      })
      .from(cadreVertical)
      .innerJoin(cadreVerticalCategory, eq(cadreVertical.categoryId, cadreVerticalCategory.id))
      .orderBy(asc(cadreVertical.sortOrder)),
    db.select().from(cadrePositionLevel).orderBy(asc(cadrePositionLevel.sortOrder)),
    db
      .select({
        id: cadrePosition.id,
        levelId: cadrePosition.levelId,
        name: cadrePosition.name,
        sortOrder: cadrePosition.sortOrder,
        isActive: cadrePosition.isActive,
        levelKey: cadrePositionLevel.key,
        levelName: cadrePositionLevel.name,
      })
      .from(cadrePosition)
      .innerJoin(cadrePositionLevel, eq(cadrePosition.levelId, cadrePositionLevel.id))
      .orderBy(asc(cadrePosition.sortOrder)),
    db.select().from(cadreGeographicUnit).orderBy(asc(cadreGeographicUnit.sortOrder)),
  ]);

  return { categories, verticals, levels, positions, geoUnits };
}

export async function upsertCadreVerticalCategory(data: {
  id?: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<CadreVerticalCategory> {
  if (data.id) {
    const [row] = await db
      .update(cadreVerticalCategory)
      .set({
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(cadreVerticalCategory.id, data.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(cadreVerticalCategory)
    .values({
      name: data.name,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    })
    .returning();
  return row;
}

export async function upsertCadreVertical(data: {
  id?: string;
  categoryId: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<CadreVertical> {
  if (data.id) {
    const [row] = await db
      .update(cadreVertical)
      .set({
        categoryId: data.categoryId,
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(cadreVertical.id, data.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(cadreVertical)
    .values({
      categoryId: data.categoryId,
      name: data.name,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    })
    .returning();
  return row;
}

export async function upsertCadrePosition(data: {
  id?: string;
  levelId: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<CadrePosition> {
  if (data.id) {
    const [row] = await db
      .update(cadrePosition)
      .set({
        levelId: data.levelId,
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(cadrePosition.id, data.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(cadrePosition)
    .values({
      levelId: data.levelId,
      name: data.name,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    })
    .returning();
  return row;
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
  if (data.id) {
    const [row] = await db
      .update(cadreGeographicUnit)
      .set({
        type: data.type,
        name: data.name,
        parentId: data.parentId ?? null,
        acNo: data.acNo ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(cadreGeographicUnit.id, data.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(cadreGeographicUnit)
    .values({
      type: data.type,
      name: data.name,
      parentId: data.parentId ?? null,
      acNo: data.acNo ?? null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    })
    .returning();
  return row;
}

export async function getCadreTree(filters: {
  verticalId: string;
  constituencyId?: string;
}): Promise<CadreNodeWithDetails[]> {
  const constituencyFilter = filters.constituencyId
    ? or(
        eq(cadreNode.constituencyId, filters.constituencyId),
        isNull(cadreNode.constituencyId),
      )
    : undefined;

  const [rows, geoUnits] = await Promise.all([
    db
      .select({
        node: cadreNode,
        positionName: cadrePosition.name,
        positionLevelKey: cadrePositionLevel.key,
        positionLevelName: cadrePositionLevel.name,
        verticalName: cadreVertical.name,
        linkedUserId: user.id,
        linkedUserUserId: user.userId,
        linkedVoterEpic: VoterMaster.epicNumber,
        linkedVoterName: VoterMaster.fullName,
        linkedVoterMobile: sql<string | null>`(
          select ${voterMobileNumber.mobileNumber}
          from ${voterMobileNumber}
          where ${voterMobileNumber.epicNumber} = ${cadreNode.epicNumber}
            and ${voterMobileNumber.sortOrder} = 1
          limit 1
        )`,
      })
      .from(cadreNode)
      .innerJoin(cadrePosition, eq(cadreNode.positionId, cadrePosition.id))
      .innerJoin(cadrePositionLevel, eq(cadrePosition.levelId, cadrePositionLevel.id))
      .innerJoin(cadreVertical, eq(cadreNode.verticalId, cadreVertical.id))
      .leftJoin(user, eq(cadreNode.userId, user.id))
      .leftJoin(VoterMaster, eq(cadreNode.epicNumber, VoterMaster.epicNumber))
      .where(
        and(
          eq(cadreNode.verticalId, filters.verticalId),
          eq(cadreNode.isActive, true),
          constituencyFilter,
        ),
      )
      .orderBy(asc(cadrePosition.sortOrder)),
    db.select().from(cadreGeographicUnit),
  ]);

  const geoMap = new Map(geoUnits.map((g) => [g.id, g.name]));

  return rows.map((row) => ({
    ...row.node,
    positionName: row.positionName,
    positionLevelKey: row.positionLevelKey,
    positionLevelName: row.positionLevelName,
    verticalName: row.verticalName,
    divisionName: row.node.divisionId ? geoMap.get(row.node.divisionId) ?? null : null,
    districtName: row.node.districtId ? geoMap.get(row.node.districtId) ?? null : null,
    talukaName: row.node.talukaId ? geoMap.get(row.node.talukaId) ?? null : null,
    wardGeoName: row.node.wardGeoId ? geoMap.get(row.node.wardGeoId) ?? null : null,
    linkedUser: row.linkedUserId
      ? { id: row.linkedUserId, userId: row.linkedUserUserId! }
      : null,
    linkedVoter: row.linkedVoterEpic
      ? {
          epicNumber: row.linkedVoterEpic,
          fullName: row.linkedVoterName!,
          mobile: row.linkedVoterMobile,
        }
      : null,
  }));
}

export async function getCadreNodeById(id: string): Promise<CadreNodeWithDetails | null> {
  const [base] = await db
    .select({ verticalId: cadreNode.verticalId, constituencyId: cadreNode.constituencyId })
    .from(cadreNode)
    .where(eq(cadreNode.id, id))
    .limit(1);
  if (!base) return null;
  const tree = await getCadreTree({
    verticalId: base.verticalId,
    constituencyId: base.constituencyId ?? undefined,
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
    const [u] = await db.select().from(user).where(eq(user.id, input.userId)).limit(1);
    if (u) {
      personName = personName ?? u.userId;
      const meta = u.metadata as Record<string, string> | null;
      personPhone = personPhone ?? meta?.phone ?? null;
      personEmail = personEmail ?? meta?.email ?? null;
    }
  }

  if (input.epicNumber && !personName) {
    const [v] = await db
      .select({ fullName: VoterMaster.fullName })
      .from(VoterMaster)
      .where(eq(VoterMaster.epicNumber, input.epicNumber))
      .limit(1);
    if (v) personName = v.fullName;
    if (!personPhone) {
      const [mobile] = await db
        .select({ mobileNumber: voterMobileNumber.mobileNumber })
        .from(voterMobileNumber)
        .where(
          and(
            eq(voterMobileNumber.epicNumber, input.epicNumber),
            eq(voterMobileNumber.sortOrder, 1),
          ),
        )
        .limit(1);
      personPhone = mobile?.mobileNumber ?? null;
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

  const [row] = await db
    .insert(cadreNode)
    .values({
      parentId: input.parentId ?? null,
      verticalId: input.verticalId,
      positionId: input.positionId,
      constituencyId: input.constituencyId ?? null,
      divisionId: input.divisionId ?? null,
      districtId: input.districtId ?? null,
      talukaId: input.talukaId ?? null,
      wardGeoId: input.wardGeoId ?? null,
      electionId: input.electionId ?? null,
      boothNo: input.boothNo ?? null,
      personName: person.personName,
      personPhone: person.personPhone,
      personEmail: person.personEmail,
      photoUrl: input.photoUrl ?? null,
      userId: input.userId ?? null,
      epicNumber: input.epicNumber ?? null,
      notes: input.notes ?? null,
      isVacant: input.isVacant ?? false,
      appointedAt: input.appointedAt ?? null,
      termEndsAt: input.termEndsAt ?? null,
      createdBy,
      updatedBy: createdBy,
    })
    .returning();
  return row;
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

  const [row] = await db
    .update(cadreNode)
    .set({
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.verticalId ? { verticalId: input.verticalId } : {}),
      ...(input.positionId ? { positionId: input.positionId } : {}),
      ...(input.constituencyId !== undefined ? { constituencyId: input.constituencyId } : {}),
      ...(input.divisionId !== undefined ? { divisionId: input.divisionId } : {}),
      ...(input.districtId !== undefined ? { districtId: input.districtId } : {}),
      ...(input.talukaId !== undefined ? { talukaId: input.talukaId } : {}),
      ...(input.wardGeoId !== undefined ? { wardGeoId: input.wardGeoId } : {}),
      ...(input.electionId !== undefined ? { electionId: input.electionId } : {}),
      ...(input.boothNo !== undefined ? { boothNo: input.boothNo } : {}),
      ...(input.personName !== undefined ? { personName: input.personName } : {}),
      ...(input.personPhone !== undefined ? { personPhone: input.personPhone } : {}),
      ...(input.personEmail !== undefined ? { personEmail: input.personEmail } : {}),
      ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl } : {}),
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
      ...(input.epicNumber !== undefined ? { epicNumber: input.epicNumber } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.isVacant !== undefined ? { isVacant: input.isVacant } : {}),
      ...(input.appointedAt !== undefined ? { appointedAt: input.appointedAt } : {}),
      ...(input.termEndsAt !== undefined ? { termEndsAt: input.termEndsAt } : {}),
      personName: input.personName ?? person.personName,
      personPhone: input.personPhone ?? person.personPhone,
      personEmail: input.personEmail ?? person.personEmail,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(cadreNode.id, id))
    .returning();
  return row;
}

export async function deleteCadreNode(id: string): Promise<void> {
  const children = await db
    .select({ id: cadreNode.id })
    .from(cadreNode)
    .where(eq(cadreNode.parentId, id))
    .limit(1);
  if (children.length > 0) {
    throw new Error('Cannot delete node with subordinates');
  }
  await db.delete(cadreNode).where(eq(cadreNode.id, id));
}

export async function searchUsersForCadre(query: string, limit = 20) {
  return db
    .select({
      id: user.id,
      userId: user.userId,
      roleName: role.name,
    })
    .from(user)
    .leftJoin(role, eq(user.roleId, role.id))
    .where(ilike(user.userId, `%${query}%`))
    .limit(limit);
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ roleName: role.name })
    .from(user)
    .leftJoin(role, eq(user.roleId, role.id))
    .where(eq(user.id, userId))
    .limit(1);
  return row?.roleName === 'admin';
}

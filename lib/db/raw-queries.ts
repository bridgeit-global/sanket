import 'server-only';

import { sql as pgSql } from './postgres';
import { TABLES } from './schema';
import { getCurrentElectionId } from './election';
import {
  mapBeneficiaryServiceRow,
  mapDailyProgrammeRow,
  mapVoterMasterRow,
} from './mappers';
import { ChatSDKError } from '../errors';
import { startOfDayIST } from '@/lib/ist-date';
import type {
  BeneficiaryService,
  DailyProgramme,
  ElectionMapping,
  VoterMaster,
  VoterWithPartNo,
  VoterTask,
} from './schema';
import {
  getBoothToWardMap,
  getBoothWardMap,
} from '@/lib/ai/data/booth-ward-from-election';
import { normalizePartNo } from '@/lib/ai/data/form20-172-2024';

export type BasicVoterWithBooth = {
  epicNumber: string;
  fullName: string;
  relationType: string | null;
  relationName: string | null;
  familyGrouping: string | null;
  boothNo: string | null;
  srNo: string | null;
  houseNumber: string | null;
  religion: string | null;
  age: number | null;
  dob: string | null;
  gender: string | null;
  isVoted2024: boolean | null;
  address: string | null;
  localityStreet: string | null;
  townVillage: string | null;
  pincode: string | null;
};

export type VoterSearchPagination = {
  limit?: number;
  offset?: number;
};

export type VotingHistoryWithBooth = Pick<
  ElectionMapping,
  'epicNumber' | 'electionId' | 'hasVoted'
> & {
  boothName: string | null;
  boothAddress: string | null;
  boothNo: string | null;
  srNo: string | null;
  electionYear: number | null;
  electionType: string | null;
};

const FUZZY_NAME_SIMILARITY_THRESHOLD = 0.25;

let voterMasterHasCasteColumn: boolean | null = null;

export async function supportsVoterMasterCasteColumn(): Promise<boolean> {
  if (voterMasterHasCasteColumn !== null) {
    return voterMasterHasCasteColumn;
  }
  try {
    const result = await pgSql`
      SELECT 1
      FROM information_schema.columns
      WHERE lower(table_name) = lower('VoterMaster')
        AND lower(column_name) = lower('caste')
      LIMIT 1
    `;
    voterMasterHasCasteColumn = result.length > 0;
  } catch (error) {
    console.warn('Failed to check VoterMaster caste column:', error);
    voterMasterHasCasteColumn = false;
  }
  return voterMasterHasCasteColumn;
}

function isMissingColumnError(error: unknown, columnName: string): boolean {
  const errorCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: string }).code
      : undefined;
  if (errorCode === '42703') {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes(`column "${columnName}"`) &&
    message.includes('does not exist')
  );
}

function mapBasicVoterRow(row: Record<string, unknown>): BasicVoterWithBooth {
  return {
    epicNumber: String(row.epic_number),
    fullName: String(row.full_name),
    relationType: row.relation_type != null ? String(row.relation_type) : null,
    relationName: row.relation_name != null ? String(row.relation_name) : null,
    familyGrouping:
      row.family_grouping != null ? String(row.family_grouping) : null,
    boothNo: row.booth_no != null ? String(row.booth_no) : null,
    srNo: row.sr_no != null ? String(row.sr_no) : null,
    houseNumber: row.house_number != null ? String(row.house_number) : null,
    religion: row.religion != null ? String(row.religion) : null,
    age: row.age != null ? Number(row.age) : null,
    dob: row.dob != null ? String(row.dob) : null,
    gender: row.gender != null ? String(row.gender) : null,
    isVoted2024: row.is_voted_2024 != null ? Boolean(row.is_voted_2024) : null,
    address: row.address != null ? String(row.address) : null,
    localityStreet:
      row.locality_street != null ? String(row.locality_street) : null,
    townVillage: row.town_village != null ? String(row.town_village) : null,
    pincode: row.pincode != null ? String(row.pincode) : null,
  };
}

function mapVoterWithPartNoRow(row: Record<string, unknown>): VoterWithPartNo {
  const basic = mapBasicVoterRow(row);
  return {
    ...basic,
    partNo: basic.boothNo,
    wardNo: row.ward_no != null ? String(row.ward_no) : null,
    boothName: row.booth_name != null ? String(row.booth_name) : null,
    englishBoothAddress:
      row.english_booth_address != null
        ? String(row.english_booth_address)
        : null,
  } as VoterWithPartNo;
}

const BASIC_VOTER_SELECT = pgSql`
  vm.epic_number,
  vm.full_name,
  vm.relation_type,
  vm.relation_name,
  vm.family_grouping,
  em.booth_no,
  em.sr_no,
  vm.house_number,
  vm.religion,
  vm.age,
  vm.dob,
  vm.gender,
  em.has_voted AS is_voted_2024,
  vm.address,
  vm.locality_street,
  vm.town_village,
  vm.pincode
`;

const VOTER_MASTER_SEARCH_SELECT = pgSql`
  vm.epic_number,
  vm.full_name,
  vm.relation_type,
  vm.relation_name,
  vm.family_grouping,
  vm.house_number,
  vm.religion,
  vm.age,
  vm.dob,
  vm.gender,
  vm.address,
  vm.locality_street,
  vm.town_village,
  vm.pincode
`;

function fuzzyNameWhere(name: string) {
  const trimmed = name.trim();
  const likePattern = `%${trimmed}%`;
  return pgSql`(
    LOWER(vm.full_name) LIKE LOWER(${likePattern})
    OR similarity(LOWER(vm.full_name), LOWER(${trimmed})) > ${FUZZY_NAME_SIMILARITY_THRESHOLD}
  )`;
}

function fuzzyNameOrder(name: string) {
  const trimmed = name.trim();
  return pgSql`similarity(LOWER(vm.full_name), LOWER(${trimmed})) DESC`;
}

export async function getAllVoter(
  electionId?: string,
): Promise<Array<BasicVoterWithBooth>> {
  try {
    const currentElectionId = electionId || (await getCurrentElectionId());
    const rows = await pgSql`
      SELECT ${BASIC_VOTER_SELECT}
      FROM "VoterMaster" vm
      LEFT JOIN "ElectionMapping" em
        ON vm.epic_number = em.epic_number
        AND em.election_id = ${currentElectionId}
      LEFT JOIN "BoothMaster" bm
        ON em.election_id = bm.election_id
        AND em.booth_no = bm.booth_no
      ORDER BY vm.full_name ASC
    `;
    return rows.map((row) => mapBasicVoterRow(row as Record<string, unknown>));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get all voters');
  }
}

export async function getVoterByAC(
  acNo: string,
  electionId?: string,
): Promise<Array<BasicVoterWithBooth>> {
  try {
    const currentElectionId = electionId || (await getCurrentElectionId());
    const rows = await pgSql`
      SELECT ${BASIC_VOTER_SELECT}
      FROM "VoterMaster" vm
      INNER JOIN "ElectionMapping" em
        ON vm.epic_number = em.epic_number
        AND em.election_id = ${currentElectionId}
      INNER JOIN "ElectionMaster" em2
        ON em.election_id = em2.election_id
        AND em2.constituency_type = 'assembly'
        AND em2.constituency_id = ${acNo}
      ORDER BY vm.full_name ASC
    `;
    return rows.map((row) => mapBasicVoterRow(row as Record<string, unknown>));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by AC number',
    );
  }
}

export async function getVoterByWard(
  wardNo: string,
  electionId?: string,
): Promise<Array<VoterWithPartNo>> {
  try {
    const currentElectionId = electionId || (await getCurrentElectionId());
    const rows = await pgSql`
      SELECT
        ${BASIC_VOTER_SELECT},
        csa.ward_no,
        bm.booth_name,
        bm.booth_address AS english_booth_address
      FROM "VoterMaster" vm
      INNER JOIN "ElectionMapping" em
        ON vm.epic_number = em.epic_number
        AND em.election_id = ${currentElectionId}
      INNER JOIN "BoothMaster" bm
        ON em.election_id = bm.election_id
        AND em.booth_no = bm.booth_no
      INNER JOIN "CommunityServiceArea" csa
        ON em.booth_no = csa.booth_no
        AND csa.ward_no = ${wardNo}
      ORDER BY vm.full_name ASC
    `;
    return rows.map((row) =>
      mapVoterWithPartNoRow(row as Record<string, unknown>),
    );
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by ward number',
    );
  }
}

export async function getVoterByPart(
  partNo: string,
  electionId?: string,
): Promise<Array<BasicVoterWithBooth>> {
  try {
    const currentElectionId = electionId || (await getCurrentElectionId());
    const rows = await pgSql`
      SELECT ${BASIC_VOTER_SELECT}
      FROM "VoterMaster" vm
      INNER JOIN "ElectionMapping" em
        ON vm.epic_number = em.epic_number
        AND em.election_id = ${currentElectionId}
        AND em.booth_no = ${partNo}
      LEFT JOIN "BoothMaster" bm
        ON em.election_id = bm.election_id
        AND em.booth_no = bm.booth_no
      ORDER BY vm.full_name ASC
    `;
    return rows.map((row) => mapBasicVoterRow(row as Record<string, unknown>));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by part number',
    );
  }
}

export async function getVoterEpicByPartAndSerial(
  partNo: string,
  srNo: string,
  electionId?: string,
): Promise<string | null> {
  try {
    const currentElectionId = electionId || (await getCurrentElectionId());
    const normalizedPartNo = partNo.trim();
    const normalizedSrNo = srNo.trim();
    if (!normalizedPartNo || !normalizedSrNo) return null;

    const srCandidates = Array.from(
      new Set([
        normalizedSrNo,
        normalizedSrNo.replace(/^0+/, '') || '0',
        normalizedSrNo.padStart(5, '0'),
      ]),
    );

    const rows = await pgSql`
      SELECT vm.epic_number
      FROM "VoterMaster" vm
      INNER JOIN "ElectionMapping" em
        ON vm.epic_number = em.epic_number
        AND em.election_id = ${currentElectionId}
        AND em.booth_no = ${normalizedPartNo}
        AND em.sr_no = ANY(${srCandidates})
      LIMIT 2
    `;

    if (rows.length !== 1) return null;
    return rows[0]?.epic_number != null ? String(rows[0].epic_number) : null;
  } catch (error) {
    console.error('Error getting voter by part and serial:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter by part and serial number',
    );
  }
}

export async function getVoterByBooth(
  boothName: string,
  electionId?: string,
): Promise<Array<VoterWithPartNo>> {
  try {
    const currentElectionId = electionId || (await getCurrentElectionId());
    const rows = await pgSql`
      SELECT
        ${BASIC_VOTER_SELECT},
        csa.ward_no,
        bm.booth_name,
        bm.booth_address AS english_booth_address
      FROM "VoterMaster" vm
      INNER JOIN "ElectionMapping" em
        ON vm.epic_number = em.epic_number
        AND em.election_id = ${currentElectionId}
      INNER JOIN "BoothMaster" bm
        ON em.election_id = bm.election_id
        AND em.booth_no = bm.booth_no
        AND bm.booth_name = ${boothName}
      LEFT JOIN "CommunityServiceArea" csa
        ON em.booth_no = csa.booth_no
      ORDER BY vm.full_name ASC
    `;
    return rows.map((row) =>
      mapVoterWithPartNoRow(row as Record<string, unknown>),
    );
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by booth name',
    );
  }
}

export async function searchVoterByEpicNumber(
  epicNumber: string,
  _electionId?: string,
  pagination?: VoterSearchPagination,
): Promise<Array<VoterMaster>> {
  try {
    const pattern = `%${epicNumber}%`;
    const limit = pagination?.limit;
    const offset = pagination?.offset ?? 0;

    const rows =
      limit != null
        ? await pgSql`
            SELECT ${VOTER_MASTER_SEARCH_SELECT}
            FROM "VoterMaster" vm
            WHERE LOWER(vm.epic_number) LIKE LOWER(${pattern})
            ORDER BY vm.epic_number ASC
            LIMIT ${limit}
            OFFSET ${offset}
          `
        : await pgSql`
            SELECT ${VOTER_MASTER_SEARCH_SELECT}
            FROM "VoterMaster" vm
            WHERE LOWER(vm.epic_number) LIKE LOWER(${pattern})
            ORDER BY vm.epic_number ASC
          `;

    return rows.map((row) => mapVoterMasterRow(row as Record<string, unknown>));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search voters by EPIC number',
    );
  }
}

export async function countSearchVoterByEpicNumber(
  epicNumber: string,
): Promise<number> {
  try {
    const pattern = `%${epicNumber}%`;
    const [row] = await pgSql`
      SELECT COUNT(*)::int AS c
      FROM "VoterMaster" vm
      WHERE LOWER(vm.epic_number) LIKE LOWER(${pattern})
    `;
    return Number(row?.c ?? 0);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to count voters by EPIC number',
    );
  }
}

export async function searchVoterByName(
  name: string,
  _electionId?: string,
  pagination?: VoterSearchPagination,
): Promise<Array<VoterMaster>> {
  try {
    const limit = pagination?.limit;
    const offset = pagination?.offset ?? 0;

    const rows =
      limit != null
        ? await pgSql`
            SELECT ${VOTER_MASTER_SEARCH_SELECT}
            FROM "VoterMaster" vm
            WHERE ${fuzzyNameWhere(name)}
            ORDER BY ${fuzzyNameOrder(name)}, vm.full_name ASC
            LIMIT ${limit}
            OFFSET ${offset}
          `
        : await pgSql`
            SELECT ${VOTER_MASTER_SEARCH_SELECT}
            FROM "VoterMaster" vm
            WHERE ${fuzzyNameWhere(name)}
            ORDER BY ${fuzzyNameOrder(name)}, vm.full_name ASC
          `;

    return rows.map((row) => mapVoterMasterRow(row as Record<string, unknown>));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search voters by name',
    );
  }
}

export async function countSearchVoterByName(name: string): Promise<number> {
  try {
    const [row] = await pgSql`
      SELECT COUNT(*)::int AS c
      FROM "VoterMaster" vm
      WHERE ${fuzzyNameWhere(name)}
    `;
    return Number(row?.c ?? 0);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to count voters by name',
    );
  }
}

export async function searchVoterByPhoneNumber(
  phoneNumber: string,
): Promise<Array<VoterMaster>> {
  try {
    const cleanPhone = phoneNumber.replace(/[\s\-()]/g, '');
    const pattern = `%${cleanPhone}%`;

    const rows = await pgSql`
      SELECT ${VOTER_MASTER_SEARCH_SELECT}
      FROM "VoterMaster" vm
      WHERE vm.epic_number IN (
        SELECT DISTINCT vmn.epic_number
        FROM "VoterMobileNumber" vmn
        WHERE vmn.mobile_number LIKE ${pattern}
      )
      ORDER BY vm.full_name ASC
    `;

    return rows.map((row) => mapVoterMasterRow(row as Record<string, unknown>));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search voters by phone number',
    );
  }
}

export async function searchVoterByMobileNumberTable(
  mobileNumber: string,
  pagination?: VoterSearchPagination,
): Promise<Array<VoterMaster>> {
  try {
    const cleanMobile = mobileNumber.replace(/[\s\-()]/g, '');
    const pattern = `%${cleanMobile}%`;
    const limit = pagination?.limit;
    const offset = pagination?.offset ?? 0;

    const rows =
      limit != null
        ? await pgSql`
            SELECT ${VOTER_MASTER_SEARCH_SELECT}
            FROM "VoterMaster" vm
            INNER JOIN (
              SELECT DISTINCT epic_number
              FROM "VoterMobileNumber"
              WHERE mobile_number LIKE ${pattern}
            ) mobile_match ON vm.epic_number = mobile_match.epic_number
            ORDER BY vm.full_name ASC
            LIMIT ${limit}
            OFFSET ${offset}
          `
        : await pgSql`
            SELECT ${VOTER_MASTER_SEARCH_SELECT}
            FROM "VoterMaster" vm
            INNER JOIN (
              SELECT DISTINCT epic_number
              FROM "VoterMobileNumber"
              WHERE mobile_number LIKE ${pattern}
            ) mobile_match ON vm.epic_number = mobile_match.epic_number
            ORDER BY vm.full_name ASC
          `;

    return rows.map((row) => mapVoterMasterRow(row as Record<string, unknown>));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search voters by mobile number table',
    );
  }
}

export async function countSearchVoterByMobileNumberTable(
  mobileNumber: string,
): Promise<number> {
  try {
    const cleanMobile = mobileNumber.replace(/[\s\-()]/g, '');
    const pattern = `%${cleanMobile}%`;

    const [row] = await pgSql`
      SELECT COUNT(*)::int AS c
      FROM "VoterMaster" vm
      INNER JOIN (
        SELECT DISTINCT epic_number
        FROM "VoterMobileNumber"
        WHERE mobile_number LIKE ${pattern}
      ) mobile_match ON vm.epic_number = mobile_match.epic_number
    `;

    return Number(row?.c ?? 0);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to count voters by mobile number table',
    );
  }
}

export async function getVoterByVotingStatus(
  voted: boolean,
): Promise<Array<VoterMaster>> {
  try {
    const currentElectionId = await getCurrentElectionId();

    const rows = voted
      ? await pgSql`
          SELECT
            vm.epic_number,
            vm.full_name,
            vm.relation_type,
            vm.relation_name,
            vm.family_grouping,
            vm.house_number,
            vm.religion,
            vm.age,
            vm.dob,
            vm.gender,
            vm.address,
            vm.pincode
          FROM "VoterMaster" vm
          LEFT JOIN "ElectionMapping" em
            ON vm.epic_number = em.epic_number
            AND em.election_id = ${currentElectionId}
          LEFT JOIN "ElectionMaster" em2
            ON em.election_id = em2.election_id
          WHERE em.has_voted = true
          ORDER BY vm.full_name ASC
        `
      : await pgSql`
          SELECT
            vm.epic_number,
            vm.full_name,
            vm.relation_type,
            vm.relation_name,
            vm.family_grouping,
            vm.house_number,
            vm.religion,
            vm.age,
            vm.dob,
            vm.gender,
            vm.address,
            vm.pincode
          FROM "VoterMaster" vm
          LEFT JOIN "ElectionMapping" em
            ON vm.epic_number = em.epic_number
            AND em.election_id = ${currentElectionId}
          LEFT JOIN "ElectionMaster" em2
            ON em.election_id = em2.election_id
          WHERE em.has_voted = false OR em.has_voted IS NULL
          ORDER BY vm.full_name ASC
        `;

    return rows.map((row) => mapVoterMasterRow(row as Record<string, unknown>));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voters by voting status',
    );
  }
}

export async function getVoterCountByAC(acNo: string): Promise<number> {
  try {
    const currentElectionId = await getCurrentElectionId();
    const [row] = await pgSql`
      SELECT COUNT(em.epic_number)::int AS count
      FROM "ElectionMapping" em
      INNER JOIN "ElectionMaster" em2
        ON em.election_id = em2.election_id
        AND em2.constituency_type = 'assembly'
        AND em2.constituency_id = ${acNo}
      WHERE em.election_id = ${currentElectionId}
    `;
    return Number(row?.count ?? 0);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter count by AC',
    );
  }
}

export async function searchVoterByDetails(params: {
  name?: string;
  gender?: string;
  age?: number;
  ageRange?: number;
  limit?: number;
  offset?: number;
}): Promise<Array<VoterMaster>> {
  try {
    const trimmedName = params.name?.trim();
    const hasName = Boolean(trimmedName);
    const hasGender = Boolean(params.gender && params.gender !== '');
    const hasAge = params.age !== undefined && params.age !== null;

    if (!hasName && !hasGender && !hasAge) {
      return [];
    }

    const ageRange = params.ageRange || 0;
    const minAge = hasAge ? Math.max(0, params.age! - ageRange) : 0;
    const maxAge = hasAge ? params.age! + ageRange : 0;
    const limit = params.limit;
    const offset = params.offset ?? 0;

    const buildQuery = async (withLimit: boolean) => {
      if (hasName && hasGender && hasAge) {
        return withLimit && limit != null
          ? pgSql`
              SELECT ${VOTER_MASTER_SEARCH_SELECT}
              FROM "VoterMaster" vm
              WHERE ${fuzzyNameWhere(trimmedName!)}
                AND vm.gender = ${params.gender!}
                AND vm.age >= ${minAge} AND vm.age <= ${maxAge}
              ORDER BY ${fuzzyNameOrder(trimmedName!)}, vm.full_name ASC
              LIMIT ${limit}
              OFFSET ${offset}
            `
          : pgSql`
              SELECT ${VOTER_MASTER_SEARCH_SELECT}
              FROM "VoterMaster" vm
              WHERE ${fuzzyNameWhere(trimmedName!)}
                AND vm.gender = ${params.gender!}
                AND vm.age >= ${minAge} AND vm.age <= ${maxAge}
              ORDER BY ${fuzzyNameOrder(trimmedName!)}, vm.full_name ASC
            `;
      }
      if (hasName && hasGender) {
        return withLimit && limit != null
          ? pgSql`
              SELECT ${VOTER_MASTER_SEARCH_SELECT}
              FROM "VoterMaster" vm
              WHERE ${fuzzyNameWhere(trimmedName!)}
                AND vm.gender = ${params.gender!}
              ORDER BY ${fuzzyNameOrder(trimmedName!)}, vm.full_name ASC
              LIMIT ${limit}
              OFFSET ${offset}
            `
          : pgSql`
              SELECT ${VOTER_MASTER_SEARCH_SELECT}
              FROM "VoterMaster" vm
              WHERE ${fuzzyNameWhere(trimmedName!)}
                AND vm.gender = ${params.gender!}
              ORDER BY ${fuzzyNameOrder(trimmedName!)}, vm.full_name ASC
            `;
      }
      if (hasName && hasAge) {
        return withLimit && limit != null
          ? pgSql`
              SELECT ${VOTER_MASTER_SEARCH_SELECT}
              FROM "VoterMaster" vm
              WHERE ${fuzzyNameWhere(trimmedName!)}
                AND vm.age >= ${minAge} AND vm.age <= ${maxAge}
              ORDER BY ${fuzzyNameOrder(trimmedName!)}, vm.full_name ASC
              LIMIT ${limit}
              OFFSET ${offset}
            `
          : pgSql`
              SELECT ${VOTER_MASTER_SEARCH_SELECT}
              FROM "VoterMaster" vm
              WHERE ${fuzzyNameWhere(trimmedName!)}
                AND vm.age >= ${minAge} AND vm.age <= ${maxAge}
              ORDER BY ${fuzzyNameOrder(trimmedName!)}, vm.full_name ASC
            `;
      }
      if (hasGender && hasAge) {
        return withLimit && limit != null
          ? pgSql`
              SELECT ${VOTER_MASTER_SEARCH_SELECT}
              FROM "VoterMaster" vm
              WHERE vm.gender = ${params.gender!}
                AND vm.age >= ${minAge} AND vm.age <= ${maxAge}
              ORDER BY vm.full_name ASC
              LIMIT ${limit}
              OFFSET ${offset}
            `
          : pgSql`
              SELECT ${VOTER_MASTER_SEARCH_SELECT}
              FROM "VoterMaster" vm
              WHERE vm.gender = ${params.gender!}
                AND vm.age >= ${minAge} AND vm.age <= ${maxAge}
              ORDER BY vm.full_name ASC
            `;
      }
      if (hasName) {
        return withLimit && limit != null
          ? pgSql`
              SELECT ${VOTER_MASTER_SEARCH_SELECT}
              FROM "VoterMaster" vm
              WHERE ${fuzzyNameWhere(trimmedName!)}
              ORDER BY ${fuzzyNameOrder(trimmedName!)}, vm.full_name ASC
              LIMIT ${limit}
              OFFSET ${offset}
            `
          : pgSql`
              SELECT ${VOTER_MASTER_SEARCH_SELECT}
              FROM "VoterMaster" vm
              WHERE ${fuzzyNameWhere(trimmedName!)}
              ORDER BY ${fuzzyNameOrder(trimmedName!)}, vm.full_name ASC
            `;
      }
      if (hasGender) {
        return withLimit && limit != null
          ? pgSql`
              SELECT ${VOTER_MASTER_SEARCH_SELECT}
              FROM "VoterMaster" vm
              WHERE vm.gender = ${params.gender!}
              ORDER BY vm.full_name ASC
              LIMIT ${limit}
              OFFSET ${offset}
            `
          : pgSql`
              SELECT ${VOTER_MASTER_SEARCH_SELECT}
              FROM "VoterMaster" vm
              WHERE vm.gender = ${params.gender!}
              ORDER BY vm.full_name ASC
            `;
      }
      return withLimit && limit != null
        ? pgSql`
            SELECT ${VOTER_MASTER_SEARCH_SELECT}
            FROM "VoterMaster" vm
            WHERE vm.age >= ${minAge} AND vm.age <= ${maxAge}
            ORDER BY vm.full_name ASC
            LIMIT ${limit}
            OFFSET ${offset}
          `
        : pgSql`
            SELECT ${VOTER_MASTER_SEARCH_SELECT}
            FROM "VoterMaster" vm
            WHERE vm.age >= ${minAge} AND vm.age <= ${maxAge}
            ORDER BY vm.full_name ASC
          `;
    };

    const rows = await buildQuery(limit != null);
    return rows.map((row) => mapVoterMasterRow(row as Record<string, unknown>));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to search voters by details',
    );
  }
}

export async function countSearchVoterByDetails(params: {
  name?: string;
  gender?: string;
  age?: number;
  ageRange?: number;
}): Promise<number> {
  try {
    const trimmedName = params.name?.trim();
    const hasName = Boolean(trimmedName);
    const hasGender = Boolean(params.gender && params.gender !== '');
    const hasAge = params.age !== undefined && params.age !== null;

    if (!hasName && !hasGender && !hasAge) {
      return 0;
    }

    const ageRange = params.ageRange || 0;
    const minAge = hasAge ? Math.max(0, params.age! - ageRange) : 0;
    const maxAge = hasAge ? params.age! + ageRange : 0;

    let row: { c: number } | undefined;

    if (hasName && hasGender && hasAge) {
      [row] = await pgSql`
        SELECT COUNT(*)::int AS c FROM "VoterMaster" vm
        WHERE ${fuzzyNameWhere(trimmedName!)}
          AND vm.gender = ${params.gender!}
          AND vm.age >= ${minAge} AND vm.age <= ${maxAge}
      `;
    } else if (hasName && hasGender) {
      [row] = await pgSql`
        SELECT COUNT(*)::int AS c FROM "VoterMaster" vm
        WHERE ${fuzzyNameWhere(trimmedName!)}
          AND vm.gender = ${params.gender!}
      `;
    } else if (hasName && hasAge) {
      [row] = await pgSql`
        SELECT COUNT(*)::int AS c FROM "VoterMaster" vm
        WHERE ${fuzzyNameWhere(trimmedName!)}
          AND vm.age >= ${minAge} AND vm.age <= ${maxAge}
      `;
    } else if (hasGender && hasAge) {
      [row] = await pgSql`
        SELECT COUNT(*)::int AS c FROM "VoterMaster" vm
        WHERE vm.gender = ${params.gender!}
          AND vm.age >= ${minAge} AND vm.age <= ${maxAge}
      `;
    } else if (hasName) {
      [row] = await pgSql`
        SELECT COUNT(*)::int AS c FROM "VoterMaster" vm
        WHERE ${fuzzyNameWhere(trimmedName!)}
      `;
    } else if (hasGender) {
      [row] = await pgSql`
        SELECT COUNT(*)::int AS c FROM "VoterMaster" vm
        WHERE vm.gender = ${params.gender!}
      `;
    } else {
      [row] = await pgSql`
        SELECT COUNT(*)::int AS c FROM "VoterMaster" vm
        WHERE vm.age >= ${minAge} AND vm.age <= ${maxAge}
      `;
    }

    return Number(row?.c ?? 0);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to count voters by details',
    );
  }
}

export async function getRelatedVoters(
  voter: VoterMaster,
): Promise<Array<VoterMaster>> {
  try {
    if (!voter.familyGrouping) {
      return [];
    }

    const rows = await pgSql`
      SELECT
        vm.epic_number,
        vm.full_name,
        vm.relation_type,
        vm.relation_name,
        vm.family_grouping,
        vm.house_number,
        vm.religion,
        vm.age,
        vm.gender,
        vm.address,
        vm.pincode
      FROM "VoterMaster" vm
      WHERE vm.family_grouping = ${voter.familyGrouping}
        AND vm.epic_number <> ${voter.epicNumber}
      ORDER BY vm.full_name ASC
    `;

    return rows.map((row) => mapVoterMasterRow(row as Record<string, unknown>));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get related voters',
    );
  }
}

export async function getPhoneUpdateStats() {
  try {
    const today = startOfDayIST();

    const [todayCountRow] = await pgSql`
      SELECT COUNT(*)::int AS count
      FROM "PhoneUpdateHistory"
      WHERE created_at >= ${today}
    `;
    const phoneUpdatesToday = Number(todayCountRow?.count ?? 0);

    const [totalVotersRow] = await pgSql`
      SELECT COUNT(DISTINCT epic_number)::int AS count
      FROM "VoterMobileNumber"
    `;
    const totalVotersWithPhone = Number(totalVotersRow?.count ?? 0);

    const updatesBySourceRows = await pgSql`
      SELECT source_module, COUNT(*)::int AS count
      FROM "PhoneUpdateHistory"
      WHERE created_at >= ${today}
      GROUP BY source_module
    `;
    const phoneUpdatesBySource: Record<string, number> = {};
    for (const row of updatesBySourceRows) {
      phoneUpdatesBySource[String(row.source_module)] = Number(row.count);
    }

    const updatesByUserRows = await pgSql`
      SELECT puh.updated_by, u.user_id AS updated_by_user_id, COUNT(*)::int AS count
      FROM "PhoneUpdateHistory" puh
      LEFT JOIN "User" u ON puh.updated_by = u.id
      WHERE puh.created_at >= ${today}
      GROUP BY puh.updated_by, u.user_id
    `;
    const phoneUpdatesByUser: Array<{ userId: string | null; count: number }> =
      [];
    for (const row of updatesByUserRows) {
      phoneUpdatesByUser.push({
        userId: row.updated_by_user_id
          ? String(row.updated_by_user_id)
          : 'Unknown',
        count: Number(row.count),
      });
    }

    const recentUpdates = await pgSql`
      SELECT
        puh.id,
        puh.epic_number,
        puh.old_mobile_no_primary,
        puh.new_mobile_no_primary,
        puh.old_mobile_no_secondary,
        puh.new_mobile_no_secondary,
        puh.source_module,
        puh.created_at,
        puh.updated_by,
        vm.full_name AS voter_full_name,
        u.user_id AS updated_by_user_id
      FROM "PhoneUpdateHistory" puh
      LEFT JOIN "VoterMaster" vm ON puh.epic_number = vm.epic_number
      LEFT JOIN "User" u ON puh.updated_by = u.id
      ORDER BY puh.created_at DESC
      LIMIT 20
    `;

    return {
      phoneUpdatesToday,
      totalVotersWithPhone,
      phoneUpdatesBySource,
      phoneUpdatesByUser,
      recentPhoneUpdates: recentUpdates.map((update) => ({
        id: String(update.id),
        epicNumber: String(update.epic_number),
        voterFullName:
          update.voter_full_name != null ? String(update.voter_full_name) : null,
        oldMobileNoPrimary:
          update.old_mobile_no_primary != null
            ? String(update.old_mobile_no_primary)
            : null,
        newMobileNoPrimary:
          update.new_mobile_no_primary != null
            ? String(update.new_mobile_no_primary)
            : null,
        oldMobileNoSecondary:
          update.old_mobile_no_secondary != null
            ? String(update.old_mobile_no_secondary)
            : null,
        newMobileNoSecondary:
          update.new_mobile_no_secondary != null
            ? String(update.new_mobile_no_secondary)
            : null,
        sourceModule: String(update.source_module),
        createdAt: update.created_at as Date,
        updatedBy:
          update.updated_by_user_id != null
            ? String(update.updated_by_user_id)
            : null,
      })),
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get phone update statistics',
    );
  }
}

export async function getBeneficiaryServiceStats() {
  try {
    const today = startOfDayIST();

    const [todayCountRow] = await pgSql`
      SELECT COUNT(*)::int AS count
      FROM "BeneficiaryService"
      WHERE created_at >= ${today}
    `;
    const servicesCreatedToday = Number(todayCountRow?.count ?? 0);

    const [totalCountRow] = await pgSql`
      SELECT COUNT(*)::int AS count FROM "BeneficiaryService"
    `;
    const totalServices = Number(totalCountRow?.count ?? 0);

    const statusCounts = await pgSql`
      SELECT status, COUNT(*)::int AS count
      FROM "BeneficiaryService"
      GROUP BY status
    `;
    const byStatus: Record<string, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const row of statusCounts) {
      byStatus[String(row.status || 'pending')] = Number(row.count);
    }

    const typeCounts = await pgSql`
      SELECT service_type, COUNT(*)::int AS count
      FROM "BeneficiaryService"
      GROUP BY service_type
    `;
    const byType: Record<string, number> = {
      individual: 0,
      community: 0,
    };
    for (const row of typeCounts) {
      const serviceType = String(row.service_type);
      if (serviceType === 'individual' || serviceType === 'community') {
        byType[serviceType] = Number(row.count);
      }
    }

    return {
      servicesCreatedToday,
      totalServices,
      byStatus,
      byType,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get beneficiary service statistics',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}): Promise<number> {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [row] = await pgSql`
      SELECT COUNT(m.id)::int AS count
      FROM "Message_v2" m
      INNER JOIN "Chat" c ON m."chatId" = c.id
      WHERE c."userId" = ${id}
        AND m."createdAt" >= ${twentyFourHoursAgo}
        AND m.role = 'user'
    `;

    return Number(row?.count ?? 0);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

function formatDateToString(date: Date | string): string {
  if (typeof date === 'string') return date;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getDailyProgrammeItems({
  startDate,
  endDate,
  limit = 100,
}: {
  startDate?: Date | string;
  endDate?: Date | string;
  limit?: number;
} = {}): Promise<
  Array<
    DailyProgramme & {
      createdByUserId?: string | null;
      updatedByUserId?: string | null;
    }
  >
> {
  try {
    const filterStart = startDate ? formatDateToString(startDate) : null;
    const filterEnd = endDate ? formatDateToString(endDate) : null;

    const rows = await pgSql`
      SELECT
        dp.id,
        dp.date,
        dp.start_time,
        dp.end_time,
        dp.title,
        dp.location,
        dp.remarks,
        dp.attended,
        dp.programme_type,
        dp.sort_order,
        dp.start_date,
        dp.end_date,
        dp.created_by,
        dp.updated_by,
        dp.created_at,
        dp.updated_at,
        created_by_user.user_id AS created_by_user_id,
        updated_by_user.user_id AS updated_by_user_id
      FROM "DailyProgramme" dp
      LEFT JOIN "User" AS created_by_user ON dp.created_by = created_by_user.id
      LEFT JOIN "User" AS updated_by_user ON dp.updated_by = updated_by_user.id
      WHERE
        (
          dp.start_date IS NOT NULL
          AND dp.end_date IS NOT NULL
          AND dp.start_date < dp.end_date
          AND (${filterStart}::text IS NULL OR dp.end_date >= ${filterStart})
          AND (${filterEnd}::text IS NULL OR dp.start_date <= ${filterEnd})
        )
        OR (
          NOT (
            dp.start_date IS NOT NULL
            AND dp.end_date IS NOT NULL
            AND dp.start_date < dp.end_date
          )
          AND (${filterStart}::text IS NULL OR dp.date >= ${filterStart})
          AND (${filterEnd}::text IS NULL OR dp.date <= ${filterEnd})
        )
      ORDER BY dp.date ASC, dp.start_time ASC, dp.sort_order ASC
      LIMIT ${limit}
    `;

    return rows.map((row) => {
      const mapped = mapDailyProgrammeRow(row as Record<string, unknown>);
      return {
        ...mapped,
        createdByUserId:
          row.created_by_user_id != null
            ? String(row.created_by_user_id)
            : null,
        updatedByUserId:
          row.updated_by_user_id != null
            ? String(row.updated_by_user_id)
            : null,
      };
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get daily programme items',
    );
  }
}

export async function getVoterVotingHistory(
  epicNumber: string,
  electionId?: string,
): Promise<Array<VotingHistoryWithBooth>> {
  try {
    const rows = electionId
      ? await pgSql`
          SELECT
            em.epic_number,
            em.election_id,
            em.has_voted,
            bm.booth_name,
            bm.booth_address,
            em.booth_no,
            em.sr_no,
            em2.year AS election_year,
            em2.election_type
          FROM "ElectionMapping" em
          LEFT JOIN "ElectionMaster" em2 ON em.election_id = em2.election_id
          LEFT JOIN "BoothMaster" bm
            ON em.election_id = bm.election_id
            AND CAST(em.booth_no AS TEXT) = CAST(bm.booth_no AS TEXT)
          WHERE em.epic_number = ${epicNumber}
            AND em.election_id = ${electionId}
          ORDER BY em.election_id DESC
        `
      : await pgSql`
          SELECT
            em.epic_number,
            em.election_id,
            em.has_voted,
            bm.booth_name,
            bm.booth_address,
            em.booth_no,
            em.sr_no,
            em2.year AS election_year,
            em2.election_type
          FROM "ElectionMapping" em
          LEFT JOIN "ElectionMaster" em2 ON em.election_id = em2.election_id
          LEFT JOIN "BoothMaster" bm
            ON em.election_id = bm.election_id
            AND CAST(em.booth_no AS TEXT) = CAST(bm.booth_no AS TEXT)
          WHERE em.epic_number = ${epicNumber}
          ORDER BY em.election_id DESC
        `;

    return rows.map((row) => ({
      epicNumber: String(row.epic_number),
      electionId: String(row.election_id),
      hasVoted: row.has_voted != null ? Boolean(row.has_voted) : null,
      boothName: row.booth_name != null ? String(row.booth_name) : null,
      boothAddress: row.booth_address != null ? String(row.booth_address) : null,
      boothNo: row.booth_no != null ? String(row.booth_no) : null,
      srNo: row.sr_no != null ? String(row.sr_no) : null,
      electionYear: row.election_year != null ? Number(row.election_year) : null,
      electionType:
        row.election_type != null ? String(row.election_type) : null,
    }));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voter voting history',
    );
  }
}

export async function getVotingStatistics(
  electionId: string,
  filters?: {
    acNo?: string;
    wardNo?: string;
    partNo?: string;
  },
): Promise<{
  totalVoters: number;
  voted: number;
  notVoted: number;
  votingPercentage: number;
}> {
  try {
    const acNo = filters?.acNo ?? null;
    const wardNo = filters?.wardNo ?? null;
    const partNo = filters?.partNo ?? null;

    const [result] = await pgSql`
      SELECT
        COUNT(em.epic_number)::int AS total,
        COUNT(CASE WHEN em.has_voted = true THEN 1 END)::int AS voted,
        COUNT(CASE WHEN em.has_voted = false OR em.has_voted IS NULL THEN 1 END)::int AS not_voted
      FROM "ElectionMapping" em
      LEFT JOIN "ElectionMaster" em2 ON em.election_id = em2.election_id
      LEFT JOIN "CommunityServiceArea" csa ON em.booth_no = csa.booth_no
      WHERE em.election_id = ${electionId}
        AND (${acNo}::text IS NULL OR (em2.constituency_type = 'assembly' AND em2.constituency_id = ${acNo}))
        AND (${wardNo}::text IS NULL OR CAST(csa.ward_no AS text) = ${wardNo})
        AND (${partNo}::text IS NULL OR CAST(em.booth_no AS text) = ${partNo})
    `;

    const total = Number(result?.total) || 0;
    const voted = Number(result?.voted) || 0;
    const notVoted = Number(result?.not_voted) || 0;
    const votingPercentage = total > 0 ? (voted / total) * 100 : 0;

    return {
      totalVoters: total,
      voted,
      notVoted,
      votingPercentage: Math.round(votingPercentage * 100) / 100,
    };
  } catch (error) {
    console.error('Failed to get voting statistics query:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voting statistics',
    );
  }
}

type ExportFilters = {
  partNo?: string | string[];
  wardNo?: string | string[];
  acNo?: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
  hasPhone?: boolean;
  religion?: string;
  isVoted2024?: boolean;
};

async function buildExportFilterSql(
  filters: ExportFilters | undefined,
  currentElectionId: string,
) {
  const partNos = filters?.partNo
    ? Array.isArray(filters.partNo)
      ? filters.partNo.map(String)
      : [String(filters.partNo)]
    : null;
  const wardNos = filters?.wardNo
    ? Array.isArray(filters.wardNo)
      ? filters.wardNo.map(String)
      : [String(filters.wardNo)]
    : null;

  // Expand wards → booth/part nos via Form 20 ElectionMapping booth→ward map
  let wardBoothNos: string[] | null = null;
  if (wardNos && wardNos.length > 0) {
    const map = await getBoothWardMap();
    const boothSet = new Set<string>();
    for (const ward of wardNos) {
      const key = String(ward).trim().replace(/^0+(?=\d)/, '');
      for (const booth of map.partsByWard.get(key) ?? []) {
        boothSet.add(booth);
      }
    }

    // Include raw BoothMaster / ElectionMapping booth strings that normalize to the same
    if (boothSet.size > 0) {
      const boothRows = await pgSql`
        SELECT DISTINCT booth_no FROM "BoothMaster"
        WHERE election_id = ${currentElectionId}
          AND booth_no IS NOT NULL
      `;
      for (const row of boothRows) {
        const raw = String(row.booth_no);
        if (boothSet.has(normalizePartNo(raw))) boothSet.add(raw);
      }
    }

    // Empty mapping must match nothing (not "all voters")
    wardBoothNos = boothSet.size > 0 ? Array.from(boothSet) : ['__no_booths__'];
  }

  return {
    currentElectionId,
    partNos,
    wardBoothNos,
    acNo: filters?.acNo ?? null,
    gender: filters?.gender ?? null,
    minAge: filters?.minAge ?? null,
    maxAge: filters?.maxAge ?? null,
    hasPhone: filters?.hasPhone ?? null,
    religion: filters?.religion ?? null,
    // Voted flag comes from ElectionMapping.has_voted for current election
    isVoted2024: filters?.isVoted2024 ?? null,
  };
}

export async function getVotersForExport(
  filters?: ExportFilters,
): Promise<VoterWithPartNo[]> {
  try {
    const currentElectionId = await getCurrentElectionId();
    const f = await buildExportFilterSql(filters, currentElectionId);
    const boothToWard = await getBoothToWardMap();

    const rows = await pgSql`
      SELECT
        vm.epic_number,
        vm.full_name,
        vm.relation_type,
        vm.relation_name,
        vm.family_grouping,
        vm.house_number,
        vm.religion,
        vm.age,
        vm.dob,
        vm.gender,
        (
          SELECT vmn.mobile_number
          FROM "VoterMobileNumber" vmn
          WHERE vmn.epic_number::text = vm.epic_number::text
            AND vmn.sort_order = 1
          LIMIT 1
        ) AS mobile_no_primary,
        (
          SELECT vmn.mobile_number
          FROM "VoterMobileNumber" vmn
          WHERE vmn.epic_number::text = vm.epic_number::text
            AND vmn.sort_order = 2
          LIMIT 1
        ) AS mobile_no_secondary,
        vm.address,
        vm.pincode,
        vm.locality_street,
        vm.town_village,
        NOW() AS created_at,
        NOW() AS updated_at,
        em.booth_no,
        em.sr_no,
        em.has_voted,
        em2.constituency_type,
        em2.constituency_id,
        bm.booth_name,
        bm.booth_address AS english_booth_address
      FROM "VoterMaster" vm
      LEFT JOIN "ElectionMapping" em
        ON vm.epic_number::text = em.epic_number::text
        AND em.election_id::text = ${f.currentElectionId}
      LEFT JOIN "ElectionMaster" em2
        ON em.election_id::text = em2.election_id::text
      LEFT JOIN "BoothMaster" bm
        ON em.election_id = bm.election_id
        AND em.booth_no::text = bm.booth_no::text
      WHERE
        (${f.partNos}::text[] IS NULL OR em.booth_no::text = ANY(${f.partNos}))
        AND (${f.wardBoothNos}::text[] IS NULL OR em.booth_no::text = ANY(${f.wardBoothNos}))
        AND (${f.acNo}::text IS NULL OR (em2.constituency_type = 'assembly' AND em2.constituency_id::text = ${f.acNo}))
        AND (${f.gender}::text IS NULL OR vm.gender = ${f.gender})
        AND (${f.minAge}::int IS NULL OR vm.age >= ${f.minAge})
        AND (${f.maxAge}::int IS NULL OR vm.age <= ${f.maxAge})
        AND (
          ${f.hasPhone}::boolean IS NULL
          OR (
            ${f.hasPhone} = true AND EXISTS (
              SELECT 1 FROM "VoterMobileNumber" vmn
              WHERE vmn.epic_number::text = vm.epic_number::text
            )
          )
          OR (
            ${f.hasPhone} = false AND NOT EXISTS (
              SELECT 1 FROM "VoterMobileNumber" vmn
              WHERE vmn.epic_number::text = vm.epic_number::text
            )
          )
        )
        AND (${f.religion}::text IS NULL OR vm.religion = ${f.religion})
        AND (
          ${f.isVoted2024}::boolean IS NULL
          OR (${f.isVoted2024} = true AND em.has_voted = true)
          OR (${f.isVoted2024} = false AND (em.has_voted = false OR em.has_voted IS NULL))
        )
      ORDER BY vm.full_name ASC
    `;

    return rows.map((row) => {
      const boothNo = row.booth_no != null ? String(row.booth_no) : null;
      const wardNo = boothNo
        ? boothToWard.get(normalizePartNo(boothNo)) ?? null
        : null;

      return {
        epicNumber: String(row.epic_number),
        fullName: String(row.full_name),
        relationType:
          row.relation_type != null ? String(row.relation_type) : null,
        relationName:
          row.relation_name != null ? String(row.relation_name) : null,
        familyGrouping:
          row.family_grouping != null ? String(row.family_grouping) : null,
        houseNumber: row.house_number != null ? String(row.house_number) : null,
        religion: row.religion != null ? String(row.religion) : null,
        age: row.age != null ? Number(row.age) : null,
        dob: row.dob != null ? String(row.dob) : null,
        gender: row.gender != null ? String(row.gender) : null,
        address: row.address != null ? String(row.address) : null,
        pincode: row.pincode != null ? String(row.pincode) : null,
        acNo:
          row.constituency_type === 'assembly' && row.constituency_id != null
            ? String(row.constituency_id)
            : null,
        partNo: boothNo,
        boothNo,
        srNo: row.sr_no != null ? String(row.sr_no) : null,
        isVoted2024: row.has_voted != null ? Boolean(row.has_voted) : false,
        mobileNoPrimary:
          row.mobile_no_primary != null ? String(row.mobile_no_primary) : null,
        mobileNoSecondary:
          row.mobile_no_secondary != null
            ? String(row.mobile_no_secondary)
            : null,
        createdAt: row.created_at as Date,
        updatedAt: row.updated_at as Date,
        wardNo,
        boothName: row.booth_name != null ? String(row.booth_name) : null,
        englishBoothAddress:
          row.english_booth_address != null
            ? String(row.english_booth_address)
            : null,
        caste: null,
        localityStreet:
          row.locality_street != null ? String(row.locality_street) : null,
        townVillage: row.town_village != null ? String(row.town_village) : null,
      };
    });
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    console.error('getVotersForExport failed:', error);
    throw new ChatSDKError(
      'bad_request:database',
      `Failed to get voters for export: ${cause}`,
    );
  }
}

export async function getVotersCountForExport(
  filters?: ExportFilters,
): Promise<number> {
  try {
    const currentElectionId = await getCurrentElectionId();
    const f = await buildExportFilterSql(filters, currentElectionId);

    const [row] = await pgSql`
      SELECT COUNT(*)::int AS count
      FROM "VoterMaster" vm
      LEFT JOIN "ElectionMapping" em
        ON vm.epic_number::text = em.epic_number::text
        AND em.election_id::text = ${f.currentElectionId}
      LEFT JOIN "ElectionMaster" em2
        ON em.election_id::text = em2.election_id::text
      WHERE
        (${f.partNos}::text[] IS NULL OR em.booth_no::text = ANY(${f.partNos}))
        AND (${f.wardBoothNos}::text[] IS NULL OR em.booth_no::text = ANY(${f.wardBoothNos}))
        AND (${f.acNo}::text IS NULL OR (em2.constituency_type = 'assembly' AND em2.constituency_id::text = ${f.acNo}))
        AND (${f.gender}::text IS NULL OR vm.gender = ${f.gender})
        AND (${f.minAge}::int IS NULL OR vm.age >= ${f.minAge})
        AND (${f.maxAge}::int IS NULL OR vm.age <= ${f.maxAge})
        AND (
          ${f.hasPhone}::boolean IS NULL
          OR (
            ${f.hasPhone} = true AND EXISTS (
              SELECT 1 FROM "VoterMobileNumber" vmn
              WHERE vmn.epic_number::text = vm.epic_number::text
            )
          )
          OR (
            ${f.hasPhone} = false AND NOT EXISTS (
              SELECT 1 FROM "VoterMobileNumber" vmn
              WHERE vmn.epic_number::text = vm.epic_number::text
            )
          )
        )
        AND (${f.religion}::text IS NULL OR vm.religion = ${f.religion})
        AND (
          ${f.isVoted2024}::boolean IS NULL
          OR (${f.isVoted2024} = true AND em.has_voted = true)
          OR (${f.isVoted2024} = false AND (em.has_voted = false OR em.has_voted IS NULL))
        )
    `;

    return Number(row?.count ?? 0);
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    console.error('getVotersCountForExport failed:', error);
    throw new ChatSDKError(
      'bad_request:database',
      `Failed to count voters for export: ${cause}`,
    );
  }
}

export async function getVotingPatterns(
  electionId: string,
  filters?: { partNo?: string },
): Promise<{
  byElection: Array<{
    electionId: string;
    year: number;
    electionType: string;
    totalVoters: number;
    voted: number;
    turnout: number;
  }>;
  byReligion: Array<{
    religion: string | null;
    totalVoters: number;
    avgTurnout: number;
    totalElections: number;
  }>;
  byCaste: Array<{
    caste: string | null;
    totalVoters: number;
    avgTurnout: number;
    totalElections: number;
  }>;
  repeatVoters: {
    totalVoters: number;
    alwaysVoted: number;
    neverVoted: number;
    sometimesVoted: number;
  };
}> {
  try {
    const partNo = filters?.partNo ?? null;

    const currentElectionVoters = await pgSql`
      SELECT em.epic_number
      FROM "ElectionMapping" em
      WHERE em.election_id = ${electionId}
        AND (${partNo}::text IS NULL OR CAST(em.booth_no AS text) = ${partNo})
    `;

    const epicNumbers = currentElectionVoters
      .map((v) => (v.epic_number != null ? String(v.epic_number) : ''))
      .filter(Boolean);

    if (epicNumbers.length === 0) {
      return {
        byElection: [],
        byReligion: [],
        byCaste: [],
        repeatVoters: {
          totalVoters: 0,
          alwaysVoted: 0,
          neverVoted: 0,
          sometimesVoted: 0,
        },
      };
    }

    const votingHistory = await pgSql`
      SELECT
        em.epic_number,
        em.election_id,
        em.has_voted,
        em2.year,
        em2.election_type,
        vm.religion,
        vm.caste
      FROM "ElectionMapping" em
      INNER JOIN "ElectionMaster" em2 ON em.election_id = em2.election_id
      INNER JOIN "VoterMaster" vm ON em.epic_number = vm.epic_number
      WHERE em.epic_number = ANY(${epicNumbers})
        AND em.election_id <> ${electionId}
      ORDER BY em2.year ASC, em.epic_number ASC
    `;

    const electionMap = new Map<
      string,
      { year: number; electionType: string; voters: Set<string>; voted: Set<string> }
    >();

    for (const record of votingHistory) {
      const eid = String(record.election_id);
      const existing = electionMap.get(eid) || {
        year: Number(record.year) || 0,
        electionType: String(record.election_type || ''),
        voters: new Set<string>(),
        voted: new Set<string>(),
      };
      const epic = String(record.epic_number);
      existing.voters.add(epic);
      if (record.has_voted) {
        existing.voted.add(epic);
      }
      electionMap.set(eid, existing);
    }

    const byElection = Array.from(electionMap.entries())
      .map(([eid, data]) => ({
        electionId: eid,
        year: data.year,
        electionType: data.electionType,
        totalVoters: data.voters.size,
        voted: data.voted.size,
        turnout:
          data.voters.size > 0 ? (data.voted.size / data.voters.size) * 100 : 0,
      }))
      .sort((a, b) => a.year - b.year);

    const religionMap = new Map<
      string,
      { elections: Map<string, { total: number; voted: number }> }
    >();

    for (const record of votingHistory) {
      const religion = record.religion ? String(record.religion) : 'Unknown';
      if (!religionMap.has(religion)) {
        religionMap.set(religion, { elections: new Map() });
      }
      const religionData = religionMap.get(religion)!;
      const eid = String(record.election_id);
      const electionData = religionData.elections.get(eid) || {
        total: 0,
        voted: 0,
      };
      electionData.total++;
      if (record.has_voted) electionData.voted++;
      religionData.elections.set(eid, electionData);
    }

    const byReligion = Array.from(religionMap.entries())
      .map(([religion, data]) => {
        const elections = Array.from(data.elections.values());
        const totalVoters = Math.max(...elections.map((e) => e.total), 0);
        const totalTurnout = elections.reduce(
          (sum, e) => sum + (e.total > 0 ? (e.voted / e.total) * 100 : 0),
          0,
        );
        const avgTurnout =
          elections.length > 0 ? totalTurnout / elections.length : 0;
        return {
          religion: religion === 'Unknown' ? null : religion,
          totalVoters,
          avgTurnout: Math.round(avgTurnout * 100) / 100,
          totalElections: elections.length,
        };
      })
      .sort((a, b) => b.totalVoters - a.totalVoters);

    const casteMap = new Map<
      string,
      { elections: Map<string, { total: number; voted: number }> }
    >();

    for (const record of votingHistory) {
      const caste = record.caste ? String(record.caste) : 'Unknown';
      if (!casteMap.has(caste)) {
        casteMap.set(caste, { elections: new Map() });
      }
      const casteData = casteMap.get(caste)!;
      const eid = String(record.election_id);
      const electionData = casteData.elections.get(eid) || {
        total: 0,
        voted: 0,
      };
      electionData.total++;
      if (record.has_voted) electionData.voted++;
      casteData.elections.set(eid, electionData);
    }

    const byCaste = Array.from(casteMap.entries())
      .map(([caste, data]) => {
        const elections = Array.from(data.elections.values());
        const totalVoters = Math.max(...elections.map((e) => e.total), 0);
        const totalTurnout = elections.reduce(
          (sum, e) => sum + (e.total > 0 ? (e.voted / e.total) * 100 : 0),
          0,
        );
        const avgTurnout =
          elections.length > 0 ? totalTurnout / elections.length : 0;
        return {
          caste: caste === 'Unknown' ? null : caste,
          totalVoters,
          avgTurnout: Math.round(avgTurnout * 100) / 100,
          totalElections: elections.length,
        };
      })
      .sort((a, b) => b.totalVoters - a.totalVoters);

    const voterParticipation = new Map<
      string,
      { total: number; voted: number }
    >();

    for (const record of votingHistory) {
      const epic = String(record.epic_number);
      const existing = voterParticipation.get(epic) || { total: 0, voted: 0 };
      existing.total++;
      if (record.has_voted) existing.voted++;
      voterParticipation.set(epic, existing);
    }

    let alwaysVoted = 0;
    let neverVoted = 0;
    let sometimesVoted = 0;

    for (const participation of voterParticipation.values()) {
      if (participation.total === 0) continue;
      const turnoutRate = participation.voted / participation.total;
      if (turnoutRate === 1) alwaysVoted++;
      else if (turnoutRate === 0) neverVoted++;
      else sometimesVoted++;
    }

    return {
      byElection,
      byReligion: byReligion.filter((r) => r.religion !== null),
      byCaste: byCaste.filter((c) => c.caste !== null),
      repeatVoters: {
        totalVoters: voterParticipation.size,
        alwaysVoted,
        neverVoted,
        sometimesVoted,
      },
    };
  } catch (error) {
    console.error('Failed to get voting patterns:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get voting patterns',
    );
  }
}

export async function getCommunityServicesWithAreas({
  status,
  priority,
  token,
  page = 1,
  limit = 10,
}: {
  status?: string;
  priority?: string;
  token?: string;
  page?: number;
  limit?: number;
}): Promise<{
  services: Array<BeneficiaryService & { areas: import('./schema').CommunityServiceArea[] }>;
  totalCount: number;
  totalPages: number;
  currentPage: number;
}> {
  try {
    const offset = (page - 1) * limit;
    const statusVal = status ?? '';
    const priorityVal = priority ?? '';
    const tokenPattern = token ? `%${token}%` : '';

    const [countRow] = await pgSql`
      SELECT COUNT(*)::int AS count
      FROM "BeneficiaryService" bs
      WHERE bs.service_type = 'community'
        AND (${statusVal} = '' OR bs.status = ${statusVal})
        AND (${priorityVal} = '' OR bs.priority = ${priorityVal})
        AND (${tokenPattern} = '' OR bs.token ILIKE ${tokenPattern})
    `;
    const totalCount = Number(countRow?.count ?? 0);
    const totalPages = Math.ceil(totalCount / limit);

    const serviceRows = await pgSql`
      SELECT bs.*
      FROM "BeneficiaryService" bs
      WHERE bs.service_type = 'community'
        AND (${statusVal} = '' OR bs.status = ${statusVal})
        AND (${priorityVal} = '' OR bs.priority = ${priorityVal})
        AND (${tokenPattern} = '' OR bs.token ILIKE ${tokenPattern})
      ORDER BY bs.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const services = await Promise.all(
      serviceRows.map(async (row) => {
        const service = mapBeneficiaryServiceRow(row as Record<string, unknown>);
        const areaRows = await pgSql`
          SELECT *
          FROM "CommunityServiceArea"
          WHERE service_id = ${service.id}
          ORDER BY created_at ASC
        `;
        const areas = areaRows.map((a) => ({
          id: String(a.id),
          serviceId: String(a.service_id),
          electionId: a.election_id != null ? String(a.election_id) : null,
          boothNo: a.booth_no != null ? String(a.booth_no) : null,
          wardNo: a.ward_no != null ? String(a.ward_no) : null,
          acNo: a.ac_no != null ? String(a.ac_no) : null,
          createdAt: a.created_at as Date,
        }));
        return { ...service, areas };
      }),
    );

    return { services, totalCount, totalPages, currentPage: page };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get community services with areas',
    );
  }
}

export async function getRelatedVotersServicesAndEvents(
  relatedVoters: Array<VoterMaster>,
): Promise<
  Array<{
    voter: VoterMaster;
    services: {
      individual: Array<BeneficiaryService>;
      community: Array<BeneficiaryService>;
    };
    events: Array<DailyProgramme & { visitorName: string }>;
  }>
> {
  try {
    if (relatedVoters.length === 0) {
      return [];
    }

    const epicNumbers = relatedVoters.map((voter) => voter.epicNumber);

    const [individualRows, communityRows, mobileRows] = await Promise.all([
      pgSql`
        SELECT *
        FROM "BeneficiaryService"
        WHERE voter_id = ANY(${epicNumbers})
          AND service_type = 'individual'
        ORDER BY created_at DESC
      `,
      pgSql`
        SELECT vt.voter_id, bs.*
        FROM "VoterTask" vt
        INNER JOIN "BeneficiaryService" bs ON vt.service_id = bs.id
        WHERE vt.voter_id = ANY(${epicNumbers})
          AND bs.service_type = 'community'
        ORDER BY bs.created_at DESC
      `,
      pgSql`
        SELECT epic_number, mobile_number, sort_order
        FROM "VoterMobileNumber"
        WHERE epic_number = ANY(${epicNumbers})
        ORDER BY epic_number ASC, sort_order ASC
      `,
    ]);

    const individualServicesMap = new Map<string, Array<BeneficiaryService>>();
    for (const row of individualRows) {
      const service = mapBeneficiaryServiceRow(row as Record<string, unknown>);
      const voterId = service.voterId;
      if (!voterId) continue;
      const existing = individualServicesMap.get(voterId) || [];
      existing.push(service);
      individualServicesMap.set(voterId, existing);
    }

    const communityServicesMap = new Map<string, Array<BeneficiaryService>>();
    for (const row of communityRows) {
      const voterId = String(row.voter_id);
      const service = mapBeneficiaryServiceRow(row as Record<string, unknown>);
      const existing = communityServicesMap.get(voterId) || [];
      existing.push(service);
      communityServicesMap.set(voterId, existing);
    }

    void mobileRows;

    return relatedVoters.map((voter) => ({
      voter,
      services: {
        individual: individualServicesMap.get(voter.epicNumber) || [],
        community: communityServicesMap.get(voter.epicNumber) || [],
      },
      events: [],
    }));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get related voters services and events',
    );
  }
}

export async function getTasksWithFilters({
  status,
  priority,
  token,
  mobileNo,
  voterId,
  page = 1,
  limit = 10,
  assignedTo,
  serviceType,
  serviceName,
  createdFrom,
  createdTo,
}: {
  status?: string;
  priority?: string;
  token?: string;
  mobileNo?: string;
  voterId?: string;
  page?: number;
  limit?: number;
  assignedTo?: string;
  serviceType?: 'individual' | 'community';
  serviceName?: string;
  createdFrom?: string;
  createdTo?: string;
}): Promise<{
  tasks: Array<
    VoterTask & {
      createdByName?: string | null;
      updatedByName?: string | null;
      service?: {
        id: string;
        serviceType: 'individual' | 'community' | null;
        serviceName: string | null;
        description: string | null;
        status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | null;
        priority: 'low' | 'medium' | 'high' | 'urgent' | null;
        token: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        completedAt: Date | null;
        notes: string | null;
      };
      voter?: {
        epicNumber: string;
        fullName: string | null;
        mobileNoPrimary: string | null;
        mobileNoSecondary: string | null;
        age: number | null;
        gender: string | null;
        relationName: string | null;
      };
    }
  >;
  totalCount: number;
  totalPages: number;
  currentPage: number;
}> {
  try {
    const offset = (page - 1) * limit;
    const statusVal = status ?? '';
    const priorityVal = priority ?? '';
    const assignedToVal = assignedTo || null;
    const voterIdVal = voterId ?? '';
    const tokenPattern = token ? `%${token}%` : '';
    const mobilePattern = mobileNo ? `%${mobileNo}%` : '';
    const serviceNameVal = serviceName ?? '';
    // Use null (not '') for unset dates — postgres.js serializes ::date via
    // Date#toISOString, which throws on empty string (Invalid Date).
    const createdFromVal = createdFrom || null;
    const createdToVal = createdTo || null;

    if (serviceType === 'individual' || !serviceType) {
      const [countRow] = await pgSql`
        SELECT COUNT(*)::int AS count
        FROM "BeneficiaryService" bs
        WHERE bs.service_type = 'individual'
          AND (${statusVal} = '' OR bs.status = ${statusVal})
          AND (${priorityVal} = '' OR bs.priority = ${priorityVal})
          AND (${assignedToVal}::text IS NULL OR bs.assigned_to = ${assignedToVal})
          AND (${voterIdVal} = '' OR bs.voter_id = ${voterIdVal})
          AND (${tokenPattern} = '' OR bs.token ILIKE ${tokenPattern})
          AND (${serviceNameVal} = '' OR bs.service_name = ${serviceNameVal})
          AND (
            ${createdFromVal}::date IS NULL
            OR (bs.created_at AT TIME ZONE 'Asia/Kolkata')::date >= ${createdFromVal}::date
          )
          AND (
            ${createdToVal}::date IS NULL
            OR (bs.created_at AT TIME ZONE 'Asia/Kolkata')::date <= ${createdToVal}::date
          )
          AND (
            ${mobilePattern} = ''
            OR EXISTS (
              SELECT 1 FROM "VoterMobileNumber" vmn
              WHERE vmn.epic_number = bs.voter_id
                AND vmn.mobile_number ILIKE ${mobilePattern}
            )
          )
      `;
      const totalCount = Number(countRow?.count ?? 0);
      const totalPages = Math.ceil(totalCount / limit);

      const results = await pgSql`
        SELECT
          bs.id AS service_id,
          bs.service_type,
          bs.service_name,
          bs.description AS service_description,
          bs.status AS service_status,
          bs.priority AS service_priority,
          bs.token AS service_token,
          bs.created_at AS service_created_at,
          bs.updated_at AS service_updated_at,
          bs.completed_at AS service_completed_at,
          bs.notes AS service_notes,
          bs.assigned_to AS service_assigned_to,
          bs.requested_by AS service_requested_by,
          bs.voter_id,
          vm.full_name AS voter_name,
          (
            SELECT vmn.mobile_number FROM "VoterMobileNumber" vmn
            WHERE vmn.epic_number = bs.voter_id AND vmn.sort_order = 1 LIMIT 1
          ) AS voter_mobile_primary,
          (
            SELECT vmn.mobile_number FROM "VoterMobileNumber" vmn
            WHERE vmn.epic_number = bs.voter_id AND vmn.sort_order = 2 LIMIT 1
          ) AS voter_mobile_secondary,
          vm.age AS voter_age,
          vm.gender AS voter_gender,
          vm.relation_name AS voter_relation,
          (SELECT u.user_id FROM "User" u WHERE u.id = bs.requested_by LIMIT 1) AS created_by_name
        FROM "BeneficiaryService" bs
        LEFT JOIN "VoterMaster" vm ON bs.voter_id = vm.epic_number
        WHERE bs.service_type = 'individual'
          AND (${statusVal} = '' OR bs.status = ${statusVal})
          AND (${priorityVal} = '' OR bs.priority = ${priorityVal})
          AND (${assignedToVal}::text IS NULL OR bs.assigned_to = ${assignedToVal})
          AND (${voterIdVal} = '' OR bs.voter_id = ${voterIdVal})
          AND (${tokenPattern} = '' OR bs.token ILIKE ${tokenPattern})
          AND (${serviceNameVal} = '' OR bs.service_name = ${serviceNameVal})
          AND (
            ${createdFromVal}::date IS NULL
            OR (bs.created_at AT TIME ZONE 'Asia/Kolkata')::date >= ${createdFromVal}::date
          )
          AND (
            ${createdToVal}::date IS NULL
            OR (bs.created_at AT TIME ZONE 'Asia/Kolkata')::date <= ${createdToVal}::date
          )
          AND (
            ${mobilePattern} = ''
            OR EXISTS (
              SELECT 1 FROM "VoterMobileNumber" vmn
              WHERE vmn.epic_number = bs.voter_id
                AND vmn.mobile_number ILIKE ${mobilePattern}
            )
          )
        ORDER BY bs.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const tasks = results.map((row) => ({
        id: String(row.service_id),
        serviceId: String(row.service_id),
        voterId: row.voter_id ? String(row.voter_id) : '',
        taskType: 'service_request',
        description:
          row.service_description != null ? String(row.service_description) : null,
        status: (row.service_status as VoterTask['status']) || 'pending',
        priority: (row.service_priority as VoterTask['priority']) || 'medium',
        assignedTo:
          row.service_assigned_to != null ? String(row.service_assigned_to) : null,
        createdBy:
          row.service_requested_by != null
            ? String(row.service_requested_by)
            : null,
        updatedBy: null,
        createdByName:
          row.created_by_name != null ? String(row.created_by_name) : null,
        updatedByName: null,
        createdAt: (row.service_created_at as Date) || new Date(),
        updatedAt: (row.service_updated_at as Date) || new Date(),
        completedAt: (row.service_completed_at as Date) || null,
        notes: row.service_notes != null ? String(row.service_notes) : null,
        service: {
          id: String(row.service_id),
          serviceType: row.service_type as 'individual' | 'community',
          serviceName:
            row.service_name != null ? String(row.service_name) : null,
          description:
            row.service_description != null
              ? String(row.service_description)
              : null,
          status: row.service_status as BeneficiaryService['status'],
          priority: row.service_priority as BeneficiaryService['priority'],
          token: row.service_token != null ? String(row.service_token) : null,
          createdAt: row.service_created_at as Date,
          updatedAt: row.service_updated_at as Date,
          completedAt: row.service_completed_at as Date | null,
          notes: row.service_notes != null ? String(row.service_notes) : null,
        },
        voter: row.voter_id
          ? {
              epicNumber: String(row.voter_id),
              fullName: row.voter_name != null ? String(row.voter_name) : null,
              mobileNoPrimary:
                row.voter_mobile_primary != null
                  ? String(row.voter_mobile_primary)
                  : null,
              mobileNoSecondary:
                row.voter_mobile_secondary != null
                  ? String(row.voter_mobile_secondary)
                  : null,
              age: row.voter_age != null ? Number(row.voter_age) : null,
              gender: row.voter_gender != null ? String(row.voter_gender) : null,
              relationName:
                row.voter_relation != null ? String(row.voter_relation) : null,
            }
          : undefined,
      }));

      return { tasks, totalCount, totalPages, currentPage: page };
    }

    const serviceTypeVal = serviceType ?? '';

    const [countRow] = await pgSql`
      SELECT COUNT(*)::int AS count
      FROM "VoterTask" vt
      LEFT JOIN "BeneficiaryService" bs ON vt.service_id = bs.id
      LEFT JOIN "VoterMaster" vm ON vt.voter_id = vm.epic_number
      WHERE (${statusVal} = '' OR vt.status = ${statusVal})
        AND (${priorityVal} = '' OR vt.priority = ${priorityVal})
        AND (${assignedToVal}::text IS NULL OR vt.assigned_to = ${assignedToVal})
        AND (${voterIdVal} = '' OR vt.voter_id = ${voterIdVal})
        AND (${tokenPattern} = '' OR bs.token ILIKE ${tokenPattern})
        AND (${serviceTypeVal} = '' OR bs.service_type = ${serviceTypeVal})
        AND (
          ${createdFromVal}::date IS NULL
          OR (COALESCE(bs.created_at, vt.created_at) AT TIME ZONE 'Asia/Kolkata')::date >= ${createdFromVal}::date
        )
        AND (
          ${createdToVal}::date IS NULL
          OR (COALESCE(bs.created_at, vt.created_at) AT TIME ZONE 'Asia/Kolkata')::date <= ${createdToVal}::date
        )
        AND (
          ${mobilePattern} = ''
          OR EXISTS (
            SELECT 1 FROM "VoterMobileNumber" vmn
            WHERE vmn.epic_number = vt.voter_id
              AND vmn.mobile_number ILIKE ${mobilePattern}
          )
        )
    `;
    const totalCount = Number(countRow?.count ?? 0);
    const totalPages = Math.ceil(totalCount / limit);

    const results = await pgSql`
      SELECT
        vt.*,
        bs.service_type,
        bs.service_name,
        bs.description AS service_description,
        bs.status AS service_status,
        bs.priority AS service_priority,
        bs.token AS service_token,
        bs.created_at AS service_created_at,
        bs.updated_at AS service_updated_at,
        bs.completed_at AS service_completed_at,
        bs.notes AS service_notes,
        (SELECT u.user_id FROM "User" u WHERE u.id = vt.created_by LIMIT 1) AS created_by_name,
        (SELECT u.user_id FROM "User" u WHERE u.id = vt.updated_by LIMIT 1) AS updated_by_name,
        vm.full_name AS voter_name,
        (
          SELECT vmn.mobile_number FROM "VoterMobileNumber" vmn
          WHERE vmn.epic_number = vt.voter_id AND vmn.sort_order = 1 LIMIT 1
        ) AS voter_mobile_primary,
        (
          SELECT vmn.mobile_number FROM "VoterMobileNumber" vmn
          WHERE vmn.epic_number = vt.voter_id AND vmn.sort_order = 2 LIMIT 1
        ) AS voter_mobile_secondary,
        vm.age AS voter_age,
        vm.gender AS voter_gender,
        vm.relation_name AS voter_relation
      FROM "VoterTask" vt
      LEFT JOIN "BeneficiaryService" bs ON vt.service_id = bs.id
      LEFT JOIN "VoterMaster" vm ON vt.voter_id = vm.epic_number
      WHERE (${statusVal} = '' OR vt.status = ${statusVal})
        AND (${priorityVal} = '' OR vt.priority = ${priorityVal})
        AND (${assignedToVal}::text IS NULL OR vt.assigned_to = ${assignedToVal})
        AND (${voterIdVal} = '' OR vt.voter_id = ${voterIdVal})
        AND (${tokenPattern} = '' OR bs.token ILIKE ${tokenPattern})
        AND (${serviceTypeVal} = '' OR bs.service_type = ${serviceTypeVal})
        AND (
          ${createdFromVal}::date IS NULL
          OR (COALESCE(bs.created_at, vt.created_at) AT TIME ZONE 'Asia/Kolkata')::date >= ${createdFromVal}::date
        )
        AND (
          ${createdToVal}::date IS NULL
          OR (COALESCE(bs.created_at, vt.created_at) AT TIME ZONE 'Asia/Kolkata')::date <= ${createdToVal}::date
        )
        AND (
          ${mobilePattern} = ''
          OR EXISTS (
            SELECT 1 FROM "VoterMobileNumber" vmn
            WHERE vmn.epic_number = vt.voter_id
              AND vmn.mobile_number ILIKE ${mobilePattern}
          )
        )
      ORDER BY vt.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const tasks = results.map((row) => ({
      id: String(row.id),
      serviceId: String(row.service_id),
      voterId: String(row.voter_id),
      taskType: String(row.task_type),
      description: row.description != null ? String(row.description) : null,
      status: row.status as VoterTask['status'],
      priority: row.priority as VoterTask['priority'],
      assignedTo: row.assigned_to != null ? String(row.assigned_to) : null,
      createdBy: row.created_by != null ? String(row.created_by) : null,
      updatedBy: row.updated_by != null ? String(row.updated_by) : null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      completedAt: row.completed_at as Date | null,
      notes: row.notes != null ? String(row.notes) : null,
      createdByName:
        row.created_by_name != null ? String(row.created_by_name) : null,
      updatedByName:
        row.updated_by_name != null ? String(row.updated_by_name) : null,
      service: row.service_id
        ? {
            id: String(row.service_id),
            serviceType: row.service_type as 'individual' | 'community',
            serviceName:
              row.service_name != null ? String(row.service_name) : null,
            description:
              row.service_description != null
                ? String(row.service_description)
                : null,
            status: row.service_status as BeneficiaryService['status'],
            priority: row.service_priority as BeneficiaryService['priority'],
            token: row.service_token != null ? String(row.service_token) : null,
            createdAt: row.service_created_at as Date,
            updatedAt: row.service_updated_at as Date,
            completedAt: row.service_completed_at as Date | null,
            notes: row.service_notes != null ? String(row.service_notes) : null,
          }
        : undefined,
      voter: row.voter_id
        ? {
            epicNumber: String(row.voter_id),
            fullName: row.voter_name != null ? String(row.voter_name) : null,
            mobileNoPrimary:
              row.voter_mobile_primary != null
                ? String(row.voter_mobile_primary)
                : null,
            mobileNoSecondary:
              row.voter_mobile_secondary != null
                ? String(row.voter_mobile_secondary)
                : null,
            age: row.voter_age != null ? Number(row.voter_age) : null,
            gender: row.voter_gender != null ? String(row.voter_gender) : null,
            relationName:
              row.voter_relation != null ? String(row.voter_relation) : null,
          }
        : undefined,
    }));

    return { tasks, totalCount, totalPages, currentPage: page };
  } catch (error) {
    console.error('[getTasksWithFilters] Error:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get tasks with filters',
    );
  }
}

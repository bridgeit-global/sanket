import { type NextRequest, NextResponse } from 'next/server';
import {
  getVoterMobileNumbersByEpicNumbers,
  searchVoterByEpicNumber,
  searchVoterByName,
  searchVoterByDetails,
  searchVoterByMobileNumberTable,
  countSearchVoterByEpicNumber,
  countSearchVoterByName,
  countSearchVoterByDetails,
  countSearchVoterByMobileNumberTable,
} from '@/lib/db/queries';
import { isValidIndianMobile, normalizeIndianMobileDigits } from '@/lib/indian-mobile';
import { requireVisitorSession } from '@/lib/visitor/auth';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function clampSearchPagination(
  rawLimit: unknown,
  rawOffset: unknown,
): { limit: number; offset: number } {
  const parsedLimit = Number(rawLimit);
  const parsedOffset = Number(rawOffset);
  const limit = Math.min(
    Math.max(Number.isFinite(parsedLimit) ? Math.trunc(parsedLimit) : DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  const offset = Math.max(
    Number.isFinite(parsedOffset) ? Math.trunc(parsedOffset) : 0,
    0,
  );
  return { limit, offset };
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireVisitorSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      searchTerm,
      searchType,
      name,
      gender,
      age,
      ageRange,
      limit: rawLimit,
      offset: rawOffset,
    } = body ?? {};
    const { limit, offset } = clampSearchPagination(rawLimit, rawOffset);
    const page = { limit, offset };

    let voters: Array<Record<string, unknown>>;
    let actualSearchType: string;
    let totalCount: number;

    if (name !== undefined || gender !== undefined || age !== undefined) {
      const detailFilter = {
        name: name || searchTerm,
        gender,
        age,
        ageRange,
      };
      const [votersResult, countResult] = await Promise.all([
        searchVoterByDetails({
          ...detailFilter,
          limit,
          offset,
        }),
        countSearchVoterByDetails(detailFilter),
      ]);
      voters = votersResult as Array<Record<string, unknown>>;
      totalCount = countResult;
      actualSearchType = 'details';
    } else {
      if (!searchTerm || typeof searchTerm !== 'string') {
        return NextResponse.json({ error: 'Search term is required' }, { status: 400 });
      }

      const trimmedTerm = searchTerm.trim();
      const isVoterId = /^[A-Z]{3}[0-9]{7}$/i.test(trimmedTerm);
      const isPhoneNumber = /^[\d\s\-\(\)]{7,15}$/.test(trimmedTerm);

      if (searchType === 'mobileNumber') {
        if (!isValidIndianMobile(trimmedTerm)) {
          return NextResponse.json(
            { error: 'Enter a valid 10-digit Indian mobile number' },
            { status: 400 },
          );
        }
        const mobileQuery = normalizeIndianMobileDigits(trimmedTerm);
        const [votersResult, countResult] = await Promise.all([
          searchVoterByMobileNumberTable(mobileQuery, page),
          countSearchVoterByMobileNumberTable(mobileQuery),
        ]);
        voters = votersResult as Array<Record<string, unknown>>;
        totalCount = countResult;
        actualSearchType = 'mobileNumber';
      } else if (
        searchType === 'phone' ||
        (isPhoneNumber && searchType !== 'voterId' && searchType !== 'name')
      ) {
        if (!isValidIndianMobile(trimmedTerm)) {
          return NextResponse.json(
            { error: 'Enter a valid 10-digit Indian mobile number' },
            { status: 400 },
          );
        }
        const mobileQuery = normalizeIndianMobileDigits(trimmedTerm);
        const [votersResult, countResult] = await Promise.all([
          searchVoterByMobileNumberTable(mobileQuery, page),
          countSearchVoterByMobileNumberTable(mobileQuery),
        ]);
        voters = votersResult as Array<Record<string, unknown>>;
        totalCount = countResult;
        actualSearchType = 'phone';
      } else if (searchType === 'voterId' || isVoterId) {
        const [votersResult, countResult] = await Promise.all([
          searchVoterByEpicNumber(trimmedTerm.toUpperCase(), undefined, page),
          countSearchVoterByEpicNumber(trimmedTerm.toUpperCase()),
        ]);
        voters = votersResult as Array<Record<string, unknown>>;
        totalCount = countResult;
        actualSearchType = 'voterId';
      } else {
        const [votersResult, countResult] = await Promise.all([
          searchVoterByName(trimmedTerm, undefined, page),
          countSearchVoterByName(trimmedTerm),
        ]);
        voters = votersResult as Array<Record<string, unknown>>;
        totalCount = countResult;
        actualSearchType = 'name';
      }
    }

    if (voters.length > 0) {
      const epicNumbers = voters.map((v) => String(v.epicNumber));
      const mobileNumbersMap = await getVoterMobileNumbersByEpicNumbers(epicNumbers);
      voters = voters.map((voter) => {
        const mobiles = mobileNumbersMap.get(String(voter.epicNumber)) || [];
        const primary = mobiles.find((m) => m.sortOrder === 1)?.mobileNumber ?? null;
        const secondary = mobiles.find((m) => m.sortOrder === 2)?.mobileNumber ?? null;
        return {
          ...voter,
          mobileNoPrimary: primary,
          mobileNoSecondary: secondary,
        };
      });
    }

    return NextResponse.json({
      voters,
      searchType: actualSearchType,
      hasMore: voters.length === limit,
      totalCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error searching voters for visitor:', error);
    return NextResponse.json({ error: 'Failed to search voters' }, { status: 500 });
  }
}

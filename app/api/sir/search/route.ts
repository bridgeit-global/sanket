import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getVoterMobileNumbersByEpicNumbers,
  searchVoterByEpicNumber,
  searchVoterByMobileNumberTable,
  countSearchVoterByEpicNumber,
  countSearchVoterByMobileNumberTable,
} from '@/lib/db/queries';
import { isValidIndianMobile, normalizeIndianMobileDigits } from '@/lib/indian-mobile';

const PAGE_SIZE = 50;
const EPIC_REGEX = /^[A-Z]{3}[0-9]{7}$/;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('sir')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { searchTerm, searchType } = body as {
      searchTerm?: string;
      searchType?: 'voterId' | 'mobileNumber';
    };

    if (!searchTerm || typeof searchTerm !== 'string' || !searchTerm.trim()) {
      return NextResponse.json(
        { error: 'Search term is required' },
        { status: 400 },
      );
    }

    const trimmedTerm = searchTerm.trim();
    const page = { limit: PAGE_SIZE, offset: 0 };

    const looksLikeEpic = EPIC_REGEX.test(trimmedTerm.toUpperCase());
    const useMobile = searchType === 'mobileNumber' || (!looksLikeEpic && searchType !== 'voterId');

    let voters: Array<Record<string, unknown>>;
    let actualSearchType: 'voterId' | 'mobileNumber';
    let totalCount: number;

    if (useMobile) {
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
    } else {
      const epicTerm = trimmedTerm.toUpperCase();
      const [votersResult, countResult] = await Promise.all([
        searchVoterByEpicNumber(epicTerm, undefined, page),
        countSearchVoterByEpicNumber(epicTerm),
      ]);
      voters = votersResult as Array<Record<string, unknown>>;
      totalCount = countResult;
      actualSearchType = 'voterId';
    }

    if (voters.length > 0) {
      const epicNumbers = voters.map((v) => v.epicNumber as string);
      const mobileNumbersMap = await getVoterMobileNumbersByEpicNumbers(epicNumbers);
      voters = voters.map((voter) => {
        const mobiles = mobileNumbersMap.get(voter.epicNumber as string) || [];
        const primary = mobiles.find((m) => m.sortOrder === 1)?.mobileNumber ?? null;
        const secondary = mobiles.find((m) => m.sortOrder === 2)?.mobileNumber ?? null;
        return { ...voter, mobileNoPrimary: primary, mobileNoSecondary: secondary };
      });
    }

    return NextResponse.json({
      voters,
      searchType: actualSearchType,
      totalCount,
    });
  } catch (error) {
    console.error('Error searching voters (SIR):', error);
    return NextResponse.json(
      { error: 'Failed to search voters' },
      { status: 500 },
    );
  }
}

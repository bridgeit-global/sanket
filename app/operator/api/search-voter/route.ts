import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
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

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function clampSearchPagination(rawLimit: unknown, rawOffset: unknown): { limit: number; offset: number } {
    const parsedLimit = Number(rawLimit);
    const parsedOffset = Number(rawOffset);
    const limit = Math.min(
        Math.max(Number.isFinite(parsedLimit) ? Math.trunc(parsedLimit) : DEFAULT_PAGE_SIZE, 1),
        MAX_PAGE_SIZE,
    );
    const offset = Math.max(Number.isFinite(parsedOffset) ? Math.trunc(parsedOffset) : 0, 0);
    return { limit, offset };
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || !modules.includes('operator')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { searchTerm, searchType, name, gender, age, ageRange, limit: rawLimit, offset: rawOffset } = body;
        const { limit, offset } = clampSearchPagination(rawLimit, rawOffset);
        const page = { limit, offset };

        let voters: Array<any>;
        let actualSearchType: string;
        let totalCount: number;

        // Check if this is a detailed search
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
            voters = votersResult;
            totalCount = countResult;
            actualSearchType = 'details';
        } else {
            // Legacy search functionality
            if (!searchTerm || typeof searchTerm !== 'string') {
                return NextResponse.json({ error: 'Search term is required' }, { status: 400 });
            }

            // Determine search type based on input or explicit type
            const trimmedTerm = searchTerm.trim();
            const isVoterId = /^[A-Z]{3}[0-9]{7}$/.test(trimmedTerm);
            const isPhoneNumber = /^[\d\s\-\(\)]{7,15}$/.test(trimmedTerm);

            if (searchType === 'mobileNumber') {
                const [votersResult, countResult] = await Promise.all([
                    searchVoterByMobileNumberTable(trimmedTerm, page),
                    countSearchVoterByMobileNumberTable(trimmedTerm),
                ]);
                voters = votersResult;
                totalCount = countResult;
                actualSearchType = 'mobileNumber';
            } else if (searchType === 'phone' || (isPhoneNumber && searchType !== 'voterId' && searchType !== 'name')) {
                const [votersResult, countResult] = await Promise.all([
                    searchVoterByMobileNumberTable(trimmedTerm, page),
                    countSearchVoterByMobileNumberTable(trimmedTerm),
                ]);
                voters = votersResult;
                totalCount = countResult;
                actualSearchType = 'phone';
            } else if (searchType === 'voterId' || isVoterId) {
                const [votersResult, countResult] = await Promise.all([
                    searchVoterByEpicNumber(trimmedTerm, undefined, page),
                    countSearchVoterByEpicNumber(trimmedTerm),
                ]);
                voters = votersResult;
                totalCount = countResult;
                actualSearchType = 'voterId';
            } else {
                const [votersResult, countResult] = await Promise.all([
                    searchVoterByName(trimmedTerm, undefined, page),
                    countSearchVoterByName(trimmedTerm),
                ]);
                voters = votersResult;
                totalCount = countResult;
                actualSearchType = 'name';
            }
        }

        // Attach mobile numbers from VoterMobileNumber table (sort_order 1 = primary, 2 = secondary, etc.)
        if (voters.length > 0) {
            const epicNumbers = voters.map((v: { epicNumber: string }) => v.epicNumber);
            const mobileNumbersMap = await getVoterMobileNumbersByEpicNumbers(epicNumbers);
            voters = voters.map((voter: Record<string, unknown>) => {
                const mobiles = mobileNumbersMap.get(voter.epicNumber as string) || [];
                const primary = mobiles.find((m) => m.sortOrder === 1)?.mobileNumber ?? null;
                const secondary = mobiles.find((m) => m.sortOrder === 2)?.mobileNumber ?? null;
                return {
                    ...voter,
                    mobileNoPrimary: primary,
                    mobileNoSecondary: secondary,
                };
            });
        }

        const hasMore = voters.length === limit;

        return NextResponse.json({
            voters,
            searchType: actualSearchType,
            hasMore,
            totalCount,
            limit,
            offset,
        });
    } catch (error) {
        console.error('Error searching voters:', error);
        return NextResponse.json(
            { error: 'Failed to search voters' },
            { status: 500 }
        );
    }
}

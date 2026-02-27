import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
    getVoterMobileNumbersByEpicNumbers,
    searchVoterByEpicNumber,
    searchVoterByName,
    searchVoterByDetails,
    searchVoterByMobileNumberTable,
} from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || !modules.includes('operator')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchTerm, searchType, name, gender, age, ageRange } = await request.json();

        let voters: Array<any>;
        let actualSearchType: string;

        // Check if this is a detailed search
        if (name !== undefined || gender !== undefined || age !== undefined) {
            // Detailed search with name, gender, age, and age range
            voters = await searchVoterByDetails({
                name: name || searchTerm,
                gender,
                age,
                ageRange
            });
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
                // Mobile number search using voterMobileNumber table
                voters = await searchVoterByMobileNumberTable(trimmedTerm);
                actualSearchType = 'mobileNumber';
            } else if (searchType === 'phone' || (isPhoneNumber && searchType !== 'voterId' && searchType !== 'name')) {
                // Phone number search using voterMobileNumber table
                voters = await searchVoterByMobileNumberTable(trimmedTerm);
                actualSearchType = 'phone';
            } else if (searchType === 'voterId' || isVoterId) {
                // VoterId search
                voters = await searchVoterByEpicNumber(trimmedTerm);
                actualSearchType = 'voterId';

                // // If no results found with VoterId, fall back to name search
                // if (voters.length === 0 && searchType !== 'voterId') {
                //     voters = await searchVoterByName(trimmedTerm);
                //     actualSearchType = 'name';
                // }
            } else {
                // Default to name search
                voters = await searchVoterByName(trimmedTerm);
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

        return NextResponse.json({
            voters,
            searchType: actualSearchType
        });
    } catch (error) {
        console.error('Error searching voters:', error);
        return NextResponse.json(
            { error: 'Failed to search voters' },
            { status: 500 }
        );
    }
}

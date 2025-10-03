import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { searchVoterByEpicNumber, searchVoterByName, searchVoterByPhoneNumber } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user || !['admin', 'operator'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchTerm, searchType } = await request.json();

        if (!searchTerm || typeof searchTerm !== 'string') {
            return NextResponse.json({ error: 'Search term is required' }, { status: 400 });
        }

        let voters: Array<any>;
        let actualSearchType: string;

        // Determine search type based on input or explicit type
        const trimmedTerm = searchTerm.trim();
        const isVoterId = /^[A-Z]{3}[0-9]{7}$/.test(trimmedTerm);
        const isPhoneNumber = /^[\d\s\-\(\)]{7,15}$/.test(trimmedTerm);

        if (searchType === 'phone' || (isPhoneNumber && searchType !== 'voterId' && searchType !== 'name')) {
            // Phone number search
            voters = await searchVoterByPhoneNumber(trimmedTerm);
            actualSearchType = 'phone';
        } else if (searchType === 'voterId' || isVoterId) {
            // VoterId search
            voters = await searchVoterByEpicNumber(trimmedTerm);
            actualSearchType = 'voterId';

            // If no results found with VoterId, fall back to name search
            if (voters.length === 0 && searchType !== 'voterId') {
                voters = await searchVoterByName(trimmedTerm);
                actualSearchType = 'name';
            }
        } else {
            // Default to name search
            voters = await searchVoterByName(trimmedTerm);
            actualSearchType = 'name';
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

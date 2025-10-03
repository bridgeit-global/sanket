import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { searchVoterByEpicNumber, searchVoterByName } from '@/lib/db/queries';

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

        // First try VoterId search if searchType is 'voterId' or if the search term looks like a VoterId
        if (searchType === 'voterId' || /^[A-Z]{3}[0-9]{7}$/.test(searchTerm.trim())) {
            voters = await searchVoterByEpicNumber(searchTerm);

            // If no results found with VoterId, fall back to name search
            if (voters.length === 0 && searchType !== 'voterId') {
                voters = await searchVoterByName(searchTerm);
            }
        } else {
            // Default to name search
            voters = await searchVoterByName(searchTerm);
        }

        return NextResponse.json({
            voters,
            searchType: voters.length > 0 && /^[A-Z]{3}[0-9]{7}$/.test(searchTerm.trim()) ? 'voterId' : 'name'
        });
    } catch (error) {
        console.error('Error searching voters:', error);
        return NextResponse.json(
            { error: 'Failed to search voters' },
            { status: 500 }
        );
    }
}

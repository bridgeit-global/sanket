import { NextRequest, NextResponse } from 'next/server';
import { getAllVoters } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const limit = parseInt(searchParams.get('limit') || '50');

        const voters = await getAllVoters({ limit });

        // Filter voters by search term if provided
        let filteredVoters = voters;
        if (search) {
            filteredVoters = voters.filter(voter =>
                voter.id.toLowerCase().includes(search.toLowerCase()) ||
                voter.name.toLowerCase().includes(search.toLowerCase()) ||
                voter.family?.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Format for select component
        const voterOptions = filteredVoters.map(voter => ({
            value: voter.id,
            label: `${voter.id} - ${voter.name}${voter.family ? ` (${voter.family})` : ''} - Part ${voter.part_no}`,
            voter: voter
        }));

        return NextResponse.json({
            success: true,
            voters: voterOptions,
            total: voterOptions.length
        });
    } catch (error) {
        console.error('Error fetching voter IDs:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch voter IDs' },
            { status: 500 }
        );
    }
} 
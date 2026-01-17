import { type NextRequest, NextResponse } from 'next/server';
import { getVoterByEpicNumber, searchVoterByName } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';
import type { VoterMaster } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const voterId = searchParams.get('voterId');
        const name = searchParams.get('name');

        if (!voterId && !name) {
            return NextResponse.json(
                { error: 'Either voterId or name parameter is required' },
                { status: 400 }
            );
        }

        let results: VoterMaster[] = [];

        if (voterId) {
            // Search by Voter ID (EPIC Number)
            results = await getVoterByEpicNumber(voterId);
        } else if (name) {
            // Search by name
            results = await searchVoterByName(name);
        }

        return NextResponse.json({
            success: true,
            data: results,
            count: results.length
        });

    } catch (error) {
        console.error('Voter search error:', error);
        return NextResponse.json(
            { error: 'Failed to search voters' },
            { status: 500 }
        );
    }
} 
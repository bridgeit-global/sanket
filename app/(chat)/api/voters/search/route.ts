import { NextRequest, NextResponse } from 'next/server';
import { getVoterById, searchVotersByName } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';
import type { Voter } from '@/lib/db/schema';

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

        let results: Voter[] = [];

        if (voterId) {
            // Search by Voter ID
            const voter = await getVoterById({ id: voterId });
            if (voter) {
                results.push(voter);
            }
        } else if (name) {
            // Search by name
            results = await searchVotersByName({ name });
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
import { NextRequest, NextResponse } from 'next/server';
import { getVotersByPart } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
    try {
        const parts = await getVotersByPart();

        // Format for select component
        const partOptions = parts.map(part => ({
            value: part.part_no.toString(),
            label: `Part ${part.part_no} (${part.voterCount} voters)`,
            part_no: part.part_no,
            voter_count: part.voterCount
        }));

        return NextResponse.json({
            success: true,
            parts: partOptions,
            total: partOptions.length
        });
    } catch (error) {
        console.error('Error fetching part numbers:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch part numbers' },
            { status: 500 }
        );
    }
} 
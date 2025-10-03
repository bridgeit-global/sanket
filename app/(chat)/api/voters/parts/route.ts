import { type NextRequest, NextResponse } from 'next/server';
import { Voters } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { auth } from '@/app/(auth)/auth';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Create database connection
        const postgresUrl = process.env.POSTGRES_URL;
        if (!postgresUrl) {
            return NextResponse.json({ error: 'Database URL not configured' }, { status: 500 });
        }
        const client = postgres(postgresUrl);
        const db = drizzle(client);

        // Get distinct part numbers from voters table
        const parts = await db
            .select({ partNo: Voters.partNo })
            .from(Voters)
            .where(sql`${Voters.isVoted2024} = false`)
            .groupBy(Voters.partNo)
            .orderBy(Voters.partNo)
            .execute();

        const partNumbers = parts
            .map((part: { partNo: string | null }) => part.partNo)
            .filter((partNo): partNo is string => partNo !== null);

        return NextResponse.json({
            success: true,
            data: {
                partNumbers,
                totalParts: partNumbers.length
            }
        });

    } catch (error) {
        console.error('Parts fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch part numbers' },
            { status: 500 }
        );
    }
} 
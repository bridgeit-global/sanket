import { NextRequest, NextResponse } from 'next/server';
import { voters } from '@/lib/db/schema';
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
        const client = postgres(process.env.POSTGRES_URL!);
        const db = drizzle(client);

        // Get distinct part numbers from voters table
        const parts = await db
            .select({ part_no: voters.part_no })
            .from(voters)
            .where(sql`${voters.isActive} = true`)
            .groupBy(voters.part_no)
            .orderBy(voters.part_no)
            .execute();

        const partNumbers = parts.map((part: { part_no: number }) => part.part_no);

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
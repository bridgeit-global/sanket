import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getCommunityServicesWithAreas } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || !modules.includes('operator')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);

        // Extract filter parameters
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const token = searchParams.get('token');
        const page = Number.parseInt(searchParams.get('page') || '1');
        const limit = Number.parseInt(searchParams.get('limit') || '10');

        // Validate pagination parameters
        if (page < 1) {
            return NextResponse.json({ error: 'Page must be greater than 0' }, { status: 400 });
        }
        if (limit < 1 || limit > 100) {
            return NextResponse.json({ error: 'Limit must be between 1 and 100' }, { status: 400 });
        }

        const result = await getCommunityServicesWithAreas({
            status: status || undefined,
            priority: priority || undefined,
            token: token || undefined,
            page,
            limit,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching community services:', error);
        return NextResponse.json(
            { error: 'Failed to fetch community services' },
            { status: 500 }
        );
    }
}

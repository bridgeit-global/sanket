import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { createService } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    try {
        console.log('Service creation API called');

        const session = await auth();
        console.log('Session:', session?.user ? 'Authenticated' : 'Not authenticated');

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        console.log('Request body:', body);

        const { name, description, type, category } = body;

        // Validate required fields
        if (!name || !type || !category) {
            console.log('Missing required fields:', { name, type, category });
            return NextResponse.json(
                { error: 'Missing required fields: name, type, category' },
                { status: 400 }
            );
        }

        // Validate service type
        if (!['one-to-one', 'one-to-many'].includes(type)) {
            console.log('Invalid service type:', type);
            return NextResponse.json(
                { error: 'Invalid service type. Must be "one-to-one" or "one-to-many"' },
                { status: 400 }
            );
        }

        console.log('Calling createService with:', { name, description, type, category });

        // Create the new service
        const newService = await createService({
            name,
            description,
            type,
            category,
        });

        console.log('Service created successfully:', newService);

        return NextResponse.json({
            success: true,
            message: 'Service created successfully',
            data: {
                id: newService.id,
                name: newService.name,
                description: newService.description,
                type: newService.type,
                category: newService.category,
            }
        });

    } catch (error) {
        console.error('Service creation error:', error);
        return NextResponse.json(
            { error: 'Failed to create service' },
            { status: 500 }
        );
    }
} 
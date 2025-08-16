import { NextRequest, NextResponse } from 'next/server';
import { getAllServices } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const services = await getAllServices();

        // Group services by type for better organization
        const oneToOneServices = services.filter(service => service.type === 'one-to-one');
        const oneToManyServices = services.filter(service => service.type === 'one-to-many');

        return NextResponse.json({
            success: true,
            data: {
                totalServices: services.length,
                oneToOneServices: oneToOneServices.map(service => ({
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    category: service.category,
                    type: service.type,
                })),
                oneToManyServices: oneToManyServices.map(service => ({
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    category: service.category,
                    type: service.type,
                })),
            }
        });

    } catch (error) {
        console.error('Services fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch services' },
            { status: 500 }
        );
    }
} 
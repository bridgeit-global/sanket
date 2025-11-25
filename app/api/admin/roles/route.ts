import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
    getAllRoles,
    createRole,
} from '@/lib/db/queries';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || (!modules.includes('user-management') && !modules.includes('admin'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const roles = await getAllRoles();

        return NextResponse.json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        return NextResponse.json(
            { error: 'Failed to fetch roles' },
            { status: 500 },
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || (!modules.includes('user-management') && !modules.includes('admin'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, description, permissions } = body;

        if (!name) {
            return NextResponse.json(
                { error: 'name is required' },
                { status: 400 },
            );
        }

        if (!permissions || typeof permissions !== 'object') {
            return NextResponse.json(
                { error: 'permissions object is required' },
                { status: 400 },
            );
        }

        const newRole = await createRole(
            name,
            description || null,
            permissions,
        );

        // Fetch the role with permissions
        const roleWithPermissions = await getAllRoles();
        const createdRole = roleWithPermissions.find((r) => r.id === newRole.id);

        return NextResponse.json(createdRole || newRole, { status: 201 });
    } catch (error) {
        console.error('Error creating role:', error);

        // Check if it's a unique constraint violation
        if (error instanceof Error && error.message.includes('unique')) {
            return NextResponse.json(
                { error: 'Role with this name already exists' },
                { status: 400 },
            );
        }

        return NextResponse.json(
            { error: 'Failed to create role' },
            { status: 500 },
        );
    }
}


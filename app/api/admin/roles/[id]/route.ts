import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
    getRoleById,
    updateRole,
    deleteRole,
    getUsersWithRole,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await auth();
        const { id } = await params;

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || !modules.includes('user-management')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const roleRecord = await getRoleById(id);
        if (!roleRecord) {
            return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        }

        return NextResponse.json(roleRecord);
    } catch (error) {
        console.error('Error fetching role:', error);
        return NextResponse.json(
            { error: 'Failed to fetch role' },
            { status: 500 },
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await auth();
        const { id } = await params;

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || !modules.includes('user-management')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, description, permissions, defaultLandingModule } = body;

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

        const updatedRole = await updateRole(
            id,
            name,
            description || null,
            permissions,
            defaultLandingModule || null,
        );

        // Fetch the role with permissions
        const roleWithPermissions = await getRoleById(id);

        return NextResponse.json(roleWithPermissions || updatedRole);
    } catch (error) {
        console.error('Error updating role:', error);

        if (error instanceof ChatSDKError && error.message.includes('not found')) {
            return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        }

        // Check if it's a unique constraint violation
        if (error instanceof Error && error.message.includes('unique')) {
            return NextResponse.json(
                { error: 'Role with this name already exists' },
                { status: 400 },
            );
        }

        return NextResponse.json(
            { error: 'Failed to update role' },
            { status: 500 },
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await auth();
        const { id } = await params;

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || !modules.includes('user-management')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if any users are assigned to this role
        const usersWithRole = await getUsersWithRole(id);
        if (usersWithRole.length > 0) {
            return NextResponse.json(
                {
                    error: 'Cannot delete role: users are still assigned to this role',
                    usersCount: usersWithRole.length,
                },
                { status: 400 },
            );
        }

        await deleteRole(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting role:', error);

        if (error instanceof ChatSDKError && error.message.includes('users are still assigned')) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 },
            );
        }

        return NextResponse.json(
            { error: 'Failed to delete role' },
            { status: 500 },
        );
    }
}


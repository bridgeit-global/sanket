import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { createBeneficiary } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { serviceId, description, priority, expectedCompletionDate, voterId, partNumbers } = body;

        // Validate required fields
        if (!serviceId || !description || !priority) {
            return NextResponse.json(
                { error: 'Missing required fields: serviceId, description, priority' },
                { status: 400 }
            );
        }

        // Validate that either voterId or partNumbers is provided
        if (!voterId && (!partNumbers || partNumbers.length === 0)) {
            return NextResponse.json(
                { error: 'Either voterId or partNumbers must be provided' },
                { status: 400 }
            );
        }

        let beneficiaries = [];

        if (voterId) {
            // One-to-one service: create single beneficiary
            const beneficiary = await createBeneficiary({
                serviceId,
                voterId,
                notes: description,
            });
            beneficiaries.push(beneficiary);
        } else if (partNumbers && partNumbers.length > 0) {
            // One-to-many service: create beneficiaries for each part
            for (const partNo of partNumbers) {
                const beneficiary = await createBeneficiary({
                    serviceId,
                    partNo,
                    notes: description,
                });
                beneficiaries.push(beneficiary);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully created ${beneficiaries.length} beneficiary service request(s)`,
            data: {
                beneficiaries,
                count: beneficiaries.length
            }
        });

    } catch (error) {
        console.error('Beneficiary creation error:', error);
        return NextResponse.json(
            { error: 'Failed to create beneficiary service request' },
            { status: 500 }
        );
    }
} 
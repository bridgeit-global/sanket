import { NextResponse } from 'next/server';
import { createService, createBeneficiary, getAllServices, getBeneficiaryStats } from '@/lib/db/queries';

export async function GET() {
    try {
        // Test creating services
        const voterRegistrationService = await createService({
            name: 'Voter Registration',
            description: 'Assistance with voter registration process',
            type: 'one-to-one',
            category: 'voter_registration'
        });

        const aadharService = await createService({
            name: 'Aadhar Card Application',
            description: 'Help with Aadhar card application and updates',
            type: 'one-to-one',
            category: 'aadhar_card'
        });

        const publicWorkService = await createService({
            name: 'Road Construction - Part 5',
            description: 'Public work for road construction in Part 5',
            type: 'one-to-many',
            category: 'public_works'
        });

        // Test creating beneficiaries
        const beneficiary1 = await createBeneficiary({
            serviceId: voterRegistrationService.id,
            voterId: 'TEST001',
            notes: 'Test beneficiary for voter registration'
        });

        const beneficiary2 = await createBeneficiary({
            serviceId: aadharService.id,
            voterId: 'TEST002',
            notes: 'Test beneficiary for Aadhar service'
        });

        const beneficiary3 = await createBeneficiary({
            serviceId: publicWorkService.id,
            partNo: 5,
            notes: 'Public work affecting all voters in Part 5'
        });

        // Get all services
        const allServices = await getAllServices();

        // Get statistics
        const stats = await getBeneficiaryStats();

        return NextResponse.json({
            success: true,
            message: 'Beneficiary management system test completed successfully',
            data: {
                services: allServices,
                beneficiaries: [beneficiary1, beneficiary2, beneficiary3],
                statistics: stats
            }
        });

    } catch (error) {
        console.error('Test failed:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Beneficiary management system test failed'
        }, { status: 500 });
    }
} 
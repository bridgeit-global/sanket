import { tool } from 'ai';
import { z } from 'zod';
import { getBeneficiariesByService, getBeneficiariesByVoter, getBeneficiariesByPart, getBeneficiaryStats } from '@/lib/db/queries';

export const getBeneficiariesTool = () => tool({
    description: 'Get beneficiary information. You can search by service ID, voter ID, or part number. If no parameters provided, returns overall statistics.',
    inputSchema: z.object({
        serviceId: z.string().optional().describe('Service ID to get beneficiaries for'),
        voterId: z.string().optional().describe('Voter ID to get beneficiaries for'),
        partNo: z.number().optional().describe('Part number to get beneficiaries for'),
    }),
    execute: async ({ serviceId, voterId, partNo }) => {
        try {
            // If no parameters provided, return overall statistics
            if (!serviceId && !voterId && !partNo) {
                const stats = await getBeneficiaryStats();
                return {
                    type: 'statistics',
                    stats: {
                        totalBeneficiaries: stats.totalBeneficiaries,
                        pendingCount: stats.pendingCount,
                        inProgressCount: stats.inProgressCount,
                        completedCount: stats.completedCount,
                        rejectedCount: stats.rejectedCount,
                        oneToOneCount: stats.oneToOneCount,
                        oneToManyCount: stats.oneToManyCount,
                    },
                    summary: `Total beneficiaries: ${stats.totalBeneficiaries}. Status breakdown: ${stats.pendingCount} pending, ${stats.inProgressCount} in progress, ${stats.completedCount} completed, ${stats.rejectedCount} rejected. Service types: ${stats.oneToOneCount} one-to-one, ${stats.oneToManyCount} one-to-many.`,
                };
            }

            // Get beneficiaries based on provided parameters
            let beneficiaries;
            let searchType;

            if (serviceId) {
                beneficiaries = await getBeneficiariesByService({ serviceId });
                searchType = 'service';
            } else if (voterId) {
                beneficiaries = await getBeneficiariesByVoter({ voterId });
                searchType = 'voter';
            } else if (partNo) {
                beneficiaries = await getBeneficiariesByPart({ partNo });
                searchType = 'part';
            } else {
                return {
                    type: 'error',
                    error: 'No search parameters provided',
                    message: 'Please provide either serviceId, voterId, or partNo to search for beneficiaries.',
                };
            }

            // Process beneficiaries data
            const statusBreakdown = beneficiaries.reduce((acc, beneficiary) => {
                acc[beneficiary.status] = (acc[beneficiary.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const serviceBreakdown = beneficiaries.reduce((acc, beneficiary) => {
                const serviceName = beneficiary.service?.name || 'Unknown';
                acc[serviceName] = (acc[serviceName] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            return {
                type: 'beneficiaries',
                searchType,
                searchValue: serviceId || voterId || partNo,
                totalBeneficiaries: beneficiaries.length,
                beneficiaries: beneficiaries.map(beneficiary => ({
                    id: beneficiary.id,
                    serviceName: beneficiary.service?.name,
                    serviceType: beneficiary.service?.type,
                    serviceCategory: beneficiary.service?.category,
                    voterId: beneficiary.voterId,
                    partNo: beneficiary.partNo,
                    status: beneficiary.status,
                    notes: beneficiary.notes,
                    applicationDate: beneficiary.applicationDate,
                    completionDate: beneficiary.completionDate,
                    voterName: (beneficiary as any).voter?.name,
                    voterPartNo: (beneficiary as any).voter?.part_no,
                    voterSerialNo: (beneficiary as any).voter?.serial_no,
                })),
                statusBreakdown,
                serviceBreakdown,
                summary: `Found ${beneficiaries.length} beneficiaries for ${searchType} ${serviceId || voterId || partNo}. Status breakdown: ${Object.entries(statusBreakdown).map(([status, count]) => `${status}: ${count}`).join(', ')}.`,
            };
        } catch (error) {
            console.error('Error in getBeneficiariesTool:', error);
            throw new Error('Failed to get beneficiaries');
        }
    },
}); 
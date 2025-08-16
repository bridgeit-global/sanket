import { tool } from 'ai';
import { z } from 'zod';
import { getBeneficiariesByService, getBeneficiariesByVoter, getBeneficiariesByPart, getBeneficiaryStats, searchVotersByName } from '@/lib/db/queries';

export const searchBeneficiariesTool = () => tool({
    description: 'Search beneficiaries with comprehensive details and filtering options. Can search by name, service, status, voter details, or get overall statistics.',
    inputSchema: z.object({
        searchType: z.enum(['by_name', 'by_service', 'by_status', 'by_voter', 'by_part', 'statistics']).describe('Type of search to perform'),
        searchValue: z.string().optional().describe('Search value (name, service ID, status, voter ID, etc.)'),
        status: z.enum(['pending', 'in_progress', 'completed', 'rejected']).optional().describe('Filter by beneficiary status'),
        serviceType: z.enum(['one-to-one', 'one-to-many']).optional().describe('Filter by service type'),
        includeOutsideVoters: z.boolean().optional().describe('Whether to include outside voters in results'),
        limit: z.number().optional().describe('Maximum number of results to return'),
    }),
    execute: async ({ searchType, searchValue, status, serviceType, includeOutsideVoters = true, limit = 50 }) => {
        try {
            let beneficiaries = [];
            let searchSummary = '';

            switch (searchType) {
                case 'statistics':
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

                case 'by_service':
                    if (!searchValue) {
                        return {
                            type: 'error',
                            error: 'Service ID required',
                            message: 'Please provide a service ID to search by service.',
                        };
                    }
                    beneficiaries = await getBeneficiariesByService({ serviceId: searchValue });
                    searchSummary = `Searching beneficiaries for service ID: ${searchValue}`;
                    break;

                case 'by_voter':
                    if (!searchValue) {
                        return {
                            type: 'error',
                            error: 'Voter ID required',
                            message: 'Please provide a voter ID to search by voter.',
                        };
                    }
                    beneficiaries = await getBeneficiariesByVoter({ voterId: searchValue });
                    searchSummary = `Searching beneficiaries for voter ID: ${searchValue}`;
                    break;

                case 'by_part':
                    if (!searchValue) {
                        return {
                            type: 'error',
                            error: 'Part number required',
                            message: 'Please provide a part number to search by part.',
                        };
                    }
                    beneficiaries = await getBeneficiariesByPart({ partNo: parseInt(searchValue) });
                    searchSummary = `Searching beneficiaries for part number: ${searchValue}`;
                    break;

                case 'by_name':
                    if (!searchValue) {
                        return {
                            type: 'error',
                            error: 'Name required',
                            message: 'Please provide a name to search by beneficiary name.',
                        };
                    }
                    // For name search, we need to search through all beneficiaries and filter by name in notes
                    // This is a simplified approach - in a real system, you might want to add a name field to beneficiaries table
                    const allBeneficiaries = await getBeneficiaryStats();
                    // For now, return a message that name search requires additional implementation
                    return {
                        type: 'info',
                        message: 'Name-based search requires additional database fields. Please use voter ID or service ID search instead.',
                        suggestion: 'Try searching by voter ID if the person is in the voter database, or by service ID to see all beneficiaries of a specific service.',
                    };

                case 'by_status':
                    // Get all beneficiaries and filter by status
                    // This would require a more comprehensive query in the database
                    return {
                        type: 'info',
                        message: 'Status-based search requires additional database implementation. Please use service ID or voter ID search instead.',
                        suggestion: 'Try searching by service ID to see all beneficiaries of a specific service, then filter by status.',
                    };

                default:
                    return {
                        type: 'error',
                        error: 'Invalid search type',
                        message: 'Please provide a valid search type.',
                    };
            }

            // Apply filters
            if (status) {
                beneficiaries = beneficiaries.filter(b => b.status === status);
            }

            if (serviceType) {
                beneficiaries = beneficiaries.filter(b => b.service?.type === serviceType);
            }

            if (!includeOutsideVoters) {
                beneficiaries = beneficiaries.filter(b => b.voterId !== null);
            }

            // Apply limit
            if (limit && beneficiaries.length > limit) {
                beneficiaries = beneficiaries.slice(0, limit);
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

            const voterTypeBreakdown = beneficiaries.reduce((acc, beneficiary) => {
                const type = beneficiary.voterId ? 'existing_voter' : 'outside_voter';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            return {
                type: 'beneficiaries',
                searchType,
                searchValue,
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
                    isOutsideVoter: !beneficiary.voterId,
                })),
                statusBreakdown,
                serviceBreakdown,
                voterTypeBreakdown,
                filters: {
                    status,
                    serviceType,
                    includeOutsideVoters,
                    limit,
                },
                summary: `${searchSummary}. Found ${beneficiaries.length} beneficiaries. Status breakdown: ${Object.entries(statusBreakdown).map(([status, count]) => `${status}: ${count}`).join(', ')}. Voter types: ${Object.entries(voterTypeBreakdown).map(([type, count]) => `${type}: ${count}`).join(', ')}.`,
            };
        } catch (error) {
            console.error('Error in searchBeneficiariesTool:', error);
            throw new Error('Failed to search beneficiaries');
        }
    },
}); 
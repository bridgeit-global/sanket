import { tool } from 'ai';
import { z } from 'zod';
import { getBeneficiariesByService, getBeneficiariesByVoter, getBeneficiariesByPart, getBeneficiaryStats } from '@/lib/db/queries';

export const trackBeneficiaryProgressTool = () => tool({
    description: 'Track beneficiary progress with detailed analytics and insights. Can track by service, voter, part, or overall progress.',
    inputSchema: z.object({
        trackType: z.enum(['by_service', 'by_voter', 'by_part', 'overall']).describe('Type of progress tracking'),
        serviceId: z.string().optional().describe('Service ID for service-specific tracking'),
        voterId: z.string().optional().describe('Voter ID for voter-specific tracking'),
        partNo: z.number().optional().describe('Part number for part-specific tracking'),
        includeOutsideVoters: z.boolean().optional().describe('Whether to include outside voters in tracking'),
        timeRange: z.enum(['all', 'this_month', 'this_quarter', 'this_year']).optional().describe('Time range for tracking'),
    }),
    execute: async ({ trackType, serviceId, voterId, partNo, includeOutsideVoters = true, timeRange = 'all' }) => {
        try {
            let beneficiaries: any[] = [];
            let trackingSummary = '';

            switch (trackType) {
                case 'by_service':
                    if (!serviceId) {
                        return {
                            success: false,
                            error: 'Service ID required',
                            message: 'Please provide a service ID for service-specific tracking.',
                        };
                    }
                    beneficiaries = await getBeneficiariesByService({ serviceId });
                    trackingSummary = `Progress tracking for service ID: ${serviceId}`;
                    break;

                case 'by_voter':
                    if (!voterId) {
                        return {
                            success: false,
                            error: 'Voter ID required',
                            message: 'Please provide a voter ID for voter-specific tracking.',
                        };
                    }
                    beneficiaries = await getBeneficiariesByVoter({ voterId });
                    trackingSummary = `Progress tracking for voter ID: ${voterId}`;
                    break;

                case 'by_part':
                    if (!partNo) {
                        return {
                            success: false,
                            error: 'Part number required',
                            message: 'Please provide a part number for part-specific tracking.',
                        };
                    }
                    beneficiaries = await getBeneficiariesByPart({ partNo });
                    trackingSummary = `Progress tracking for part number: ${partNo}`;
                    break;

                case 'overall':
                    // For overall tracking, we'll use statistics
                    const stats = await getBeneficiaryStats();
                    return {
                        type: 'overall_progress',
                        stats: {
                            totalBeneficiaries: stats.totalBeneficiaries,
                            pendingCount: stats.pendingCount,
                            inProgressCount: stats.inProgressCount,
                            completedCount: stats.completedCount,
                            rejectedCount: stats.rejectedCount,
                            oneToOneCount: stats.oneToOneCount,
                            oneToManyCount: stats.oneToManyCount,
                        },
                        progressMetrics: {
                            completionRate: stats.totalBeneficiaries > 0 ? ((stats.completedCount / stats.totalBeneficiaries) * 100).toFixed(2) : '0',
                            rejectionRate: stats.totalBeneficiaries > 0 ? ((stats.rejectedCount / stats.totalBeneficiaries) * 100).toFixed(2) : '0',
                            pendingRate: stats.totalBeneficiaries > 0 ? ((stats.pendingCount / stats.totalBeneficiaries) * 100).toFixed(2) : '0',
                            inProgressRate: stats.totalBeneficiaries > 0 ? ((stats.inProgressCount / stats.totalBeneficiaries) * 100).toFixed(2) : '0',
                        },
                        summary: `Overall progress: ${stats.totalBeneficiaries} total beneficiaries. Completion rate: ${stats.totalBeneficiaries > 0 ? ((stats.completedCount / stats.totalBeneficiaries) * 100).toFixed(2) : '0'}%. Status breakdown: ${stats.pendingCount} pending (${stats.totalBeneficiaries > 0 ? ((stats.pendingCount / stats.totalBeneficiaries) * 100).toFixed(2) : '0'}%), ${stats.inProgressCount} in progress (${stats.totalBeneficiaries > 0 ? ((stats.inProgressCount / stats.totalBeneficiaries) * 100).toFixed(2) : '0'}%), ${stats.completedCount} completed (${stats.totalBeneficiaries > 0 ? ((stats.completedCount / stats.totalBeneficiaries) * 100).toFixed(2) : '0'}%), ${stats.rejectedCount} rejected (${stats.totalBeneficiaries > 0 ? ((stats.rejectedCount / stats.totalBeneficiaries) * 100).toFixed(2) : '0'}%).`,
                    };
            }

            // Apply filters
            if (!includeOutsideVoters) {
                beneficiaries = beneficiaries.filter(b => b.voterId !== null);
            }

            // Apply time range filter (simplified - in real implementation, you'd filter by dates)
            if (timeRange !== 'all') {
                const now = new Date();
                let startDate: Date;

                switch (timeRange) {
                    case 'this_month':
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                        break;
                    case 'this_quarter':
                        const quarter = Math.floor(now.getMonth() / 3);
                        startDate = new Date(now.getFullYear(), quarter * 3, 1);
                        break;
                    case 'this_year':
                        startDate = new Date(now.getFullYear(), 0, 1);
                        break;
                    default:
                        startDate = new Date(0);
                }

                beneficiaries = beneficiaries.filter(b => new Date(b.applicationDate) >= startDate);
            }

            // Calculate progress metrics
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

            const totalBeneficiaries = beneficiaries.length;
            const completionRate = totalBeneficiaries > 0 ? ((statusBreakdown.completed || 0) / totalBeneficiaries * 100).toFixed(2) : '0';
            const rejectionRate = totalBeneficiaries > 0 ? ((statusBreakdown.rejected || 0) / totalBeneficiaries * 100).toFixed(2) : '0';
            const pendingRate = totalBeneficiaries > 0 ? ((statusBreakdown.pending || 0) / totalBeneficiaries * 100).toFixed(2) : '0';
            const inProgressRate = totalBeneficiaries > 0 ? ((statusBreakdown.in_progress || 0) / totalBeneficiaries * 100).toFixed(2) : '0';

            // Calculate average processing time for completed beneficiaries
            const completedBeneficiaries = beneficiaries.filter(b => b.status === 'completed' && b.completionDate);
            let avgProcessingDays = 0;
            if (completedBeneficiaries.length > 0) {
                const totalDays = completedBeneficiaries.reduce((sum, b) => {
                    const start = new Date(b.applicationDate);
                    const end = new Date(b.completionDate);
                    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
                }, 0);
                avgProcessingDays = totalDays / completedBeneficiaries.length;
            }

            return {
                type: 'progress_tracking',
                trackType,
                trackingSummary,
                totalBeneficiaries,
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
                progressMetrics: {
                    completionRate,
                    rejectionRate,
                    pendingRate,
                    inProgressRate,
                    avgProcessingDays: avgProcessingDays.toFixed(1),
                    completedCount: statusBreakdown.completed || 0,
                    inProgressCount: statusBreakdown.in_progress || 0,
                    pendingCount: statusBreakdown.pending || 0,
                    rejectedCount: statusBreakdown.rejected || 0,
                },
                filters: {
                    includeOutsideVoters,
                    timeRange,
                },
                summary: `${trackingSummary}. Total beneficiaries: ${totalBeneficiaries}. Completion rate: ${completionRate}%. Average processing time: ${avgProcessingDays.toFixed(1)} days. Status breakdown: ${Object.entries(statusBreakdown).map(([status, count]) => `${status}: ${count as number} (${totalBeneficiaries > 0 ? (((count as number) / totalBeneficiaries) * 100).toFixed(2) : '0'}%)`).join(', ')}.`,
            };
        } catch (error) {
            console.error('Error in trackBeneficiaryProgressTool:', error);
            throw new Error('Failed to track beneficiary progress');
        }
    },
}); 
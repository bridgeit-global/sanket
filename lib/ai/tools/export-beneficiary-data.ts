import { tool } from 'ai';
import { z } from 'zod';
import { getBeneficiariesByService, getBeneficiariesByVoter, getBeneficiariesByPart, getBeneficiaryStats, getAllServices } from '@/lib/db/queries';

export const exportBeneficiaryDataTool = () => tool({
    description: 'Export beneficiary data with comprehensive reporting capabilities. Can export by service, voter, part, or generate overall reports.',
    inputSchema: z.object({
        exportType: z.enum(['by_service', 'by_voter', 'by_part', 'overall_report', 'service_summary']).describe('Type of export to perform'),
        serviceId: z.string().optional().describe('Service ID for service-specific export'),
        voterId: z.string().optional().describe('Voter ID for voter-specific export'),
        partNo: z.number().optional().describe('Part number for part-specific export'),
        includeOutsideVoters: z.boolean().optional().describe('Whether to include outside voters in export'),
        format: z.enum(['summary', 'detailed', 'analytics']).optional().describe('Export format'),
        timeRange: z.enum(['all', 'this_month', 'this_quarter', 'this_year']).optional().describe('Time range for export'),
    }),
    execute: async ({ exportType, serviceId, voterId, partNo, includeOutsideVoters = true, format = 'summary', timeRange = 'all' }) => {
        try {
            let beneficiaries: any[] = [];
            let exportSummary = '';

            switch (exportType) {
                case 'by_service':
                    if (!serviceId) {
                        return {
                            success: false,
                            error: 'Service ID required',
                            message: 'Please provide a service ID for service-specific export.',
                        };
                    }
                    beneficiaries = await getBeneficiariesByService({ serviceId });
                    exportSummary = `Export for service ID: ${serviceId}`;
                    break;

                case 'by_voter':
                    if (!voterId) {
                        return {
                            success: false,
                            error: 'Voter ID required',
                            message: 'Please provide a voter ID for voter-specific export.',
                        };
                    }
                    beneficiaries = await getBeneficiariesByVoter({ voterId });
                    exportSummary = `Export for voter ID: ${voterId}`;
                    break;

                case 'by_part':
                    if (!partNo) {
                        return {
                            success: false,
                            error: 'Part number required',
                            message: 'Please provide a part number for part-specific export.',
                        };
                    }
                    beneficiaries = await getBeneficiariesByPart({ partNo });
                    exportSummary = `Export for part number: ${partNo}`;
                    break;

                case 'overall_report':
                    // For overall report, we'll use statistics and provide comprehensive overview
                    const stats = await getBeneficiaryStats();
                    const services = await getAllServices();

                    return {
                        type: 'overall_report',
                        exportType,
                        format,
                        timeRange,
                        overallStats: {
                            totalBeneficiaries: stats.totalBeneficiaries,
                            pendingCount: stats.pendingCount,
                            inProgressCount: stats.inProgressCount,
                            completedCount: stats.completedCount,
                            rejectedCount: stats.rejectedCount,
                            oneToOneCount: stats.oneToOneCount,
                            oneToManyCount: stats.oneToManyCount,
                        },
                        services: services.map(service => ({
                            id: service.id,
                            name: service.name,
                            type: service.type,
                            category: service.category,
                            description: service.description,
                        })),
                        progressMetrics: {
                            completionRate: stats.totalBeneficiaries > 0 ? ((stats.completedCount / stats.totalBeneficiaries) * 100).toFixed(2) : '0',
                            rejectionRate: stats.totalBeneficiaries > 0 ? ((stats.rejectedCount / stats.totalBeneficiaries) * 100).toFixed(2) : '0',
                            pendingRate: stats.totalBeneficiaries > 0 ? ((stats.pendingCount / stats.totalBeneficiaries) * 100).toFixed(2) : '0',
                            inProgressRate: stats.totalBeneficiaries > 0 ? ((stats.inProgressCount / stats.totalBeneficiaries) * 100).toFixed(2) : '0',
                        },
                        summary: `Overall beneficiary report: ${stats.totalBeneficiaries} total beneficiaries across ${services.length} services. Completion rate: ${stats.totalBeneficiaries > 0 ? ((stats.completedCount / stats.totalBeneficiaries) * 100).toFixed(2) : '0'}%. Service types: ${stats.oneToOneCount} one-to-one, ${stats.oneToManyCount} one-to-many.`,
                    };

                case 'service_summary':
                    const allServices = await getAllServices();
                    const serviceStats = await Promise.all(
                        allServices.map(async (service) => {
                            const serviceBeneficiaries = await getBeneficiariesByService({ serviceId: service.id });
                            const statusBreakdown = serviceBeneficiaries.reduce((acc, beneficiary) => {
                                acc[beneficiary.status] = (acc[beneficiary.status] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>);

                            return {
                                serviceId: service.id,
                                serviceName: service.name,
                                serviceType: service.type,
                                serviceCategory: service.category,
                                totalBeneficiaries: serviceBeneficiaries.length,
                                statusBreakdown,
                                completionRate: serviceBeneficiaries.length > 0 ? ((statusBreakdown.completed || 0) / serviceBeneficiaries.length * 100).toFixed(2) : '0',
                            };
                        })
                    );

                    return {
                        type: 'service_summary',
                        exportType,
                        format,
                        timeRange,
                        services: serviceStats,
                        totalServices: allServices.length,
                        summary: `Service summary report: ${allServices.length} services with beneficiary data. Each service shows total beneficiaries and completion rates.`,
                    };

                default:
                    return {
                        success: false,
                        error: 'Invalid export type',
                        message: 'Please provide a valid export type.',
                    };
            }

            // Apply filters
            if (!includeOutsideVoters) {
                beneficiaries = beneficiaries.filter(b => b.voterId !== null);
            }

            // Apply time range filter
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

            // Process data based on format
            if (format === 'summary') {
                const statusBreakdown = beneficiaries.reduce((acc, beneficiary) => {
                    acc[beneficiary.status] = (acc[beneficiary.status] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                const voterTypeBreakdown = beneficiaries.reduce((acc, beneficiary) => {
                    const type = beneficiary.voterId ? 'existing_voter' : 'outside_voter';
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                return {
                    type: 'summary_export',
                    exportType,
                    exportSummary,
                    format,
                    timeRange,
                    totalBeneficiaries: beneficiaries.length,
                    statusBreakdown,
                    voterTypeBreakdown,
                    summary: `${exportSummary}. Total beneficiaries: ${beneficiaries.length}. Status breakdown: ${Object.entries(statusBreakdown).map(([status, count]) => `${status}: ${count}`).join(', ')}. Voter types: ${Object.entries(voterTypeBreakdown).map(([type, count]) => `${type}: ${count}`).join(', ')}.`,
                };
            } else if (format === 'detailed') {
                return {
                    type: 'detailed_export',
                    exportType,
                    exportSummary,
                    format,
                    timeRange,
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
                    summary: `${exportSummary}. Detailed export of ${beneficiaries.length} beneficiaries with full information.`,
                };
            } else if (format === 'analytics') {
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
                    type: 'analytics_export',
                    exportType,
                    exportSummary,
                    format,
                    timeRange,
                    totalBeneficiaries,
                    statusBreakdown,
                    serviceBreakdown,
                    voterTypeBreakdown,
                    analytics: {
                        completionRate,
                        rejectionRate,
                        avgProcessingDays: avgProcessingDays.toFixed(1),
                        completedCount: statusBreakdown.completed || 0,
                        inProgressCount: statusBreakdown.in_progress || 0,
                        pendingCount: statusBreakdown.pending || 0,
                        rejectedCount: statusBreakdown.rejected || 0,
                    },
                    summary: `${exportSummary}. Analytics export: ${totalBeneficiaries} beneficiaries. Completion rate: ${completionRate}%. Average processing time: ${avgProcessingDays.toFixed(1)} days. Status breakdown: ${Object.entries(statusBreakdown).map(([status, count]) => `${status}: ${count as number} (${totalBeneficiaries > 0 ? (((count as number) / totalBeneficiaries) * 100).toFixed(2) : '0'}%)`).join(', ')}.`,
                };
            }

            return {
                success: false,
                error: 'Invalid format',
                message: 'Please provide a valid export format.',
            };
        } catch (error) {
            console.error('Error in exportBeneficiaryDataTool:', error);
            throw new Error('Failed to export beneficiary data');
        }
    },
}); 
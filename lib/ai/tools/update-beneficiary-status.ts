import { tool } from 'ai';
import { z } from 'zod';
import { updateBeneficiary, getBeneficiariesByService, getBeneficiariesByVoter, getBeneficiariesByPart } from '@/lib/db/queries';

export const updateBeneficiaryStatusTool = () => tool({
    description: 'Update beneficiary status and track progress. Can update individual beneficiaries or bulk update by service/voter/part.',
    inputSchema: z.object({
        updateType: z.enum(['individual', 'bulk']).describe('Whether to update individual beneficiary or bulk update'),
        beneficiaryId: z.string().optional().describe('Individual beneficiary ID (required for individual updates)'),
        serviceId: z.string().optional().describe('Service ID for bulk updates'),
        voterId: z.string().optional().describe('Voter ID for bulk updates'),
        partNo: z.number().optional().describe('Part number for bulk updates'),
        status: z.enum(['pending', 'in_progress', 'completed', 'rejected']).describe('New status for the beneficiary(ies)'),
        notes: z.string().optional().describe('Additional notes or comments about the status update'),
        completionDate: z.string().optional().describe('Completion date (ISO string format) - only for completed status'),
        progressNotes: z.string().optional().describe('Progress notes for in_progress status'),
    }),
    execute: async ({ updateType, beneficiaryId, serviceId, voterId, partNo, status, notes, completionDate, progressNotes }) => {
        try {
            let beneficiaries: any[] = [];
            let updateSummary = '';

            if (updateType === 'individual') {
                if (!beneficiaryId) {
                    return {
                        success: false,
                        error: 'Beneficiary ID required',
                        message: 'Please provide a beneficiary ID for individual updates.',
                    };
                }

                // For individual updates, we need to get the beneficiary first
                // Since we don't have a getBeneficiaryById function, we'll use the updateBeneficiary function
                const updateData: any = { status };
                if (notes) updateData.notes = notes;
                if (completionDate && status === 'completed') {
                    updateData.completionDate = new Date(completionDate);
                }
                if (progressNotes && status === 'in_progress') {
                    updateData.notes = updateData.notes ? `${updateData.notes}\n\nProgress: ${progressNotes}` : `Progress: ${progressNotes}`;
                }

                const beneficiary = await updateBeneficiary({
                    id: beneficiaryId,
                    ...updateData,
                });

                if (!beneficiary) {
                    return {
                        success: false,
                        error: 'Beneficiary not found',
                        message: 'The specified beneficiary does not exist.',
                    };
                }

                return {
                    success: true,
                    updateType: 'individual',
                    beneficiary: {
                        id: beneficiary.id,
                        serviceId: beneficiary.serviceId,
                        voterId: beneficiary.voterId,
                        partNo: beneficiary.partNo,
                        status: beneficiary.status,
                        notes: beneficiary.notes,
                        applicationDate: beneficiary.applicationDate,
                        completionDate: beneficiary.completionDate,
                    },
                    message: `Beneficiary status updated to "${status}".`,
                    summary: `Updated individual beneficiary ${beneficiaryId} status to ${status}.`,
                };
            } else {
                // Bulk update
                if (!serviceId && !voterId && !partNo) {
                    return {
                        success: false,
                        error: 'Search criteria required',
                        message: 'Please provide serviceId, voterId, or partNo for bulk updates.',
                    };
                }

                // Get beneficiaries based on criteria
                if (serviceId) {
                    beneficiaries = await getBeneficiariesByService({ serviceId });
                    updateSummary = `Bulk update for service ID: ${serviceId}`;
                } else if (voterId) {
                    beneficiaries = await getBeneficiariesByVoter({ voterId });
                    updateSummary = `Bulk update for voter ID: ${voterId}`;
                } else if (partNo) {
                    beneficiaries = await getBeneficiariesByPart({ partNo });
                    updateSummary = `Bulk update for part number: ${partNo}`;
                }

                if (beneficiaries.length === 0) {
                    return {
                        success: false,
                        error: 'No beneficiaries found',
                        message: 'No beneficiaries found matching the specified criteria.',
                    };
                }

                // Update each beneficiary
                const updatePromises = beneficiaries.map(async (beneficiary) => {
                    const updateData: any = { status };
                    if (notes) updateData.notes = notes;
                    if (completionDate && status === 'completed') {
                        updateData.completionDate = new Date(completionDate);
                    }
                    if (progressNotes && status === 'in_progress') {
                        updateData.notes = updateData.notes ? `${updateData.notes}\n\nProgress: ${progressNotes}` : `Progress: ${progressNotes}`;
                    }

                    return await updateBeneficiary({
                        id: beneficiary.id,
                        ...updateData,
                    });
                });

                const updatedBeneficiaries = await Promise.all(updatePromises);

                const statusBreakdown = updatedBeneficiaries.reduce((acc, beneficiary) => {
                    acc[beneficiary.status] = (acc[beneficiary.status] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                return {
                    success: true,
                    updateType: 'bulk',
                    totalUpdated: updatedBeneficiaries.length,
                    beneficiaries: updatedBeneficiaries.map(beneficiary => ({
                        id: beneficiary.id,
                        serviceId: beneficiary.serviceId,
                        voterId: beneficiary.voterId,
                        partNo: beneficiary.partNo,
                        status: beneficiary.status,
                        notes: beneficiary.notes,
                        applicationDate: beneficiary.applicationDate,
                        completionDate: beneficiary.completionDate,
                    })),
                    statusBreakdown,
                    message: `Successfully updated ${updatedBeneficiaries.length} beneficiaries to status "${status}".`,
                    summary: `${updateSummary}. Updated ${updatedBeneficiaries.length} beneficiaries to ${status}. Status breakdown: ${Object.entries(statusBreakdown).map(([status, count]) => `${status}: ${count}`).join(', ')}.`,
                };
            }
        } catch (error) {
            console.error('Error in updateBeneficiaryStatusTool:', error);
            throw new Error('Failed to update beneficiary status');
        }
    },
}); 
import { tool } from 'ai';
import { z } from 'zod';
import { updateBeneficiary } from '@/lib/db/queries';

export const updateBeneficiaryTool = () => tool({
    description: 'Update beneficiary status and information. You can update status, notes, and completion date.',
    inputSchema: z.object({
        beneficiaryId: z.string().describe('ID of the beneficiary to update'),
        status: z.enum(['pending', 'in_progress', 'completed', 'rejected']).optional().describe('New status for the beneficiary'),
        notes: z.string().optional().describe('Additional notes or comments'),
        completionDate: z.string().optional().describe('Completion date (ISO string format)'),
    }),
    execute: async ({ beneficiaryId, status, notes, completionDate }) => {
        try {
            const updateData: any = {};
            if (status !== undefined) updateData.status = status;
            if (notes !== undefined) updateData.notes = notes;
            if (completionDate !== undefined) {
                updateData.completionDate = new Date(completionDate);
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
                message: `Beneficiary status updated successfully.`,
                summary: `Updated beneficiary ${beneficiaryId}. New status: ${beneficiary.status}. ${notes ? `Notes: ${notes}` : ''} ${completionDate ? `Completion date: ${completionDate}` : ''}`,
            };
        } catch (error) {
            console.error('Error in updateBeneficiaryTool:', error);
            throw new Error('Failed to update beneficiary');
        }
    },
}); 
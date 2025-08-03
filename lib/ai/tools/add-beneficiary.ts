import { tool } from 'ai';
import { z } from 'zod';
import { createBeneficiary, getServiceById, getVoterById } from '@/lib/db/queries';

export const addBeneficiaryTool = () => tool({
    description: 'Add a beneficiary to a service. For one-to-one services, provide voterId. For one-to-many services, provide partNo. ALWAYS ask for service details and beneficiary information including voter details, contact information, and specific requirements.',
    inputSchema: z.object({
        serviceId: z.string().describe('ID of the service to add beneficiary to'),
        voterId: z.string().optional().describe('Voter ID (required for one-to-one services)'),
        partNo: z.number().optional().describe('Part number (required for one-to-many services)'),
        notes: z.string().optional().describe('Additional notes about the beneficiary'),
    }),
    execute: async ({ serviceId, voterId, partNo, notes }) => {
        try {
            // Get service details to validate
            const service = await getServiceById({ id: serviceId });
            if (!service) {
                return {
                    success: false,
                    error: 'Service not found',
                    message: 'The specified service does not exist.',
                };
            }

            // Validate based on service type
            if (service.type === 'one-to-one' && !voterId) {
                return {
                    success: false,
                    error: 'Voter ID required',
                    message: `Service "${service.name}" is a one-to-one service and requires a voter ID.`,
                };
            }

            if (service.type === 'one-to-many' && !partNo) {
                return {
                    success: false,
                    error: 'Part number required',
                    message: `Service "${service.name}" is a one-to-many service and requires a part number.`,
                };
            }

            // For one-to-one services, validate that voter exists
            if (service.type === 'one-to-one' && voterId) {
                const voter = await getVoterById({ id: voterId });
                if (!voter) {
                    return {
                        success: false,
                        error: 'Voter not found',
                        message: `Voter with ID "${voterId}" not found in the system.`,
                    };
                }
            }

            const beneficiary = await createBeneficiary({
                serviceId,
                voterId,
                partNo,
                notes,
            });

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
                },
                service: {
                    name: service.name,
                    type: service.type,
                    category: service.category,
                },
                message: `Beneficiary successfully added to service "${service.name}".`,
                summary: `Added beneficiary to ${service.type} service "${service.name}". Status: ${beneficiary.status}. ${service.type === 'one-to-one' ? `Voter ID: ${voterId}` : `Part No: ${partNo}`}`,
            };
        } catch (error) {
            console.error('Error in addBeneficiaryTool:', error);
            throw new Error('Failed to add beneficiary');
        }
    },
}); 
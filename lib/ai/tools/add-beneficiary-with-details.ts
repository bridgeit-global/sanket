import { tool } from 'ai';
import { z } from 'zod';
import { createBeneficiary, getServiceById, getVoterById, searchVotersByName } from '@/lib/db/queries';

export const addBeneficiaryWithDetailsTool = () => tool({
    description: 'Add a beneficiary to a service with comprehensive details. Can handle both existing voters and outside voters. For existing voters, links to voter record. For outside voters, creates standalone beneficiary record. ALWAYS ask for comprehensive beneficiary details including name, age, gender, contact information, address, and family details.',
    inputSchema: z.object({
        serviceId: z.string().describe('ID of the service to add beneficiary to'),
        beneficiaryName: z.string().describe('Full name of the beneficiary'),
        beneficiaryDetails: z.object({
            age: z.number().optional().describe('Age of the beneficiary'),
            gender: z.enum(['male', 'female', 'other']).optional().describe('Gender of the beneficiary'),
            mobile: z.string().optional().describe('Mobile number of the beneficiary'),
            email: z.string().optional().describe('Email address of the beneficiary'),
            address: z.string().optional().describe('Address of the beneficiary'),
            family: z.string().optional().describe('Family name or surname'),
        }).optional().describe('Additional details about the beneficiary'),
        voterId: z.string().optional().describe('Voter ID if beneficiary is an existing voter'),
        partNo: z.number().optional().describe('Part number (required for one-to-many services)'),
        notes: z.string().optional().describe('Additional notes about the beneficiary'),
        isOutsideVoter: z.boolean().optional().describe('Whether this is an outside voter (not in voter database)'),
    }),
    execute: async ({ serviceId, beneficiaryName, beneficiaryDetails, voterId, partNo, notes, isOutsideVoter }) => {
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
            if (service.type === 'one-to-one' && !voterId && !isOutsideVoter) {
                return {
                    success: false,
                    error: 'Voter ID or outside voter flag required',
                    message: `Service "${service.name}" is a one-to-one service and requires either a voter ID or outside voter flag.`,
                };
            }

            if (service.type === 'one-to-many' && !partNo) {
                return {
                    success: false,
                    error: 'Part number required',
                    message: `Service "${service.name}" is a one-to-many service and requires a part number.`,
                };
            }

            let voterInfo = null;
            let beneficiaryType = 'unknown';

            // Handle voter lookup and validation
            if (voterId && !isOutsideVoter) {
                // Check if voter exists in database
                voterInfo = await getVoterById({ id: voterId });
                if (voterInfo) {
                    beneficiaryType = 'existing_voter';
                } else {
                    return {
                        success: false,
                        error: 'Voter not found',
                        message: `Voter with ID "${voterId}" not found in the system. Please use isOutsideVoter flag for outside voters.`,
                    };
                }
            } else if (isOutsideVoter) {
                beneficiaryType = 'outside_voter';
                // For outside voters, we don't link to voter table
                voterId = undefined;
            }

            // Create beneficiary record
            const beneficiary = await createBeneficiary({
                serviceId,
                voterId,
                partNo,
                notes: notes ? `${notes}\n\nBeneficiary Details:\nName: ${beneficiaryName}${beneficiaryDetails ? `\nAge: ${beneficiaryDetails.age || 'N/A'}\nGender: ${beneficiaryDetails.gender || 'N/A'}\nMobile: ${beneficiaryDetails.mobile || 'N/A'}\nEmail: ${beneficiaryDetails.email || 'N/A'}\nAddress: ${beneficiaryDetails.address || 'N/A'}\nFamily: ${beneficiaryDetails.family || 'N/A'}` : ''}` : `Beneficiary Details:\nName: ${beneficiaryName}${beneficiaryDetails ? `\nAge: ${beneficiaryDetails.age || 'N/A'}\nGender: ${beneficiaryDetails.gender || 'N/A'}\nMobile: ${beneficiaryDetails.mobile || 'N/A'}\nEmail: ${beneficiaryDetails.email || 'N/A'}\nAddress: ${beneficiaryDetails.address || 'N/A'}\nFamily: ${beneficiaryDetails.family || 'N/A'}` : ''}`,
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
                beneficiaryDetails: {
                    name: beneficiaryName,
                    type: beneficiaryType,
                    ...beneficiaryDetails,
                },
                service: {
                    name: service.name,
                    type: service.type,
                    category: service.category,
                },
                voterInfo: voterInfo ? {
                    id: voterInfo.id,
                    name: voterInfo.name,
                    part_no: voterInfo.part_no,
                    serial_no: voterInfo.serial_no,
                    gender: voterInfo.gender,
                    age: voterInfo.age,
                } : null,
                message: `Beneficiary "${beneficiaryName}" successfully added to service "${service.name}". ${beneficiaryType === 'existing_voter' ? 'Linked to existing voter record.' : beneficiaryType === 'outside_voter' ? 'Added as outside voter (not linked to voter database).' : ''}`,
                summary: `Added ${beneficiaryType} beneficiary "${beneficiaryName}" to ${service.type} service "${service.name}". Status: ${beneficiary.status}.`,
            };
        } catch (error) {
            console.error('Error in addBeneficiaryWithDetailsTool:', error);
            throw new Error('Failed to add beneficiary with details');
        }
    },
}); 
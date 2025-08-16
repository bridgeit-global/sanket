import { tool } from 'ai';
import { z } from 'zod';
import { updateBeneficiary, getVoterById, searchVotersByName, getBeneficiariesByVoter } from '@/lib/db/queries';

export const linkBeneficiaryToVoterTool = () => tool({
    description: 'Link beneficiaries to voters and manage voter relationships. Can link existing beneficiaries to voters or search for voters by name.',
    inputSchema: z.object({
        action: z.enum(['link_beneficiary', 'search_voter', 'unlink_beneficiary']).describe('Action to perform'),
        beneficiaryId: z.string().optional().describe('Beneficiary ID to link/unlink'),
        voterId: z.string().optional().describe('Voter ID to link to'),
        voterName: z.string().optional().describe('Voter name to search for'),
        notes: z.string().optional().describe('Additional notes about the linking'),
    }),
    execute: async ({ action, beneficiaryId, voterId, voterName, notes }) => {
        try {
            switch (action) {
                case 'link_beneficiary':
                    if (!beneficiaryId || !voterId) {
                        return {
                            success: false,
                            error: 'Missing parameters',
                            message: 'Please provide both beneficiaryId and voterId for linking.',
                        };
                    }

                    // Verify voter exists
                    const voter = await getVoterById({ id: voterId });
                    if (!voter) {
                        return {
                            success: false,
                            error: 'Voter not found',
                            message: `Voter with ID "${voterId}" not found in the system.`,
                        };
                    }

                    // Update beneficiary to link to voter
                    const updateData: any = { voterId };
                    if (notes) {
                        updateData.notes = notes;
                    }

                    const linkedBeneficiary = await updateBeneficiary({
                        id: beneficiaryId,
                        ...updateData,
                    });

                    if (!linkedBeneficiary) {
                        return {
                            success: false,
                            error: 'Beneficiary not found',
                            message: 'The specified beneficiary does not exist.',
                        };
                    }

                    return {
                        success: true,
                        action: 'link_beneficiary',
                        beneficiary: {
                            id: linkedBeneficiary.id,
                            serviceId: linkedBeneficiary.serviceId,
                            voterId: linkedBeneficiary.voterId,
                            partNo: linkedBeneficiary.partNo,
                            status: linkedBeneficiary.status,
                            notes: linkedBeneficiary.notes,
                            applicationDate: linkedBeneficiary.applicationDate,
                            completionDate: linkedBeneficiary.completionDate,
                        },
                        voter: {
                            id: voter.id,
                            name: voter.name,
                            part_no: voter.part_no,
                            serial_no: voter.serial_no,
                            gender: voter.gender,
                            age: voter.age,
                        },
                        message: `Beneficiary successfully linked to voter "${voter.name}" (ID: ${voterId}).`,
                        summary: `Linked beneficiary ${beneficiaryId} to voter ${voter.name} (${voterId}).`,
                    };

                case 'search_voter':
                    if (!voterName) {
                        return {
                            success: false,
                            error: 'Voter name required',
                            message: 'Please provide a voter name to search for.',
                        };
                    }

                    const searchResults = await searchVotersByName({ name: voterName });

                    if (searchResults.length === 0) {
                        return {
                            success: false,
                            error: 'No voters found',
                            message: `No voters found with name containing "${voterName}".`,
                        };
                    }

                    return {
                        success: true,
                        action: 'search_voter',
                        searchTerm: voterName,
                        voters: searchResults.map(voter => ({
                            id: voter.id,
                            name: voter.name,
                            part_no: voter.part_no,
                            serial_no: voter.serial_no,
                            gender: voter.gender,
                            age: voter.age,
                            family: voter.family,
                            last_name: voter.last_name,
                        })),
                        message: `Found ${searchResults.length} voter(s) matching "${voterName}".`,
                        summary: `Found ${searchResults.length} voter(s) matching "${voterName}". Use voter ID to link beneficiaries.`,
                    };

                case 'unlink_beneficiary':
                    if (!beneficiaryId) {
                        return {
                            success: false,
                            error: 'Beneficiary ID required',
                            message: 'Please provide a beneficiary ID to unlink.',
                        };
                    }

                    // Unlink beneficiary by setting voterId to null
                    const unlinkData: any = { voterId: null };
                    if (notes) {
                        unlinkData.notes = notes;
                    }

                    const unlinkedBeneficiary = await updateBeneficiary({
                        id: beneficiaryId,
                        ...unlinkData,
                    });

                    if (!unlinkedBeneficiary) {
                        return {
                            success: false,
                            error: 'Beneficiary not found',
                            message: 'The specified beneficiary does not exist.',
                        };
                    }

                    return {
                        success: true,
                        action: 'unlink_beneficiary',
                        beneficiary: {
                            id: unlinkedBeneficiary.id,
                            serviceId: unlinkedBeneficiary.serviceId,
                            voterId: unlinkedBeneficiary.voterId,
                            partNo: unlinkedBeneficiary.partNo,
                            status: unlinkedBeneficiary.status,
                            notes: unlinkedBeneficiary.notes,
                            applicationDate: unlinkedBeneficiary.applicationDate,
                            completionDate: unlinkedBeneficiary.completionDate,
                        },
                        message: 'Beneficiary successfully unlinked from voter.',
                        summary: `Unlinked beneficiary ${beneficiaryId} from voter. Now treated as outside voter.`,
                    };

                default:
                    return {
                        success: false,
                        error: 'Invalid action',
                        message: 'Please provide a valid action.',
                    };
            }
        } catch (error) {
            console.error('Error in linkBeneficiaryToVoterTool:', error);
            throw new Error('Failed to link beneficiary to voter');
        }
    },
}); 
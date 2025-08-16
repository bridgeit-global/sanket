import { tool } from 'ai';
import { z } from 'zod';
import { createService } from '@/lib/db/queries';

export const addServiceTool = () => tool({
    description: 'Add a new service to the beneficiary management system. Services can be one-to-one (individual voter services) or one-to-many (public works affecting multiple voters).',
    inputSchema: z.object({
        name: z.string().describe('Name of the service'),
        description: z.string().optional().describe('Description of the service'),
        type: z.enum(['one-to-one', 'one-to-many']).describe('Type of service: one-to-one for individual voter services, one-to-many for public works'),
        category: z.string().describe('Category of the service (e.g., voter_registration, aadhar_card, ration_card, schemes, public_works, fund_utilization, issue_visibility)'),
    }),
    execute: async ({ name, description, type, category }) => {
        try {
            const service = await createService({
                name,
                description,
                type,
                category,
            });

            return {
                success: true,
                service: {
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    type: service.type,
                    category: service.category,
                },
                message: `Service "${name}" has been successfully added to the system.`,
                summary: `Added new ${type} service: ${name} (${category}). ${type === 'one-to-one' ? 'This service is for individual voters.' : 'This service affects multiple voters in a part.'}`,
            };
        } catch (error) {
            console.error('Error in addServiceTool:', error);
            throw new Error('Failed to add service');
        }
    },
}); 
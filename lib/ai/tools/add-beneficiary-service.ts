import { tool } from 'ai';
import { z } from 'zod';
import { createService } from '@/lib/db/queries';

export const addBeneficiaryServiceTool = () => tool({
    description: 'Add a new beneficiary service for individual voters or community projects. Services can be one-to-one (individual voter services) or one-to-many (community/public works affecting multiple voters). ALWAYS ask for comprehensive details including service name, description, type, category, target audience, expected duration, requirements, and priority level.',
    inputSchema: z.object({
        name: z.string().describe('Name of the beneficiary service'),
        description: z.string().optional().describe('Detailed description of the service'),
        type: z.enum(['one-to-one', 'one-to-many']).describe('Type of service: one-to-one for individual voter services, one-to-many for community/public works'),
        category: z.enum([
            'voter_registration',
            'aadhar_card',
            'ration_card',
            'government_schemes',
            'health_services',
            'education_services',
            'employment_services',
            'public_works',
            'infrastructure',
            'fund_utilization',
            'issue_visibility',
            'community_development',
            'other'
        ]).describe('Category of the service'),
        targetAudience: z.string().optional().describe('Target audience or beneficiaries (e.g., "Senior citizens", "Women", "Youth", "All voters")'),
        expectedDuration: z.string().optional().describe('Expected duration for completion (e.g., "2-3 weeks", "1 month", "Ongoing")'),
        requirements: z.string().optional().describe('Requirements or documents needed for the service'),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Priority level of the service'),
    }),
    execute: async ({ name, description, type, category, targetAudience, expectedDuration, requirements, priority = 'medium' }) => {
        try {
            // Create comprehensive description
            let fullDescription = description || '';
            if (targetAudience) {
                fullDescription += `\n\nTarget Audience: ${targetAudience}`;
            }
            if (expectedDuration) {
                fullDescription += `\n\nExpected Duration: ${expectedDuration}`;
            }
            if (requirements) {
                fullDescription += `\n\nRequirements: ${requirements}`;
            }
            fullDescription += `\n\nPriority: ${priority}`;

            const service = await createService({
                name,
                description: fullDescription.trim(),
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
                serviceDetails: {
                    targetAudience,
                    expectedDuration,
                    requirements,
                    priority,
                },
                message: `Beneficiary service "${name}" has been successfully added to the system.`,
                summary: `Added new ${type} beneficiary service: ${name} (${category}). ${type === 'one-to-one' ? 'This service is for individual voters.' : 'This service affects multiple voters in a community.'} Priority: ${priority}.`,
            };
        } catch (error) {
            console.error('Error in addBeneficiaryServiceTool:', error);
            throw new Error('Failed to add beneficiary service');
        }
    },
}); 
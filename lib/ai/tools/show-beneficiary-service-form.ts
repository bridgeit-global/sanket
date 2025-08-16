import { tool } from 'ai';
import { z } from 'zod';

export const showBeneficiaryServiceFormTool = () => tool({
    description: 'Show the beneficiary service form UI to collect comprehensive service details from the user. This tool should be called when the user wants to add a new beneficiary service and needs to fill out the form.',
    inputSchema: z.object({
        trigger: z.string().describe('Trigger to show the form UI'),
    }),
    execute: async ({ trigger }) => {
        // This tool doesn't actually execute anything - it just triggers the UI
        // The actual form handling will be done in the UI component
        return {
            success: true,
            message: 'Beneficiary service form UI should be displayed',
            trigger: trigger,
            formType: 'beneficiary-service-form',
        };
    },
}); 
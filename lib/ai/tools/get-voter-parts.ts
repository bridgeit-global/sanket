import { tool } from 'ai';
import { z } from 'zod';
import { getVotersByPart } from '@/lib/db/queries';

export const getVoterPartsTool = () => tool({
    description: 'Get voter analysis by parts/areas for Anushakti Nagar constituency',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            const partsAnalysis = await getVotersByPart();

            return {
                parts: partsAnalysis,
                totalVoters: partsAnalysis.reduce((sum, part) => sum + part.voterCount, 0),
                summary: `Voter analysis by parts: ${partsAnalysis.map(part => `Part ${part.part_no}: ${part.voterCount} voters`).join(', ')}. Total voters: ${partsAnalysis.reduce((sum, part) => sum + part.voterCount, 0)} total voters.`,
            };
        } catch (error) {
            console.error('Error in getVoterPartsTool:', error);
            throw new Error('Failed to get voter parts analysis');
        }
    },
}); 
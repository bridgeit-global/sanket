import { tool } from 'ai';
import { z } from 'zod';
import { getVotersByAgeGroup, testDatabaseConnection } from '@/lib/db/queries';

export const getVoterAgeGroupsTool = () => tool({
    description: 'Get voter age group distribution for Anushakti Nagar constituency',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            // Test database connection first
            await testDatabaseConnection();

            console.log('Calling getVotersByAgeGroup...');
            const ageGroups = await getVotersByAgeGroup();
            console.log('getVotersByAgeGroup result:', ageGroups);

            const totalVoters = ageGroups.reduce((sum, group) => sum + group.count, 0);

            return {
                ageGroups: ageGroups,
                totalVoters: totalVoters,
                summary: `Age group distribution: ${ageGroups.map(group => `${group.ageGroup}: ${group.count}`).join(', ')}. Total voters: ${totalVoters}.`,
            };
        } catch (error) {
            console.error('Error in getVoterAgeGroupsTool:', error);
            throw new Error('Failed to get voter age groups');
        }
    },
}); 
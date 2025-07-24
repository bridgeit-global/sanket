import { tool } from 'ai';
import { z } from 'zod';
import { getVotersByAgeGroupWithGender, testDatabaseConnection } from '@/lib/db/queries';

export const getVoterAgeGroupsWithGenderTool = () => tool({
    description: 'Get voter age group distribution with male/female bifurcation for Anushakti Nagar constituency',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            // Test database connection first
            await testDatabaseConnection();

            console.log('Calling getVotersByAgeGroupWithGender...');
            const result = await getVotersByAgeGroupWithGender();
            console.log('getVotersByAgeGroupWithGender result:', result);

            return {
                ageGroups: result.ageGroups,
                totalVoters: result.totalVoters,
                totalMale: result.totalMale,
                totalFemale: result.totalFemale,
                summary: `Age group distribution with gender breakdown: ${result.ageGroups.map(group => `${group.ageGroup}: ${group.maleCount}M/${group.femaleCount}F`).join(', ')}. Total: ${result.totalVoters} voters (${result.totalMale} male, ${result.totalFemale} female).`,
            };
        } catch (error) {
            console.error('Error in getVoterAgeGroupsWithGenderTool:', error);
            throw new Error('Failed to get voter age groups with gender');
        }
    },
}); 
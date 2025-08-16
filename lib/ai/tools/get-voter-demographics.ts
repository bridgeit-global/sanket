import { tool } from 'ai';
import { z } from 'zod';
import { getVoterDemographics, getVotersByAgeGroup, testDatabaseConnection } from '@/lib/db/queries';

export const getVoterDemographicsTool = () => tool({
    description: 'Get comprehensive voter demographics for Anushakti Nagar constituency including total voters, gender distribution, and age statistics',
    inputSchema: z.object({}),
    execute: async () => {
        try {
            // Test database connection first
            await testDatabaseConnection();

            console.log('Calling getVotersByAgeGroup...');
            const ageGroups = await getVotersByAgeGroup();
            console.log('getVotersByAgeGroup result:', ageGroups);

            const demographics = await getVoterDemographics();

            return {
                totalVoters: demographics.totalVoters,
                maleCount: demographics.maleCount,
                femaleCount: demographics.femaleCount,
                otherCount: demographics.otherCount,
                avgAge: demographics.avgAge,
                minAge: demographics.minAge,
                maxAge: demographics.maxAge,
                ageGroups: ageGroups,
                summary: `Anushakti Nagar constituency has ${demographics.totalVoters} total voters with ${demographics.maleCount} males, ${demographics.femaleCount} females, and ${demographics.otherCount} others. The average age is ${Math.round(parseFloat(demographics.avgAge as string) || 0)} years.`,
            };
        } catch (error) {
            console.error('Error in getVoterDemographicsTool:', error);
            throw new Error('Failed to get voter demographics');
        }
    },
}); 
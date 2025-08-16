import { tool } from 'ai';
import { z } from 'zod';
import { getVoterSearchInsights } from '@/lib/db/queries';

export const searchVotersTool = () => tool({
    description: 'Search voters by last name and get comprehensive insights about the search results with age group bifurcation',
    inputSchema: z.object({
        searchTerm: z.string().describe('The last name to search for in voters'),
    }),
    execute: async ({ searchTerm }) => {
        try {
            const searchInsights = await getVoterSearchInsights({ searchTerm });

            return {
                totalResults: searchInsights.totalResults,
                voters: searchInsights.searchResults.slice(0, 5), // Limit to first 5 results
                summary: `Found ${searchInsights.totalResults} voters with last name "${searchTerm}". Gender breakdown: ${Object.entries(searchInsights.genderBreakdown).map(([gender, count]) => `${gender}: ${count}`).join(', ')}`,
                genderBreakdown: searchInsights.genderBreakdown,
                ageGroups: searchInsights.ageGroups,
                ageGroupsWithGender: searchInsights.ageGroupsWithGender,
            };
        } catch (error) {
            throw new Error('Failed to search voters');
        }
    },
}); 
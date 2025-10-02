import { tool } from 'ai';
import { z } from 'zod';
import {
    getVoterByEpicNumber,
    getAllVoter,
    getVoterByAC,
    getVoterByWard,
    getVoterByPart,
    getVoterByBooth,
    searchVoterByName,
    getVoterByVotingStatus,
    getVoterCount,
    getVoterCountByAC,
    getVotersByGender,
    getVotersByAgeRange,
    getVoterDemographics,
} from '@/lib/db/queries';

export const voterAnalysisTool = tool({
    description: 'Analyze voter data from Anushakti Nagar constituency, Mumbai. Can query voter information, demographics, voting patterns, and generate insights.',
    inputSchema: z.object({
        query: z.string().describe('The analysis query to perform on voter data'),
        analysisType: z.enum([
            'search_voter',
            'demographics',
            'voting_patterns',
            'geographic_analysis',
            'age_gender_analysis',
            'booth_analysis',
            'general_stats'
        ]).describe('Type of analysis to perform'),
        filters: z.object({
            epicNumber: z.string().optional().describe('EPIC number to search'),
            name: z.string().optional().describe('Voter name to search'),
            acNo: z.string().optional().describe('Assembly Constituency number'),
            wardNo: z.string().optional().describe('Ward number'),
            partNo: z.string().optional().describe('Part number'),
            boothName: z.string().optional().describe('Booth name'),
            gender: z.string().optional().describe('Gender filter'),
            ageMin: z.number().optional().describe('Minimum age'),
            ageMax: z.number().optional().describe('Maximum age'),
            voted2024: z.boolean().optional().describe('Whether voted in 2024'),
        }).optional().describe('Filters to apply to the analysis'),
    }),
    execute: async ({ query, analysisType, filters = {} }) => {
        console.log('🗳️ Voter Analysis Tool called:', { query, analysisType, filters });
        try {
            let result: any = {};
            let voters: any[] = [];

            switch (analysisType) {
                case 'search_voter': {
                    if (filters.epicNumber) {
                        voters = await getVoterByEpicNumber(filters.epicNumber);
                    } else if (filters.name) {
                        voters = await searchVoterByName(filters.name);
                    } else {
                        voters = await getAllVoter();
                    }
                    result = {
                        query,
                        analysisType,
                        totalFound: voters.length,
                        voters: voters.slice(0, 10), // Limit to first 10 for display
                        summary: `Found ${voters.length} voters matching the search criteria`
                    };
                    break;
                }

                case 'demographics': {
                    const demographics = await getVoterDemographics();
                    result = {
                        query,
                        analysisType,
                        demographics,
                        summary: `Total voters: ${demographics.totalVoters}, Male: ${demographics.maleCount}, Female: ${demographics.femaleCount}, Average Age: ${demographics.averageAge}`
                    };
                    break;
                }

                case 'voting_patterns': {
                    const votedVoters = await getVoterByVotingStatus(true);
                    const notVotedVoters = await getVoterByVotingStatus(false);
                    const totalVoters = await getVoterCount();
                    const votingRate = totalVoters > 0 ? (votedVoters.length / totalVoters * 100).toFixed(2) : 0;

                    result = {
                        query,
                        analysisType,
                        votingStats: {
                            totalVoters,
                            voted2024: votedVoters.length,
                            notVoted2024: notVotedVoters.length,
                            votingRate: `${votingRate}%`
                        },
                        summary: `Voting rate in 2024: ${votingRate}% (${votedVoters.length}/${totalVoters} voters)`
                    };
                    break;
                }

                case 'geographic_analysis': {
                    if (filters.acNo) {
                        voters = await getVoterByAC(filters.acNo);
                        const acCount = await getVoterCountByAC(filters.acNo);
                        result = {
                            query,
                            analysisType,
                            location: `Assembly Constituency ${filters.acNo}`,
                            totalVoters: acCount,
                            voters: voters.slice(0, 10),
                            summary: `Found ${acCount} voters in Assembly Constituency ${filters.acNo}`
                        };
                    } else if (filters.wardNo) {
                        voters = await getVoterByWard(filters.wardNo);
                        result = {
                            query,
                            analysisType,
                            location: `Ward ${filters.wardNo}`,
                            totalVoters: voters.length,
                            voters: voters.slice(0, 10),
                            summary: `Found ${voters.length} voters in Ward ${filters.wardNo}`
                        };
                    } else if (filters.partNo) {
                        voters = await getVoterByPart(filters.partNo);
                        result = {
                            query,
                            analysisType,
                            location: `Part ${filters.partNo}`,
                            totalVoters: voters.length,
                            voters: voters.slice(0, 10),
                            summary: `Found ${voters.length} voters in Part ${filters.partNo}`
                        };
                    } else if (filters.boothName) {
                        voters = await getVoterByBooth(filters.boothName);
                        result = {
                            query,
                            analysisType,
                            location: `Booth: ${filters.boothName}`,
                            totalVoters: voters.length,
                            voters: voters.slice(0, 10),
                            summary: `Found ${voters.length} voters at booth: ${filters.boothName}`
                        };
                    } else {
                        // Get all voters for general geographic overview
                        voters = await getAllVoter();
                        const acGroups = voters.reduce((acc, voter) => {
                            const ac = voter.acNo || 'Unknown';
                            acc[ac] = (acc[ac] || 0) + 1;
                            return acc;
                        }, {} as Record<string, number>);

                        result = {
                            query,
                            analysisType,
                            geographicDistribution: acGroups,
                            summary: `Voter distribution across Assembly Constituencies: ${Object.keys(acGroups).length} ACs`
                        };
                    }
                    break;
                }

                case 'age_gender_analysis': {
                    if (filters.gender && filters.ageMin !== undefined && filters.ageMax !== undefined) {
                        voters = await getVotersByAgeRange(filters.ageMin, filters.ageMax);
                        const genderFiltered = voters.filter(voter => voter.gender === filters.gender);
                        result = {
                            query,
                            analysisType,
                            filters: { gender: filters.gender, ageRange: `${filters.ageMin}-${filters.ageMax}` },
                            totalVoters: genderFiltered.length,
                            voters: genderFiltered.slice(0, 10),
                            summary: `Found ${genderFiltered.length} ${filters.gender} voters aged ${filters.ageMin}-${filters.ageMax}`
                        };
                    } else if (filters.gender) {
                        voters = await getVotersByGender(filters.gender);
                        result = {
                            query,
                            analysisType,
                            filters: { gender: filters.gender },
                            totalVoters: voters.length,
                            voters: voters.slice(0, 10),
                            summary: `Found ${voters.length} ${filters.gender} voters`
                        };
                    } else if (filters.ageMin !== undefined && filters.ageMax !== undefined) {
                        voters = await getVotersByAgeRange(filters.ageMin, filters.ageMax);
                        result = {
                            query,
                            analysisType,
                            filters: { ageRange: `${filters.ageMin}-${filters.ageMax}` },
                            totalVoters: voters.length,
                            voters: voters.slice(0, 10),
                            summary: `Found ${voters.length} voters aged ${filters.ageMin}-${filters.ageMax}`
                        };
                    } else {
                        // General age and gender analysis
                        const demographics = await getVoterDemographics();
                        result = {
                            query,
                            analysisType,
                            demographics: {
                                genderDistribution: {
                                    male: demographics.maleCount,
                                    female: demographics.femaleCount,
                                    other: demographics.otherGenderCount
                                },
                                ageGroups: demographics.ageGroups,
                                averageAge: demographics.averageAge
                            },
                            summary: `Age and gender analysis: ${demographics.maleCount} male, ${demographics.femaleCount} female voters with average age ${demographics.averageAge}`
                        };
                    }
                    break;
                }

                case 'booth_analysis': {
                    if (filters.boothName) {
                        voters = await getVoterByBooth(filters.boothName);
                        const boothDemographics = await getVoterDemographics();
                        result = {
                            query,
                            analysisType,
                            boothName: filters.boothName,
                            totalVoters: voters.length,
                            boothInfo: {
                                voters: voters.slice(0, 10),
                                address: voters[0]?.englishBoothAddress || 'Address not available'
                            },
                            summary: `Booth ${filters.boothName} has ${voters.length} registered voters`
                        };
                    } else {
                        // Get all booths and their voter counts
                        voters = await getAllVoter();
                        const boothGroups = voters.reduce((acc, voter) => {
                            const booth = voter.boothName || 'Unknown Booth';
                            if (!acc[booth]) {
                                acc[booth] = {
                                    count: 0,
                                    address: voter.englishBoothAddress || 'Address not available'
                                };
                            }
                            acc[booth].count++;
                            return acc;
                        }, {} as Record<string, { count: number; address: string }>);

                        result = {
                            query,
                            analysisType,
                            boothDistribution: boothGroups,
                            totalBooths: Object.keys(boothGroups).length,
                            summary: `Found ${Object.keys(boothGroups).length} polling booths in the constituency`
                        };
                    }
                    break;
                }

                case 'general_stats': {
                    const totalVotersCount = await getVoterCount();
                    const demographicsStats = await getVoterDemographics();
                    const votedCount = await getVoterByVotingStatus(true);
                    const votingRateStats = totalVotersCount > 0 ? (votedCount.length / totalVotersCount * 100).toFixed(2) : 0;

                    result = {
                        query,
                        analysisType,
                        statistics: {
                            totalVoters: totalVotersCount,
                            votingRate: `${votingRateStats}%`,
                            genderDistribution: {
                                male: demographicsStats.maleCount,
                                female: demographicsStats.femaleCount,
                                other: demographicsStats.otherGenderCount
                            },
                            averageAge: demographicsStats.averageAge,
                            ageGroups: demographicsStats.ageGroups
                        },
                        summary: `Anushakti Nagar constituency has ${totalVotersCount} registered voters with ${votingRateStats}% voting rate in 2024`
                    };
                    break;
                }

                default:
                    result = {
                        query,
                        analysisType,
                        error: 'Invalid analysis type',
                        summary: 'Please specify a valid analysis type'
                    };
            }

            console.log('🗳️ Voter Analysis Tool result:', result);
            return result;
        } catch (error) {
            console.error('🗳️ Voter Analysis Tool error:', error);
            return {
                query,
                analysisType,
                error: `Failed to perform voter analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
                summary: 'Error occurred while analyzing voter data'
            };
        }
    },
});

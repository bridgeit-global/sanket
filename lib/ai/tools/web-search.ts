import { tool } from 'ai';
import { z } from 'zod';

export const webSearch = tool({
  description: 'Search the web for current information using DuckDuckGo (no API key required)',
  inputSchema: z.object({
    query: z.string().describe('The search query to look up on the web'),
  }),
  execute: async ({ query }) => {
    try {
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status}`);
      }

      const searchData = await response.json();
      
      // If DuckDuckGo doesn't have results, try a different approach
      if (!searchData.Abstract && !searchData.Answer && searchData.RelatedTopics?.length === 0) {
        // Try searching with a more general query
        const generalResponse = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(query.split(' ').slice(0, 3).join(' '))}&format=json&no_html=1&skip_disambig=1`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (generalResponse.ok) {
          const generalData = await generalResponse.json();
          return {
            query,
            abstract: generalData.Abstract || 'No specific information found, but here are some related topics.',
            abstractSource: generalData.AbstractSource,
            abstractURL: generalData.AbstractURL,
            relatedTopics: generalData.RelatedTopics?.slice(0, 3) || [],
            answer: generalData.Answer,
            definition: generalData.Definition,
            definitionSource: generalData.DefinitionSource,
            definitionURL: generalData.DefinitionURL,
            type: generalData.Type,
            heading: generalData.Heading,
            note: 'Search results may be limited for this specific query.',
          };
        }
      }
      
      return {
        query,
        abstract: searchData.Abstract,
        abstractSource: searchData.AbstractSource,
        abstractURL: searchData.AbstractURL,
        relatedTopics: searchData.RelatedTopics?.slice(0, 3) || [],
        answer: searchData.Answer,
        definition: searchData.Definition,
        definitionSource: searchData.DefinitionSource,
        definitionURL: searchData.DefinitionURL,
        type: searchData.Type,
        heading: searchData.Heading,
      };
    } catch (error) {
      return {
        error: `Failed to search: ${error instanceof Error ? error.message : 'Unknown error'}`,
        query
      };
    }
  },
}); 
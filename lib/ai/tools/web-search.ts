import { z } from 'zod';

const inputSchema = z.object({
    query: z.string().describe('The search query to look up on the web'),
    count: z.number().optional().default(5).describe('Number of results to return (max 10)'),
});

export const webSearchTool = () => ({
    description: 'Search the web for current information using Brave Search',
    inputSchema,
    execute: async ({ query, count = 5 }: z.infer<typeof inputSchema>) => {
        try {
            const apiKey = process.env.BRAVE_SEARCH_API_KEY;
            if (!apiKey) {
                throw new Error('BRAVE_SEARCH_API_KEY environment variable is not set');
            }

            if (!apiKey.startsWith('BSAK_')) {
                throw new Error('Invalid Brave Search API key format. Should start with BSAK_');
            }

            const searchParams = new URLSearchParams({
                q: query,
                count: count.toString(),
                search_lang: 'en',
                country: 'IN',
                ui_lang: 'en-IN',
                safesearch: 'moderate',
            });

            const url = `https://api.search.brave.com/res/v1/web/search?${searchParams}`;
            console.log('Brave Search API request:', { url, query, count });

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Subscription-Token': apiKey,
                    'User-Agent': 'Anushakti-Nagar-Constituency-App/1.0',
                },
                next: { revalidate: 3600 }, // Cache for 1 hour
            } as RequestInit & { next: { revalidate: number } });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Brave Search API error details:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText,
                });
                throw new Error(`Brave Search API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.web || !data.web.results) {
                return {
                    results: [],
                    message: 'No web search results found',
                };
            }

            const results = data.web.results.slice(0, Math.min(count, 10)).map((result: any) => ({
                title: result.title,
                url: result.url,
                description: result.description,
                published: result.published,
            }));

            return {
                results,
                message: `Found ${results.length} web search results for "${query}"`,
            };
        } catch (error) {
            console.error('Web search error:', error);

            // Return a helpful message with the original query
            return {
                results: [],
                message: `Unable to perform web search for "${query}". This might be due to API limitations or network issues. Please try rephrasing your query or check your internet connection.`,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },
}); 
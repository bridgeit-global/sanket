import { tool } from 'ai';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { voters } from '@/lib/db/schema';
import { ChatSDKError } from '@/lib/errors';

// Initialize database connection
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export const sqlQueryTool = tool({
    description: 'Execute custom SQL queries on the voter database. Use this for complex voter data analysis and custom queries. Available fields: id, part_no, serial_no, name, gender, age, family, last_name, mobile, email, isActive, createdAt, updatedAt.',
    inputSchema: z.object({
        query: z.string().describe('The SQL query to execute on the voter database'),
    }),
    execute: async ({ query }) => {
        try {
            // Security checks - only allow SELECT queries and restrict to voters table
            const normalizedQuery = query.trim().toLowerCase();

            // Check if query starts with SELECT
            if (!normalizedQuery.startsWith('select')) {
                return {
                    error: 'Only SELECT queries are allowed for security reasons',
                    query: query,
                    allowedOperations: ['SELECT'],
                    note: 'This tool is restricted to read-only operations on voter data only'
                };
            }

            // Check if query contains dangerous keywords
            const dangerousKeywords = [
                'drop', 'delete', 'insert', 'update', 'create', 'alter', 'truncate',
                'grant', 'revoke', 'backup', 'restore', 'exec', 'execute'
            ];

            for (const keyword of dangerousKeywords) {
                if (normalizedQuery.includes(keyword)) {
                    return {
                        error: `Query contains forbidden keyword: ${keyword}`,
                        query: query,
                        forbiddenKeywords: dangerousKeywords,
                        note: 'This tool is restricted to read-only operations on voter data only'
                    };
                }
            }

            // Check if query references voters table (case insensitive)
            if (!normalizedQuery.includes('voters')) {
                return {
                    error: 'Query must reference the voters table',
                    query: query,
                    note: 'This tool is restricted to queries on the voters table only'
                };
            }

            console.log('Executing SQL query:', query);

            // Execute the query
            const result = await db.execute(query);

            console.log('SQL query result:', result);

            // Format the results for display
            const formattedResult = {
                query: query,
                rowCount: Array.isArray(result) ? result.length : 0,
                columns: Array.isArray(result) && result.length > 0 ? Object.keys(result[0]) : [],
                data: Array.isArray(result) ? result.slice(0, 100) : [], // Limit to first 100 rows
                hasMore: Array.isArray(result) && result.length > 100,
                summary: `Query executed successfully. Found ${Array.isArray(result) ? result.length : 0} rows.${Array.isArray(result) && result.length > 100 ? ' Showing first 100 rows.' : ''}`
            };

            return formattedResult;
        } catch (error) {
            console.error('SQL query error:', error);
            return {
                error: 'Failed to execute SQL query',
                details: error instanceof Error ? error.message : 'Unknown error',
                query: query,
                note: 'Please check your SQL syntax and ensure the query only references the voters table'
            };
        }
    },
}); 
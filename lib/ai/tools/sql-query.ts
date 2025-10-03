import { tool } from 'ai';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export const sqlQueryTool = tool({
    description: `Execute custom SQL queries on Anushakti Nagar voter database (AC 172). Only accepts SELECT queries for security.

VOTERS TABLE STRUCTURE:
Table: "Voter" (PostgreSQL)
- epic_number VARCHAR(20) PRIMARY KEY - Unique voter ID
- full_name VARCHAR(255) - Complete voter name
- relation_type VARCHAR(50) - Relationship to head (Son of, Wife of, etc.)
- relation_name VARCHAR(255) - Name of the person they're related to
- family_grouping VARCHAR(100) - Family identifier (Family A, Family B, etc.)
- ac_no VARCHAR(10) - Assembly Constituency number (172 for Anushakti Nagar)
- ward_no VARCHAR(10) - Ward number within AC
- part_no VARCHAR(10) - Part number within ward
- sr_no VARCHAR(10) - Serial number within part
- house_number VARCHAR(127) - House address
- religion VARCHAR(50) - Religious affiliation
- age INTEGER - Voter's age
- gender VARCHAR(10) - 'M' for Male, 'F' for Female
- is_voted_2024 BOOLEAN - Whether voted in 2024 elections
- mobile_no_primary VARCHAR(15) - Primary mobile number
- mobile_no_secondary VARCHAR(15) - Secondary mobile number
- booth_name VARCHAR(255) - Polling booth name
- english_booth_address TEXT - Booth address in English
- created_at TIMESTAMP - Record creation time
- updated_at TIMESTAMP - Record last update time

SAMPLE QUERIES:
- Demographics: SELECT COUNT(*), gender, AVG(age) FROM "Voter" GROUP BY gender
- Ward analysis: SELECT ward_no, COUNT(*), SUM(CASE WHEN is_voted_2024 THEN 1 ELSE 0 END) FROM "Voter" GROUP BY ward_no
- Age groups: SELECT CASE WHEN age BETWEEN 18 AND 25 THEN '18-25' WHEN age BETWEEN 26 AND 35 THEN '26-35' ELSE 'Other' END as age_group, COUNT(*) FROM "Voter" GROUP BY age_group
- Search by name: SELECT * FROM "Voter" WHERE full_name ILIKE '%kumar%'`,
    inputSchema: z.object({
        query: z.string().describe('The SQL query to execute (SELECT only). Use "Voter" table name in double quotes for PostgreSQL.'),
        description: z.string().optional().describe('Description of what this query is trying to find'),
    }),
    execute: async ({ query, description }) => {
        console.log('🔍 SQL Query Tool called:', { query, description });
        try {
            // Security check - only allow SELECT queries
            const trimmedQuery = query.trim().toLowerCase();
            if (!trimmedQuery.startsWith('select')) {
                return {
                    query,
                    error: 'Only SELECT queries are allowed for security reasons',
                    answer: 'This tool only accepts SELECT queries. Please modify your query to start with SELECT.'
                };
            }

            // Check for dangerous keywords
            const dangerousKeywords = ['drop', 'delete', 'update', 'insert', 'alter', 'create', 'truncate', 'exec', 'execute'];
            const hasDangerousKeyword = dangerousKeywords.some(keyword =>
                trimmedQuery.includes(keyword)
            );

            if (hasDangerousKeyword) {
                return {
                    query,
                    error: 'Query contains potentially dangerous keywords',
                    answer: 'This tool only allows SELECT queries. Please remove any data modification keywords.'
                };
            }

            // Create database connection
            const postgresUrl = process.env.POSTGRES_URL;
            if (!postgresUrl) {
                return {
                    query,
                    error: 'Database connection not configured',
                    answer: 'Database connection is not available.'
                };
            }

            const client = postgres(postgresUrl);
            const db = drizzle(client);

            // Execute the query using raw SQL
            const result = await client.unsafe(query);

            // Close the connection
            await client.end();

            const rowCount = Array.isArray(result) ? result.length : 0;

            return {
                query,
                description,
                answer: `Query executed successfully. Found ${rowCount} rows.`,
                rowCount,
                results: result.slice(0, 50), // Limit results to first 50 rows
                sql: query
            };
        } catch (error) {
            console.error('🔍 SQL Query Tool error:', error);
            return {
                query,
                description,
                error: `SQL query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                answer: 'Error occurred while executing the SQL query. Please check your query syntax.'
            };
        }
    },
});

import { tool } from 'ai';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export const sqlQueryTool = tool({
    description: `Execute custom SQL queries on Anushakti Nagar voter database (AC 172). Only accepts SELECT queries for security.

DATABASE SCHEMA:

TABLE: "Voter" (Main voter information)
- epic_number VARCHAR(20) PRIMARY KEY - Unique voter ID (EPIC number)
- full_name VARCHAR(255) - Complete voter name
- relation_type VARCHAR(50) - Relationship type (Son of, Wife of, Daughter of, etc.)
- relation_name VARCHAR(255) - Name of the related person
- family_grouping VARCHAR(100) - Family identifier for grouping
- ac_no VARCHAR(10) - Assembly Constituency number (172 for Anushakti Nagar)
- part_no VARCHAR(10) - Part number (FOREIGN KEY to PartNo table)
- sr_no VARCHAR(10) - Serial number within part
- house_number VARCHAR(127) - House/address number
- religion VARCHAR(50) - Religious affiliation
- age INTEGER - Voter's age
- dob DATE - Date of birth
- gender VARCHAR(10) - 'M' for Male, 'F' for Female
- is_voted_2024 BOOLEAN - Whether voted in 2024 elections
- mobile_no_primary VARCHAR(15) - Primary mobile number
- mobile_no_secondary VARCHAR(15) - Secondary mobile number
- address TEXT - Full address
- pincode VARCHAR(10) - PIN code
- created_at TIMESTAMP - Record creation time
- updated_at TIMESTAMP - Record last update time

TABLE: "PartNo" (Booth and Ward mapping)
- part_no VARCHAR(10) PRIMARY KEY - Part number (unique identifier)
- ward_no VARCHAR(10) - Ward number
- booth_name VARCHAR(255) - Polling booth name
- english_booth_address TEXT - Booth address in English
- created_at TIMESTAMP - Record creation time
- updated_at TIMESTAMP - Record last update time

RELATIONSHIP:
- Voter.part_no → PartNo.part_no (Many voters belong to one part/booth)
- Each Part belongs to a Ward (PartNo.ward_no)

IMPORTANT: To get ward-wise or booth-wise analytics, you MUST JOIN the Voter table with PartNo table.

SAMPLE QUERIES:

1. Ward-wise voter count:
SELECT p.ward_no, COUNT(*) as voter_count 
FROM "Voter" v 
JOIN "PartNo" p ON v.part_no = p.part_no 
GROUP BY p.ward_no 
ORDER BY p.ward_no

2. Ward-wise voting statistics (2024):
SELECT p.ward_no, 
       COUNT(*) as total_voters,
       SUM(CASE WHEN v.is_voted_2024 THEN 1 ELSE 0 END) as voted,
       ROUND(SUM(CASE WHEN v.is_voted_2024 THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as voting_percentage
FROM "Voter" v 
JOIN "PartNo" p ON v.part_no = p.part_no 
GROUP BY p.ward_no 
ORDER BY p.ward_no

3. Ward-wise gender distribution:
SELECT p.ward_no, v.gender, COUNT(*) as count
FROM "Voter" v 
JOIN "PartNo" p ON v.part_no = p.part_no 
GROUP BY p.ward_no, v.gender 
ORDER BY p.ward_no, v.gender

4. Booth-wise voter count:
SELECT p.part_no, p.ward_no, p.booth_name, COUNT(*) as voter_count
FROM "Voter" v 
JOIN "PartNo" p ON v.part_no = p.part_no 
GROUP BY p.part_no, p.ward_no, p.booth_name 
ORDER BY p.ward_no, p.part_no

5. Part-wise age demographics:
SELECT p.part_no, p.ward_no,
       CASE 
         WHEN v.age BETWEEN 18 AND 25 THEN '18-25'
         WHEN v.age BETWEEN 26 AND 35 THEN '26-35'
         WHEN v.age BETWEEN 36 AND 50 THEN '36-50'
         WHEN v.age BETWEEN 51 AND 65 THEN '51-65'
         ELSE '65+'
       END as age_group,
       COUNT(*) as count
FROM "Voter" v 
JOIN "PartNo" p ON v.part_no = p.part_no 
GROUP BY p.part_no, p.ward_no, age_group 
ORDER BY p.ward_no, p.part_no

6. Overall demographics:
SELECT gender, COUNT(*) as count, ROUND(AVG(age), 1) as avg_age 
FROM "Voter" 
GROUP BY gender

7. Search voter by name:
SELECT v.*, p.ward_no, p.booth_name 
FROM "Voter" v 
JOIN "PartNo" p ON v.part_no = p.part_no 
WHERE v.full_name ILIKE '%kumar%'
LIMIT 20

8. Voters in specific ward:
SELECT v.*, p.booth_name 
FROM "Voter" v 
JOIN "PartNo" p ON v.part_no = p.part_no 
WHERE p.ward_no = '001'
LIMIT 50

9. List all wards with part counts:
SELECT ward_no, COUNT(*) as part_count 
FROM "PartNo" 
GROUP BY ward_no 
ORDER BY ward_no

10. Ward summary with booth details:
SELECT ward_no, part_no, booth_name, english_booth_address 
FROM "PartNo" 
ORDER BY ward_no, part_no`,
    inputSchema: z.object({
        query: z.string().describe('The SQL query to execute (SELECT only). Use table names in double quotes for PostgreSQL. JOIN "Voter" with "PartNo" for ward/booth analytics.'),
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

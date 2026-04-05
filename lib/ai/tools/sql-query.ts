import { tool } from 'ai';
import { z } from 'zod';
import postgres from 'postgres';
import { Parser } from 'node-sql-parser/build/postgresql';

const PG_OPT = { database: 'Postgresql' as const };

/**
 * Deterministic guard rail: only allow a single SELECT statement.
 * Rejects multiple statements, non-SELECT statements, and parse errors.
 */
function validateSingleSelectOnly(query: string): { allowed: true } | { allowed: false; error: string } {
    const trimmed = query.trim();
    if (!trimmed.length) {
        return { allowed: false, error: 'Empty query is not allowed.' };
    }
    try {
        const parser = new Parser();
        const ast = parser.astify(trimmed, PG_OPT);
        const statements = Array.isArray(ast) ? ast : [ast];
        if (statements.length !== 1) {
            return {
                allowed: false,
                error: 'Only a single SQL statement is allowed. Multiple statements separated by semicolons are not permitted.',
            };
        }
        const stmt = statements[0];
        const type = stmt?.type ?? (stmt as { type?: string }).type;
        if (type !== 'select') {
            return {
                allowed: false,
                error: 'Only SELECT queries are allowed. Data modification (INSERT, UPDATE, DELETE) and DDL (DROP, CREATE, etc.) are not permitted.',
            };
        }
        return { allowed: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid SQL';
        return {
            allowed: false,
            error: `Query could not be parsed: ${message}. Only a single SELECT statement is allowed.`,
        };
    }
}

export const sqlQueryTool = tool({
    description: `Execute custom SQL queries on the voter database. Only SELECT queries are accepted. Use table names in double quotes for PostgreSQL.

VOTING PATTERN / ELECTION-WIDE ANALYSIS (MANDATORY):
- When the user asks for "voting pattern", "voting across elections", "election-wide" analysis, or comparison across elections: do NOT group by election_id.
- ALWAYS GROUP BY election_type (and optionally constituency_type) in "ElectionMaster". Same voter base votes in LS, assembly, and ward—grouping by election_id splits them into many rows; grouping by election_type gives one row per election type (e.g. LS, Assembly, BMC).
- Example: SELECT em.election_type, em.has_voted, COUNT(*) as voter_count FROM "ElectionMapping" em JOIN "ElectionMaster" m ON em.election_id = m.election_id GROUP BY m.election_type, em.has_voted ORDER BY m.election_type, em.has_voted;

DATABASE SCHEMA (primary tables for wide search):

TABLE: "VoterMaster" (core voter identity and personal info)
- epic_number VARCHAR(20) PRIMARY KEY - Unique voter ID (EPIC number)
- full_name VARCHAR(255) - Complete voter name
- relation_type VARCHAR(50), relation_name VARCHAR(255), family_grouping VARCHAR(100)
- house_number VARCHAR(127), locality_street VARCHAR(255), town_village VARCHAR(255)
- religion VARCHAR(50), caste VARCHAR(50) - Stored and ready for analysis; use for demographic breakdowns
- age INTEGER, dob DATE, gender VARCHAR(10)
- address TEXT, pincode VARCHAR(10)

RELIGION AND CASTE: Both columns exist in VoterMaster and are available for analysis. When value is NULL or empty string, treat it as a single group: use COALESCE(NULLIF(TRIM(v.religion), ''), 'Blank') AS religion_group (and same for caste) in SELECT/GROUP BY so missing data is reported as "Blank" rather than omitted.

TABLE: "VoterMobileNumber" (one voter can have multiple rows)
- epic_number VARCHAR(20) NOT NULL - FK to VoterMaster.epic_number
- mobile_number VARCHAR(15) NOT NULL - Phone number
- sort_order INTEGER - Order (primary, secondary, etc.)
- created_at, updated_at TIMESTAMP
- PK: (epic_number, mobile_number)

TABLE: "ElectionMapping" (voter-to-election assignment and voting status)
- epic_number VARCHAR(20) NOT NULL - FK to VoterMaster.epic_number
- election_id VARCHAR(50) NOT NULL - FK to ElectionMaster.election_id
- booth_no VARCHAR(10), sr_no VARCHAR(10), has_voted BOOLEAN
- PK: (epic_number, election_id)

TABLE: "ElectionMaster" (election metadata). For election-wide or voting-pattern analysis, JOIN here and GROUP BY election_type (or constituency_type), not by election_id.
- election_id VARCHAR(50) PRIMARY KEY - e.g. '172LS2024', 'AE2024'
- election_type VARCHAR(50), year INTEGER, delimitation_version VARCHAR(50)
- constituency_type, constituency_id VARCHAR(50), data_source VARCHAR(100)
- created_at, updated_at TIMESTAMP

TABLE: "BoothMaster" (booth details per election)
- election_id VARCHAR(50) NOT NULL - FK to ElectionMaster.election_id
- booth_no VARCHAR(10) NOT NULL - Booth number
- booth_name VARCHAR(255), booth_address TEXT
- PK: (election_id, booth_no)

RELATIONSHIPS (for wide search):
- VoterMaster.epic_number = VoterMobileNumber.epic_number (voter's phones)
- VoterMaster.epic_number = ElectionMapping.epic_number (voter's elections)
- ElectionMapping.election_id = ElectionMaster.election_id
- ElectionMapping.election_id + ElectionMapping.booth_no = BoothMaster.election_id + BoothMaster.booth_no

SAMPLE QUERIES (wide search):

1. Voter by name with all mobile numbers:
SELECT vm.full_name, vm.epic_number, m.mobile_number, m.sort_order
FROM "VoterMaster" vm
LEFT JOIN "VoterMobileNumber" m ON vm.epic_number = m.epic_number
WHERE vm.full_name ILIKE '%kumar%'
ORDER BY vm.epic_number, m.sort_order
LIMIT 50

2. Voters with election and voting status for an election:
SELECT v.full_name, v.epic_number, em.election_id, em.booth_no, em.has_voted
FROM "VoterMaster" v
JOIN "ElectionMapping" em ON v.epic_number = em.epic_number
WHERE em.election_id = '172LS2024'
LIMIT 50

3. Count voters by election and booth (for a single election or booth-level detail):
SELECT em.election_id, em.booth_no, COUNT(*) as voter_count
FROM "ElectionMapping" em
WHERE em.booth_no IS NOT NULL
GROUP BY em.election_id, em.booth_no
ORDER BY em.election_id, em.booth_no

4. Voting pattern across elections (use this pattern when user asks for voting pattern / across elections):
SELECT m.election_type, em.has_voted, COUNT(*) as voter_count
FROM "ElectionMapping" em
JOIN "ElectionMaster" m ON em.election_id = m.election_id
GROUP BY m.election_type, em.has_voted
ORDER BY m.election_type, em.has_voted

5. Search across schema: voter + mobiles + election mapping:
SELECT v.full_name, v.epic_number, v.gender, v.age,
       (SELECT string_agg(m.mobile_number, ', ' ORDER BY m.sort_order) FROM "VoterMobileNumber" m WHERE m.epic_number = v.epic_number) as mobiles,
       (SELECT COUNT(*) FROM "ElectionMapping" e WHERE e.epic_number = v.epic_number) as election_count
FROM "VoterMaster" v
WHERE v.full_name ILIKE '%search%'
LIMIT 20

6. Religion/caste breakdown (treat NULL or empty as "Blank"):
SELECT COALESCE(NULLIF(TRIM(v.religion), ''), 'Blank') AS religion_group, COALESCE(NULLIF(TRIM(v.caste), ''), 'Blank') AS caste_group, COUNT(*) AS voter_count
FROM "VoterMaster" v
GROUP BY COALESCE(NULLIF(TRIM(v.religion), ''), 'Blank'), COALESCE(NULLIF(TRIM(v.caste), ''), 'Blank')
ORDER BY voter_count DESC`,
    inputSchema: z.object({
        query: z.string().describe('The SQL query to execute (single SELECT only). Use table names in double quotes. JOIN VoterMaster with VoterMobileNumber and ElectionMapping for wide search.'),
        description: z.string().optional().describe('Description of what this query is trying to find'),
    }),
    execute: async ({ query, description }) => {
        console.log('🔍 SQL Query Tool called:', { query, description });
        try {
            const validation = validateSingleSelectOnly(query);
            if (!validation.allowed) {
                return {
                    query,
                    error: validation.error,
                    answer: validation.error,
                };
            }

            const postgresUrl = process.env.SUPABASE_DB_URL;
            if (!postgresUrl) {
                return {
                    query,
                    error: 'Database connection not configured',
                    answer: 'Database connection is not available.',
                };
            }

            const client = postgres(postgresUrl, { max: 1 });
            const result = await client.unsafe(query);
            await client.end();

            const rowCount = Array.isArray(result) ? result.length : 0;

            return {
                query,
                description,
                answer: `Query executed successfully. Found ${rowCount} rows.`,
                rowCount,
                results: Array.isArray(result) ? result.slice(0, 50) : [],
                sql: query,
            };
        } catch (error) {
            console.error('🔍 SQL Query Tool error:', error);
            return {
                query,
                description,
                error: `SQL query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                answer: 'Error occurred while executing the SQL query. Please check your query syntax.',
            };
        }
    },
});

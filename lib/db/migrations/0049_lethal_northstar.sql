-- Drop existing primary key constraints (id columns)
ALTER TABLE "ElectionMapping" DROP CONSTRAINT IF EXISTS "ElectionMapping_pkey";
ALTER TABLE "VotingHistory" DROP CONSTRAINT IF EXISTS "VotingHistory_pkey";

-- Drop unique constraints that will be replaced by primary keys
ALTER TABLE "ElectionMapping" DROP CONSTRAINT IF EXISTS "ElectionMapping_epic_number_election_id_unique";
ALTER TABLE "VotingHistory" DROP CONSTRAINT IF EXISTS "VotingHistory_epic_number_election_id_unique";

-- Drop the id columns
ALTER TABLE "ElectionMapping" DROP COLUMN IF EXISTS "id";
ALTER TABLE "VotingHistory" DROP COLUMN IF EXISTS "id";

-- Remove duplicate rows before adding composite primary keys
WITH ranked_election_mapping AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY "epic_number", "election_id"
      ORDER BY ctid
    ) AS rn
  FROM "ElectionMapping"
)
DELETE FROM "ElectionMapping" em
USING ranked_election_mapping rem
WHERE em.ctid = rem.ctid
  AND rem.rn > 1;

WITH ranked_voting_history AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY "epic_number", "election_id"
      ORDER BY ctid
    ) AS rn
  FROM "VotingHistory"
)
DELETE FROM "VotingHistory" vh
USING ranked_voting_history rvh
WHERE vh.ctid = rvh.ctid
  AND rvh.rn > 1;

-- Add composite primary keys
ALTER TABLE "ElectionMapping" ADD CONSTRAINT "ElectionMapping_epic_number_election_id_pk" PRIMARY KEY("epic_number","election_id");
ALTER TABLE "VotingHistory" ADD CONSTRAINT "VotingHistory_epic_number_election_id_pk" PRIMARY KEY("epic_number","election_id");

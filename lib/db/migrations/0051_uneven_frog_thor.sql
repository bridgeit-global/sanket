-- Add has_voted column to ElectionMapping
ALTER TABLE "ElectionMapping" ADD COLUMN IF NOT EXISTS "has_voted" boolean DEFAULT false;

--> statement-breakpoint

-- Migrate hasVoted data from VotingHistory to ElectionMapping
UPDATE "ElectionMapping" em
SET "has_voted" = vh."has_voted"
FROM "VotingHistory" vh
WHERE em."epic_number" = vh."epic_number"
  AND em."election_id" = vh."election_id";


-- Drop VotingHistory table and its indexes
DROP INDEX IF EXISTS "idx_voting_history_election_id";
DROP INDEX IF EXISTS "idx_voting_history_epic_number";

DROP TABLE "VotingHistory";--> statement-breakpoint

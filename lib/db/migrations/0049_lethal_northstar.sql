-- Drop existing primary key constraints (id columns)
ALTER TABLE "ElectionMapping" DROP CONSTRAINT IF EXISTS "ElectionMapping_pkey";
ALTER TABLE "VotingHistory" DROP CONSTRAINT IF EXISTS "VotingHistory_pkey";

-- Drop unique constraints that will be replaced by primary keys
ALTER TABLE "ElectionMapping" DROP CONSTRAINT IF EXISTS "ElectionMapping_epic_number_election_id_unique";
ALTER TABLE "VotingHistory" DROP CONSTRAINT IF EXISTS "VotingHistory_epic_number_election_id_unique";

-- Drop the id columns
ALTER TABLE "ElectionMapping" DROP COLUMN IF EXISTS "id";
ALTER TABLE "VotingHistory" DROP COLUMN IF EXISTS "id";

-- Add composite primary keys
ALTER TABLE "ElectionMapping" ADD CONSTRAINT "ElectionMapping_epic_number_election_id_pk" PRIMARY KEY("epic_number","election_id");
ALTER TABLE "VotingHistory" ADD CONSTRAINT "VotingHistory_epic_number_election_id_pk" PRIMARY KEY("epic_number","election_id");

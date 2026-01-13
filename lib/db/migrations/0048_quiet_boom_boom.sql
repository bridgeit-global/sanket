-- Rename election ID from GE2024 to LS2024
-- Update all records in ElectionMapping table
UPDATE "ElectionMapping"
SET "election_id" = 'LS2024'
WHERE "election_id" = 'GE2024';

-- Update all records in VotingHistory table
UPDATE "VotingHistory"
SET "election_id" = 'LS2024'
WHERE "election_id" = 'GE2024';


ALTER TABLE "VoterMaster" ADD COLUMN "caste" varchar(50);
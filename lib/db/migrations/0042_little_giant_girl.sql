ALTER TABLE "BeneficiaryService" ADD COLUMN "voter_id" varchar(20);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "BeneficiaryService" ADD CONSTRAINT "BeneficiaryService_voter_id_Voter_epic_number_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."Voter"("epic_number") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Backfill voter_id from existing VoterTask records
-- For individual services that have VoterTask records, copy the first voterId to the service
UPDATE "BeneficiaryService" bs
SET "voter_id" = (
    SELECT vt."voter_id"
    FROM "VoterTask" vt
    WHERE vt."service_id" = bs."id"
      AND bs."service_type" = 'individual'
    ORDER BY vt."created_at" ASC
    LIMIT 1
)
WHERE bs."service_type" = 'individual'
  AND bs."voter_id" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "VoterTask" vt
    WHERE vt."service_id" = bs."id"
  );

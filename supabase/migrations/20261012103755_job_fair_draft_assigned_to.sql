-- Staff member responsible for following up an incomplete job-fair draft.

ALTER TABLE "public"."JobFairRegistrationDraft"
  ADD COLUMN IF NOT EXISTS "assigned_to" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'JobFairRegistrationDraft_assigned_to_fkey'
  ) THEN
    ALTER TABLE "public"."JobFairRegistrationDraft"
      ADD CONSTRAINT "JobFairRegistrationDraft_assigned_to_fkey"
      FOREIGN KEY ("assigned_to")
      REFERENCES "public"."User"("id")
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_job_fair_draft_assigned_to"
  ON "public"."JobFairRegistrationDraft" ("assigned_to");

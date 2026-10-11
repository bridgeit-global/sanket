-- Staff follow-up notes on incomplete job-fair drafts.
-- RLS stays on with no policies: only the service role (server) can read or write.

CREATE TABLE IF NOT EXISTS "public"."JobFairRegistrationDraftLog" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "draft_id" uuid NOT NULL,
  "note" text NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "JobFairRegistrationDraftLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JobFairRegistrationDraftLog_note_check"
    CHECK (char_length(btrim("note")) BETWEEN 1 AND 2000),
  CONSTRAINT "JobFairRegistrationDraftLog_draft_id_fkey"
    FOREIGN KEY ("draft_id")
    REFERENCES "public"."JobFairRegistrationDraft"("id")
    ON DELETE CASCADE,
  CONSTRAINT "JobFairRegistrationDraftLog_created_by_fkey"
    FOREIGN KEY ("created_by")
    REFERENCES "public"."User"("id")
);

CREATE INDEX IF NOT EXISTS "idx_job_fair_draft_log_draft_id_created_at"
  ON "public"."JobFairRegistrationDraftLog" ("draft_id", "created_at" DESC);

ALTER TABLE "public"."JobFairRegistrationDraftLog" ENABLE ROW LEVEL SECURITY;

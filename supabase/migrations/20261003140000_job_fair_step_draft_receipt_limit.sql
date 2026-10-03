-- Save each registration step before submit, and cap receipt downloads at 3.

ALTER TABLE "public"."JobFairRegistration"
  ADD COLUMN IF NOT EXISTS "receipt_download_count" integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'JobFairRegistration_receipt_download_count_check'
  ) THEN
    ALTER TABLE "public"."JobFairRegistration"
      ADD CONSTRAINT "JobFairRegistration_receipt_download_count_check"
      CHECK ("receipt_download_count" >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "public"."JobFairRegistrationDraft" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "event_code" character varying(40) NOT NULL DEFAULT 'yuvaaz-2026',
  "mobile" character varying(10) NOT NULL,
  "step" smallint NOT NULL DEFAULT 0,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "JobFairRegistrationDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JobFairRegistrationDraft_event_mobile_key" UNIQUE ("event_code", "mobile"),
  CONSTRAINT "JobFairRegistrationDraft_mobile_check" CHECK ("mobile" ~ '^[6-9][0-9]{9}$'),
  CONSTRAINT "JobFairRegistrationDraft_step_check" CHECK ("step" BETWEEN 0 AND 4)
);

ALTER TABLE "public"."JobFairRegistrationDraft" ENABLE ROW LEVEL SECURITY;

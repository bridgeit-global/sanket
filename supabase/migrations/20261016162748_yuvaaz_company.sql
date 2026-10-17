-- YUVAAZ 2026 company booth accounts.
-- Row level security is on and there are no public policies: only the service role can read or write.

CREATE TABLE IF NOT EXISTS "public"."JobFairCompany" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "event_code" character varying(40) NOT NULL DEFAULT 'yuvaaz-2026',
  "company_name" character varying(150) NOT NULL,
  "person_name" character varying(150) NOT NULL,
  "mobile" character varying(10) NOT NULL,
  "user_id" character varying(12) NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "JobFairCompany_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JobFairCompany_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "JobFairCompany_event_mobile_key" UNIQUE ("event_code", "mobile"),
  CONSTRAINT "JobFairCompany_mobile_check" CHECK ("mobile" ~ '^[6-9][0-9]{9}$'),
  CONSTRAINT "JobFairCompany_company_name_check" CHECK (char_length(btrim("company_name")) >= 2),
  CONSTRAINT "JobFairCompany_person_name_check" CHECK (char_length(btrim("person_name")) >= 2)
);

CREATE INDEX IF NOT EXISTS "idx_job_fair_company_event"
  ON "public"."JobFairCompany" ("event_code", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "public"."JobFairCompanyVisit" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL,
  "registration_id" uuid NOT NULL,
  "attended" boolean NOT NULL DEFAULT false,
  "interview_result" character varying(20),
  "remark" text,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "JobFairCompanyVisit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JobFairCompanyVisit_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "public"."JobFairCompany" ("id") ON DELETE CASCADE,
  CONSTRAINT "JobFairCompanyVisit_registration_id_fkey"
    FOREIGN KEY ("registration_id") REFERENCES "public"."JobFairRegistration" ("id") ON DELETE CASCADE,
  CONSTRAINT "JobFairCompanyVisit_company_registration_key" UNIQUE ("company_id", "registration_id"),
  CONSTRAINT "JobFairCompanyVisit_interview_result_check"
    CHECK ("interview_result" IS NULL OR "interview_result" IN ('selected', 'not_selected')),
  CONSTRAINT "JobFairCompanyVisit_remark_check"
    CHECK ("remark" IS NULL OR char_length("remark") <= 1000)
);

CREATE INDEX IF NOT EXISTS "idx_job_fair_company_visit_recent"
  ON "public"."JobFairCompanyVisit" ("company_id", "updated_at" DESC);

ALTER TABLE "public"."JobFairCompany" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."JobFairCompanyVisit" ENABLE ROW LEVEL SECURITY;

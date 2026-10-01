-- YUVAAZ 2026 job fair: public candidate registrations, private resume bucket, staff module.

CREATE SEQUENCE IF NOT EXISTS "public"."job_fair_registration_seq" START 1;

CREATE TABLE IF NOT EXISTS "public"."JobFairRegistration" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "event_code" character varying(40) NOT NULL DEFAULT 'yuvaaz-2026',
  "registration_no" character varying(30) NOT NULL
    DEFAULT ('YUVAAZ-' || lpad(nextval('"public"."job_fair_registration_seq"')::text, 4, '0')),
  "full_name" character varying(150) NOT NULL,
  "mobile" character varying(10) NOT NULL,
  "whatsapp" character varying(10) NOT NULL,
  "age" smallint NOT NULL,
  "gender" character varying(20) NOT NULL,
  "area" character varying(60) NOT NULL,
  "area_other" character varying(150),
  "pincode" character varying(6) NOT NULL,
  "epic_number" character varying(20),
  "qualification" character varying(30) NOT NULL,
  "course" character varying(150),
  "employment_status" character varying(40) NOT NULL,
  "experience" character varying(20) NOT NULL,
  "job_types" text[] NOT NULL DEFAULT '{}',
  "job_type_other" character varying(150),
  "heard_from" character varying(30),
  "resume_storage_path" text,
  "resume_file_name" character varying(255),
  "resume_size_kb" integer,
  "status" character varying(20) NOT NULL DEFAULT 'registered',
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "JobFairRegistration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JobFairRegistration_registration_no_key" UNIQUE ("registration_no"),
  CONSTRAINT "JobFairRegistration_event_mobile_key" UNIQUE ("event_code", "mobile"),
  CONSTRAINT "JobFairRegistration_mobile_check" CHECK ("mobile" ~ '^[6-9][0-9]{9}$'),
  CONSTRAINT "JobFairRegistration_whatsapp_check" CHECK ("whatsapp" ~ '^[6-9][0-9]{9}$'),
  CONSTRAINT "JobFairRegistration_age_check" CHECK ("age" BETWEEN 14 AND 70),
  CONSTRAINT "JobFairRegistration_pincode_check" CHECK ("pincode" ~ '^[0-9]{6}$'),
  CONSTRAINT "JobFairRegistration_gender_check"
    CHECK ("gender" IN ('male', 'female', 'other')),
  CONSTRAINT "JobFairRegistration_qualification_check"
    CHECK ("qualification" IN (
      'below-10th', '10th', '12th', 'iti', 'diploma', 'graduate',
      'postgraduate', 'professional', 'other'
    )),
  CONSTRAINT "JobFairRegistration_employment_status_check"
    CHECK ("employment_status" IN ('fresher', 'experienced-unemployed', 'employed-looking')),
  CONSTRAINT "JobFairRegistration_experience_check"
    CHECK ("experience" IN ('none', 'lt-1', '1-2', '2-5', 'gt-5')),
  CONSTRAINT "JobFairRegistration_job_types_check"
    CHECK (
      cardinality("job_types") > 0
      AND "job_types" <@ ARRAY[
        'office', 'sales', 'it', 'healthcare', 'logistics', 'security', 'any', 'other'
      ]::text[]
    ),
  CONSTRAINT "JobFairRegistration_heard_from_check"
    CHECK ("heard_from" IS NULL OR "heard_from" IN (
      'whatsapp', 'social', 'coordinator', 'college', 'friend', 'poster', 'other'
    )),
  CONSTRAINT "JobFairRegistration_status_check"
    CHECK ("status" IN ('registered', 'attended', 'shortlisted', 'placed'))
);

CREATE INDEX IF NOT EXISTS "idx_job_fair_registration_created_at"
  ON "public"."JobFairRegistration" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_job_fair_registration_area"
  ON "public"."JobFairRegistration" ("area");

CREATE INDEX IF NOT EXISTS "idx_job_fair_registration_qualification"
  ON "public"."JobFairRegistration" ("qualification");

ALTER TABLE "public"."JobFairRegistration" ENABLE ROW LEVEL SECURITY;

-- Private bucket: resumes contain PII; served only via service-role signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('job-fair-resumes', 'job-fair-resumes', false, 5242880)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "RoleModulePermissions" ("role_id", "module_key", "has_access", "created_at", "updated_at")
SELECT r.id, 'job-fair', true, now(), now()
FROM "Role" r
WHERE r.name = 'admin'
ON CONFLICT ("role_id", "module_key") DO UPDATE
SET "has_access" = true, "updated_at" = now();

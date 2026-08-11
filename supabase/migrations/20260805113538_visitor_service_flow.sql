-- Reshape unused Visitor into a person record + VisitorService tickets with tokens.
-- Legacy Visitor rows are unused by the app; clear before reshape.

DELETE FROM public."Visitor";

-- Drop legacy FKs / indexes that will be replaced
ALTER TABLE public."Visitor"
  DROP CONSTRAINT IF EXISTS "Visitor_programme_event_id_DailyProgramme_id_fk";

DROP INDEX IF EXISTS idx_visitor_aadhar_number;
DROP INDEX IF EXISTS idx_visitor_contact_number;
DROP INDEX IF EXISTS idx_visitor_programme_event_id;
DROP INDEX IF EXISTS idx_visitor_visit_date;

ALTER TABLE public."Visitor"
  DROP COLUMN IF EXISTS aadhar_number,
  DROP COLUMN IF EXISTS purpose,
  DROP COLUMN IF EXISTS programme_event_id,
  DROP COLUMN IF EXISTS visit_date;

-- Idempotent: prod/local may already lack contact_number or already have mobile_number.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Visitor'
      AND column_name = 'contact_number'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Visitor'
      AND column_name = 'mobile_number'
  ) THEN
    ALTER TABLE public."Visitor"
      RENAME COLUMN contact_number TO mobile_number;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Visitor'
      AND column_name = 'mobile_number'
  ) THEN
    ALTER TABLE public."Visitor"
      ADD COLUMN mobile_number character varying(20) NOT NULL DEFAULT '';
    ALTER TABLE public."Visitor"
      ALTER COLUMN mobile_number DROP DEFAULT;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Visitor'
      AND column_name = 'contact_number'
  ) THEN
    -- Both columns exist: keep mobile_number, drop legacy contact_number.
    ALTER TABLE public."Visitor"
      DROP COLUMN contact_number;
  END IF;
END $$;

ALTER TABLE public."Visitor"
  ADD COLUMN IF NOT EXISTS voter_id character varying(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Visitor_voter_id_VoterMaster_epic_number_fk'
  ) THEN
    ALTER TABLE public."Visitor"
      ADD CONSTRAINT "Visitor_voter_id_VoterMaster_epic_number_fk"
      FOREIGN KEY (voter_id)
      REFERENCES public."VoterMaster"(epic_number)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_visitor_mobile_number
  ON public."Visitor" USING btree (mobile_number);

CREATE INDEX IF NOT EXISTS idx_visitor_voter_id
  ON public."Visitor" USING btree (voter_id);

CREATE INDEX IF NOT EXISTS idx_visitor_name
  ON public."Visitor" USING btree (name);

-- Per-service visitor tickets (tokens), convertible to BeneficiaryService
CREATE TABLE IF NOT EXISTS public."VisitorService" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL,
  service_name character varying(255) NOT NULL,
  programme_id uuid,
  token character varying(20) NOT NULL,
  description text,
  notes text,
  status character varying(20) NOT NULL DEFAULT 'pending',
  beneficiary_service_id uuid,
  converted_at timestamp without time zone,
  created_by uuid NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "VisitorService_pkey" PRIMARY KEY (id),
  CONSTRAINT "VisitorService_status_check"
    CHECK (status IN ('pending', 'converted', 'cancelled')),
  CONSTRAINT "VisitorService_visitor_id_fkey"
    FOREIGN KEY (visitor_id)
    REFERENCES public."Visitor"(id)
    ON DELETE CASCADE,
  CONSTRAINT "VisitorService_programme_id_fkey"
    FOREIGN KEY (programme_id)
    REFERENCES public."DailyProgramme"(id)
    ON DELETE SET NULL,
  CONSTRAINT "VisitorService_beneficiary_service_id_fkey"
    FOREIGN KEY (beneficiary_service_id)
    REFERENCES public."BeneficiaryService"(id)
    ON DELETE SET NULL,
  CONSTRAINT "VisitorService_created_by_fkey"
    FOREIGN KEY (created_by)
    REFERENCES public."User"(id)
);

CREATE INDEX IF NOT EXISTS idx_visitor_service_visitor_id
  ON public."VisitorService" USING btree (visitor_id);

CREATE INDEX IF NOT EXISTS idx_visitor_service_token
  ON public."VisitorService" USING btree (token);

CREATE INDEX IF NOT EXISTS idx_visitor_service_programme_id
  ON public."VisitorService" USING btree (programme_id);

CREATE INDEX IF NOT EXISTS idx_visitor_service_status
  ON public."VisitorService" USING btree (status);

CREATE INDEX IF NOT EXISTS idx_visitor_service_created_at
  ON public."VisitorService" USING btree (created_at);

-- Grants (match existing Visitor / public table pattern)
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."VisitorService" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."VisitorService" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."VisitorService" TO service_role;

-- Module access: admin + operator roles
INSERT INTO "RoleModulePermissions" ("role_id", "module_key", "has_access", "created_at", "updated_at")
SELECT r.id, 'visitor', true, now(), now()
FROM "Role" r
WHERE r.name IN ('admin', 'operator')
ON CONFLICT ("role_id", "module_key") DO UPDATE SET "has_access" = true, "updated_at" = now();

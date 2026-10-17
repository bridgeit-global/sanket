-- Existing databases already ran yuvaaz.sql. Add the venue check-in timestamp there.
-- Fresh databases get the column from yuvaaz.sql; this statement is safe to repeat.

ALTER TABLE "public"."JobFairRegistration"
  ADD COLUMN IF NOT EXISTS "checked_in_at" timestamp without time zone;

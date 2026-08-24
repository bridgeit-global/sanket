-- Allow Bhoomi Pujan / Lokarpan (Udghatan) photos on ProjectGroundMedia.
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'ProjectGroundMedia'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%photo_type%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public."ProjectGroundMedia" DROP CONSTRAINT IF EXISTS %I',
      constraint_name
    );
  END LOOP;
END $$;

ALTER TABLE "public"."ProjectGroundMedia"
  ALTER COLUMN "photo_type" TYPE character varying(32);

ALTER TABLE "public"."ProjectGroundMedia"
  ADD CONSTRAINT "ProjectGroundMedia_photo_type_check"
    CHECK ("photo_type" IN ('before', 'after', 'bhoomi_pujan', 'lokarpan'));

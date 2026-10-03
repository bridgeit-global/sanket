-- New YUVAAZ registration numbers are YUVAAZ- plus 4 random characters.
-- The old sequence is left in place and is no longer the column default.

CREATE OR REPLACE FUNCTION "public"."job_fair_registration_no"()
RETURNS character varying
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  suffix text := '';
  i int;
BEGIN
  FOR i IN 1..4 LOOP
    suffix := suffix || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN 'YUVAAZ-' || suffix;
END;
$$;

ALTER TABLE "public"."JobFairRegistration"
  ALTER COLUMN "registration_no" SET DEFAULT "public"."job_fair_registration_no"();

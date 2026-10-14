-- Attendance QR tokens are 10 uppercase letters or digits.

ALTER TABLE public."OfficeAndSite"
  ALTER COLUMN qr_code_token DROP DEFAULT;

ALTER TABLE public."OfficeAndSite"
  ALTER COLUMN qr_code_token TYPE text
  USING qr_code_token::text;

DO $$
DECLARE
  site_id uuid;
  next_token text;
BEGIN
  FOR site_id IN
    SELECT id
    FROM public."OfficeAndSite"
    WHERE qr_code_token !~ '^[A-Z0-9]{10}$'
  LOOP
    LOOP
      next_token := upper(substr(translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', 'ABC'), 1, 10));
      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM public."OfficeAndSite"
        WHERE qr_code_token = next_token
      );
    END LOOP;

    UPDATE public."OfficeAndSite"
    SET qr_code_token = next_token
    WHERE id = site_id;
  END LOOP;
END $$;

ALTER TABLE public."OfficeAndSite"
  ADD CONSTRAINT office_and_site_qr_code_token_format
  CHECK (qr_code_token ~ '^[A-Z0-9]{10}$');

ALTER TABLE public."OfficeAndSite"
  ALTER COLUMN qr_code_token SET DEFAULT upper(substr(translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', 'ABC'), 1, 10));

COMMENT ON COLUMN public."OfficeAndSite".qr_code_token IS '10-character uppercase attendance QR token (A-Z, 0-9).';

-- Add visit-level token and outsider location on Visitor.

ALTER TABLE public."Visitor"
  ADD COLUMN IF NOT EXISTS token text,
  ADD COLUMN IF NOT EXISTS location text;

-- Backfill tokens for any existing rows (legacy visitors without visit tokens).
-- Window functions are not allowed in UPDATE SET; compute them in a subquery.
UPDATE public."Visitor" v
SET token = numbered.token
FROM (
  SELECT
    id,
    to_char(timezone('Asia/Kolkata', COALESCE(created_at, now())), 'DDMMYY')
      || '-V-'
      || lpad(
        (
          row_number() OVER (
            PARTITION BY to_char(timezone('Asia/Kolkata', COALESCE(created_at, now())), 'DDMMYY')
            ORDER BY created_at NULLS LAST, id
          )
        )::text,
        4,
        '0'
      ) AS token
  FROM public."Visitor"
  WHERE token IS NULL OR btrim(token) = ''
) numbered
WHERE v.id = numbered.id;

ALTER TABLE public."Visitor"
  ALTER COLUMN token SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Visitor_token_key'
  ) THEN
    ALTER TABLE public."Visitor"
      ADD CONSTRAINT "Visitor_token_key" UNIQUE (token);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_visitor_token
  ON public."Visitor" USING btree (token);

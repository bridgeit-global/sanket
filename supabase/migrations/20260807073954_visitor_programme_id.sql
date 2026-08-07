-- Store linked programme on Visitor so visit tokens can include programme segment.

ALTER TABLE public."Visitor"
  ADD COLUMN IF NOT EXISTS programme_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Visitor_programme_id_fkey'
  ) THEN
    ALTER TABLE public."Visitor"
      ADD CONSTRAINT "Visitor_programme_id_fkey"
      FOREIGN KEY (programme_id)
      REFERENCES public."DailyProgramme"(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_visitor_programme_id
  ON public."Visitor" USING btree (programme_id);

-- Customizable paper size for letter templates and saved letters (A4, A5, B5)

ALTER TABLE "LetterMaster"
  ADD COLUMN IF NOT EXISTS paper_size text NOT NULL DEFAULT 'a4';

UPDATE "LetterMaster"
SET paper_size = CASE
  WHEN letter_type = 'ration' THEN 'b5'
  WHEN letter_type IN ('fees', 'income', 'domicile') THEN 'a5'
  ELSE 'a4'
END;

ALTER TABLE "LetterMaster"
  DROP CONSTRAINT IF EXISTS "LetterMaster_paper_size_check";

ALTER TABLE "LetterMaster"
  ADD CONSTRAINT "LetterMaster_paper_size_check"
    CHECK (paper_size IN ('a4', 'a5', 'b5'));

ALTER TABLE "Letter"
  ADD COLUMN IF NOT EXISTS paper_size text NOT NULL DEFAULT 'a4';

UPDATE "Letter"
SET paper_size = CASE
  WHEN letter_type = 'ration' THEN 'b5'
  WHEN letter_type IN ('fees', 'income', 'domicile') THEN 'a5'
  ELSE 'a4'
END;

ALTER TABLE "Letter"
  DROP CONSTRAINT IF EXISTS "Letter_paper_size_check";

ALTER TABLE "Letter"
  ADD CONSTRAINT "Letter_paper_size_check"
    CHECK (paper_size IN ('a4', 'a5', 'b5'));

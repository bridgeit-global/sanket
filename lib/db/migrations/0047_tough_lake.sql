-- Migrate data from part_no to booth_no where booth_no is null
-- UPDATE "ElectionMapping"
-- SET "booth_no" = "part_no"
-- WHERE "booth_no" IS NULL AND "part_no" IS NOT NULL;

-- Drop the part_no column
ALTER TABLE "ElectionMapping" DROP COLUMN IF EXISTS "part_no";
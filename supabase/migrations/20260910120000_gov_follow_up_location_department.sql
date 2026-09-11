-- Tie Office / campus (GovFollowUpLocation) to a department.
-- Locations with a null department_id stay shared (e.g. Mantralaya, Other).

ALTER TABLE "public"."GovFollowUpLocation"
  ADD COLUMN IF NOT EXISTS "department_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'GovFollowUpLocation_department_id_fkey'
      AND conrelid = 'public."GovFollowUpLocation"'::regclass
  ) THEN
    ALTER TABLE "public"."GovFollowUpLocation"
      ADD CONSTRAINT "GovFollowUpLocation_department_id_fkey"
      FOREIGN KEY ("department_id")
      REFERENCES "public"."GovFollowUpDepartment"("id");
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_gov_follow_up_location_department"
  ON "public"."GovFollowUpLocation" ("department_id");

UPDATE "public"."GovFollowUpLocation" AS loc
SET
  department_id = dept.id,
  updated_at = now()
FROM "public"."GovFollowUpDepartment" AS dept
WHERE loc.department_id IS NULL
  AND (
    (loc.code IN ('bmc-hq', 'bmc-ward') AND dept.code = 'bmc')
    OR (loc.code = 'sra' AND dept.code = 'sra')
    OR (loc.code = 'mhada' AND dept.code = 'mhada')
    OR (loc.code = 'collectorate' AND dept.code = 'collector')
    OR (loc.code = 'police-hq' AND dept.code = 'police')
    OR (loc.code = 'pwd' AND dept.code = 'pwd')
  );

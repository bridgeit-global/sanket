-- Allow MLA projects to span multiple wards and booths.
-- Keep legacy ward_geo_id / booth_no columns in sync (first selected value).

ALTER TABLE "MlaProject"
  ADD COLUMN IF NOT EXISTS "ward_geo_ids" uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "booth_nos" varchar(10)[] NOT NULL DEFAULT '{}';

ALTER TABLE "MlaProject"
  ALTER COLUMN "ward" TYPE text;

UPDATE "MlaProject"
SET "ward_geo_ids" = ARRAY["ward_geo_id"]
WHERE "ward_geo_id" IS NOT NULL
  AND COALESCE(cardinality("ward_geo_ids"), 0) = 0;

UPDATE "MlaProject"
SET "booth_nos" = ARRAY["booth_no"]
WHERE "booth_no" IS NOT NULL
  AND btrim("booth_no") <> ''
  AND COALESCE(cardinality("booth_nos"), 0) = 0;

-- Overall AC-level ward option for projects that span the constituency.
INSERT INTO "CadreGeographicUnit" ("type", "name", "ac_no", "sort_order")
SELECT 'ward', '172 - Anushakti Nagar', '172', 0
WHERE NOT EXISTS (
  SELECT 1
  FROM "CadreGeographicUnit"
  WHERE "type" = 'ward'
    AND "name" = '172 - Anushakti Nagar'
    AND "ac_no" = '172'
);

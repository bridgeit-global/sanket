-- ADM Fund Type options (canonical): Shade Installation or Repair,
-- Solar Light Application, Gym Issue. Replaces legacy MLA/DPDC/Special seeds.

-- 1) Add amenity fund types
INSERT INTO "public"."AdmFundingCategory" ("code", "name", "display_order")
VALUES
  ('SHADE-INSTALL', 'Shade Installation or Repair', 1),
  ('SOLAR-LIGHT', 'Solar Light Application', 2),
  ('GYM-ISSUE', 'Gym Issue', 3)
ON CONFLICT ("code") DO UPDATE
SET
  name = EXCLUDED.name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- 2) Drop unused legacy seed categories (no fund records attached)
DELETE FROM "public"."AdmFundingCategory" c
WHERE c.code IN (
  'DPDC-BMC',
  'DPDC-BEAUT',
  'DPDC-NDSI',
  'DPDC-WALL',
  'SPEC-MIN',
  'SPEC-SNAY',
  'SPEC-TOUR',
  'SPEC-UD',
  'SPEC-PLAN',
  'MLA-FUND',
  'FUNDS'
)
AND NOT EXISTS (
  SELECT 1
  FROM "public"."AdmFundRecord" f
  WHERE f.category_id = c.id
);

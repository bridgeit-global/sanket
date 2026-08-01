-- Remove "Funds" as an ADM fund type; keep only Shade / Solar / Gym.
-- Existing fund records under FUNDS/MLA-FUND are removed with the category
-- (AdmFundRecord.category_id ON DELETE CASCADE).

DELETE FROM "public"."AdmFundingCategory"
WHERE code IN ('FUNDS', 'MLA-FUND');

-- Ensure amenity types exist with stable display order
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

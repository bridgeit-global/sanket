-- Soften prior destructive drop: never delete MLA-FUND / FUNDS when they have
-- (or may regain) fund records. Keep amenity types; leave MLA-FUND alone.

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

-- Only remove empty FUNDS alias if present and unused (do not touch MLA-FUND)
DELETE FROM "public"."AdmFundingCategory" c
WHERE c.code = 'FUNDS'
AND NOT EXISTS (
  SELECT 1 FROM "public"."AdmFundRecord" f WHERE f.category_id = c.id
);

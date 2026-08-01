-- Restore MLA-FUND category for historical ADM fund batches (keep Shade/Solar/Gym).
-- Safe to re-run.

INSERT INTO "public"."AdmFundingCategory" ("code", "name", "display_order")
VALUES ('MLA-FUND', 'MLA Fund', 0)
ON CONFLICT ("code") DO UPDATE
SET
  name = EXCLUDED.name,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- Ensure amenity types remain present
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

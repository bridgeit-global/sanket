-- Wing max geo depth + posts scoped to a vertical + chart position catalog

-- 1) Per-wing max hierarchy depth (Basic = booth; others = ward)
ALTER TABLE "CadreVertical"
  ADD COLUMN IF NOT EXISTS "max_geo_level" varchar(20) NOT NULL DEFAULT 'ward';

ALTER TABLE "CadreVertical"
  DROP CONSTRAINT IF EXISTS "CadreVertical_max_geo_level_check";

ALTER TABLE "CadreVertical"
  ADD CONSTRAINT "CadreVertical_max_geo_level_check"
  CHECK ("max_geo_level" IN ('ward', 'booth'));

UPDATE "CadreVertical"
SET "max_geo_level" = 'booth'
WHERE "name" = 'Basic';

UPDATE "CadreVertical"
SET "max_geo_level" = 'ward'
WHERE "name" IS DISTINCT FROM 'Basic';

-- 2) Scope each post to a wing
ALTER TABLE "CadreMemberPost"
  ADD COLUMN IF NOT EXISTS "vertical_id" uuid REFERENCES "CadreVertical"("id") ON DELETE RESTRICT;

-- Backfill from primary vertical, else lowest sort_order membership
UPDATE "CadreMemberPost" p
SET "vertical_id" = sub.vertical_id
FROM (
  SELECT DISTINCT ON (mv.member_id)
    mv.member_id,
    mv.vertical_id
  FROM "CadreMemberVertical" mv
  JOIN "CadreVertical" v ON v.id = mv.vertical_id
  ORDER BY mv.member_id, mv.is_primary DESC, v.sort_order ASC, mv.vertical_id ASC
) sub
WHERE p.member_id = sub.member_id
  AND p.vertical_id IS NULL;

-- Orphan posts (member with no vertical): drop them so NOT NULL can apply
DELETE FROM "CadreMemberPost"
WHERE "vertical_id" IS NULL;

ALTER TABLE "CadreMemberPost"
  ALTER COLUMN "vertical_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_cadre_member_post_vertical_geo"
  ON "CadreMemberPost" ("vertical_id", "position_id", "ward_geo_id", "booth_no");

-- 3) Levels: add taluka_committee + booth_bla; normalize sort order
INSERT INTO "CadrePositionLevel" ("key", "name", "sort_order")
SELECT v.key, v.name, v.sort_order
FROM (VALUES
  ('taluka', 'Taluka Adhyaksh', 1),
  ('taluka_committee', 'Taluka Committee', 2),
  ('ward', 'Ward Adhyaksh', 3),
  ('ward_committee', 'Ward Committee', 4),
  ('booth', 'Booth Adhyaksh', 5),
  ('booth_bla', 'BLA', 6),
  ('booth_committee', 'Booth Committee', 7)
) AS v(key, name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM "CadrePositionLevel" l WHERE l.key = v.key
);

UPDATE "CadrePositionLevel" SET "name" = 'Taluka Adhyaksh', "sort_order" = 1 WHERE "key" = 'taluka';
UPDATE "CadrePositionLevel" SET "name" = 'Taluka Committee', "sort_order" = 2 WHERE "key" = 'taluka_committee';
UPDATE "CadrePositionLevel" SET "name" = 'Ward Adhyaksh', "sort_order" = 3 WHERE "key" = 'ward';
UPDATE "CadrePositionLevel" SET "name" = 'Ward Committee', "sort_order" = 4 WHERE "key" = 'ward_committee';
UPDATE "CadrePositionLevel" SET "name" = 'Booth Adhyaksh', "sort_order" = 5 WHERE "key" = 'booth';
UPDATE "CadrePositionLevel" SET "name" = 'BLA', "sort_order" = 6 WHERE "key" = 'booth_bla';
UPDATE "CadrePositionLevel" SET "name" = 'Booth Committee', "sort_order" = 7 WHERE "key" = 'booth_committee';

-- 4) Chart positions: rename generic committee member → Executive Member; add named roles
UPDATE "CadrePosition" p
SET "name" = 'Executive Member', "sort_order" = 90, "updated_at" = now()
FROM "CadrePositionLevel" l
WHERE p.level_id = l.id
  AND l.key IN ('ward_committee', 'booth_committee')
  AND p.name = 'Committee Member';

UPDATE "CadrePosition" p
SET "name" = 'Executive Member', "sort_order" = 90, "updated_at" = now()
FROM "CadrePositionLevel" l
WHERE p.level_id = l.id
  AND l.key IN ('ward_committee', 'booth_committee')
  AND p.name LIKE '%Committee Member';

-- Ensure head positions exist / are correctly named
INSERT INTO "CadrePosition" ("level_id", "name", "sort_order", "is_active")
SELECT l.id, p.name, p.sort_order, true
FROM (VALUES
  ('taluka', 'Taluka Adhyaksh', 1),
  ('ward', 'Ward Adhyaksh', 1),
  ('booth', 'Booth Adhyaksh', 1),
  ('booth_bla', 'BLA (Booth Level Agent)', 1)
) AS p(level_key, name, sort_order)
JOIN "CadrePositionLevel" l ON l.key = p.level_key
WHERE NOT EXISTS (
  SELECT 1 FROM "CadrePosition" existing
  WHERE existing.level_id = l.id AND existing.name = p.name
);

-- Taluka / Ward committee roles (shared titles)
INSERT INTO "CadrePosition" ("level_id", "name", "sort_order", "is_active")
SELECT l.id, p.name, p.sort_order, true
FROM (VALUES
  ('Working President', 10),
  ('Vice President', 20),
  ('General Secretary', 30),
  ('Secretary', 40),
  ('Joint Secretary', 50),
  ('Treasurer', 60),
  ('Organization Secretary', 70),
  ('Office Secretary', 80),
  ('Executive Member', 90)
) AS p(name, sort_order)
CROSS JOIN "CadrePositionLevel" l
WHERE l.key IN ('taluka_committee', 'ward_committee')
  AND NOT EXISTS (
    SELECT 1 FROM "CadrePosition" existing
    WHERE existing.level_id = l.id AND existing.name = p.name
  );

-- Booth committee roles (condensed chart set)
INSERT INTO "CadrePosition" ("level_id", "name", "sort_order", "is_active")
SELECT l.id, p.name, p.sort_order, true
FROM (VALUES
  ('Vice President', 10),
  ('Treasurer', 20),
  ('Secretary', 30),
  ('Organization Secretary', 40),
  ('Joint Secretary', 50),
  ('Executive Member', 90)
) AS p(name, sort_order)
JOIN "CadrePositionLevel" l ON l.key = 'booth_committee'
WHERE NOT EXISTS (
  SELECT 1 FROM "CadrePosition" existing
  WHERE existing.level_id = l.id AND existing.name = p.name
);

-- Keep only English chart committee positions (no Hindi/Marathi mixed titles).

-- Allowed taluka/ward committee titles (org chart)
-- Allowed booth committee titles (org chart)

-- Deactivate any committee position outside the chart allowlist
UPDATE "CadrePosition" p
SET "is_active" = false, "updated_at" = now()
FROM "CadrePositionLevel" l
WHERE p.level_id = l.id
  AND l.key IN ('taluka_committee', 'ward_committee')
  AND p.name NOT IN (
    'Working President',
    'Vice President',
    'Vice Presidents',
    'General Secretary',
    'Secretary',
    'Secretaries',
    'Joint Secretary',
    'Joint Secretaries',
    'Treasurer',
    'Organization Secretary',
    'Office Secretary',
    'Executive Member',
    'Executive Members'
  );

UPDATE "CadrePosition" p
SET "is_active" = false, "updated_at" = now()
FROM "CadrePositionLevel" l
WHERE p.level_id = l.id
  AND l.key = 'booth_committee'
  AND p.name NOT IN (
    'Vice President',
    'Treasurer',
    'Secretary',
    'Organization Secretary',
    'Joint Secretary',
    'Executive Member'
  );

-- Normalize plural chart labels → singular canonical names used by the app
UPDATE "CadrePosition" p
SET "name" = 'Vice President', "updated_at" = now()
FROM "CadrePositionLevel" l
WHERE p.level_id = l.id
  AND l.key IN ('taluka_committee', 'ward_committee')
  AND p.name = 'Vice Presidents';

UPDATE "CadrePosition" p
SET "name" = 'Secretary', "updated_at" = now()
FROM "CadrePositionLevel" l
WHERE p.level_id = l.id
  AND l.key IN ('taluka_committee', 'ward_committee')
  AND p.name = 'Secretaries';

UPDATE "CadrePosition" p
SET "name" = 'Joint Secretary', "updated_at" = now()
FROM "CadrePositionLevel" l
WHERE p.level_id = l.id
  AND l.key IN ('taluka_committee', 'ward_committee')
  AND p.name = 'Joint Secretaries';

UPDATE "CadrePosition" p
SET "name" = 'Executive Member', "updated_at" = now()
FROM "CadrePositionLevel" l
WHERE p.level_id = l.id
  AND l.key IN ('taluka_committee', 'ward_committee', 'booth_committee')
  AND p.name = 'Executive Members';

-- Ensure chart positions exist and are active
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

UPDATE "CadrePosition" p
SET "is_active" = true, "sort_order" = v.sort_order, "updated_at" = now()
FROM "CadrePositionLevel" l,
(VALUES
  ('Working President', 10),
  ('Vice President', 20),
  ('General Secretary', 30),
  ('Secretary', 40),
  ('Joint Secretary', 50),
  ('Treasurer', 60),
  ('Organization Secretary', 70),
  ('Office Secretary', 80),
  ('Executive Member', 90)
) AS v(name, sort_order)
WHERE p.level_id = l.id
  AND l.key IN ('taluka_committee', 'ward_committee')
  AND p.name = v.name;

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

UPDATE "CadrePosition" p
SET "is_active" = true, "sort_order" = v.sort_order, "updated_at" = now()
FROM "CadrePositionLevel" l,
(VALUES
  ('Vice President', 10),
  ('Treasurer', 20),
  ('Secretary', 30),
  ('Organization Secretary', 40),
  ('Joint Secretary', 50),
  ('Executive Member', 90)
) AS v(name, sort_order)
WHERE p.level_id = l.id
  AND l.key = 'booth_committee'
  AND p.name = v.name;

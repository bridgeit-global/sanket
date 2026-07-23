-- Remap committee member posts from legacy titles onto English chart roles,
-- then delete non-allowlist CadrePosition rows for committee levels.

-- 1) Ensure English chart positions exist and are active
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

-- 2) Remap posts: legacy name → English chart role (same level)
WITH remap(legacy_name, chart_name) AS (
  VALUES
    -- Working President (taluka/ward)
    ('Ward Karyadhyaksh', 'Working President'),
    ('Taluka Karyadhyaksh', 'Working President'),
    -- Vice President
    ('Ward Upadhyaksh', 'Vice President'),
    ('Ward Upakaryadhyaksh', 'Vice President'),
    ('Ward Sah Upadhyaksh', 'Vice President'),
    ('Taluka Upadhyaksh', 'Vice President'),
    ('Taluka Upakaryadhyaksh', 'Vice President'),
    ('Taluka Sah Upadhyaksh', 'Vice President'),
    ('Booth Upadhyaksh', 'Vice President'),
    ('Booth Upakaryadhyaksh', 'Vice President'),
    ('Booth Karyadhyaksh', 'Vice President'),
    -- General Secretary (taluka/ward); booth maps via catch-all if needed
    ('Ward Mahasachiv', 'General Secretary'),
    ('Taluka Mahasachiv', 'General Secretary'),
    -- Secretary
    ('Ward Sachiv', 'Secretary'),
    ('Taluka Sachiv', 'Secretary'),
    ('Booth Sachiv', 'Secretary'),
    ('Booth Mahasachiv', 'Secretary'),
    -- Joint Secretary
    ('Ward Upasachiv', 'Joint Secretary'),
    ('Taluka Upasachiv', 'Joint Secretary'),
    ('Booth Upasachiv', 'Joint Secretary'),
    -- Treasurer
    ('Ward Khajindar', 'Treasurer'),
    ('Ward Sarchitnis', 'Treasurer'),
    ('Taluka Khajindar', 'Treasurer'),
    ('Taluka Sarchitnis', 'Treasurer'),
    ('Booth Khajindar', 'Treasurer'),
    ('Booth Sarchitnis', 'Treasurer'),
    -- Organization Secretary
    ('Ward Sanghatak', 'Organization Secretary'),
    ('Ward Upasanghatak', 'Organization Secretary'),
    ('Ward Sanghatak Sachiv', 'Organization Secretary'),
    ('Taluka Sanghatak', 'Organization Secretary'),
    ('Taluka Upasanghatak', 'Organization Secretary'),
    ('Taluka Sanghatak Sachiv', 'Organization Secretary'),
    ('Booth Sanghatak', 'Organization Secretary'),
    ('Booth Upasanghatak', 'Organization Secretary'),
    ('Booth Sanghatak Sachiv', 'Organization Secretary'),
    -- Executive Member
    ('Ward Sadasya', 'Executive Member'),
    ('Ward Karyakarini Sadasya', 'Executive Member'),
    ('Ward Committee Member', 'Executive Member'),
    ('Taluka Sadasya', 'Executive Member'),
    ('Taluka Karyakarini Sadasya', 'Executive Member'),
    ('Taluka Committee', 'Executive Member'),
    ('Taluka Committee Member', 'Executive Member'),
    ('Booth Sadasya', 'Executive Member'),
    ('Booth Karyakarini Sadasya', 'Executive Member'),
    ('Booth Committee Member', 'Executive Member'),
    ('Committee Member', 'Executive Member')
)
UPDATE "CadreMemberPost" mp
SET "position_id" = target.id,
    "updated_at" = now()
FROM "CadrePosition" legacy
JOIN "CadrePositionLevel" l ON l.id = legacy.level_id
JOIN remap r ON r.legacy_name = legacy.name
JOIN "CadrePosition" target
  ON target.level_id = legacy.level_id
 AND target.name = r.chart_name
WHERE mp.position_id = legacy.id
  AND l.key IN ('taluka_committee', 'ward_committee', 'booth_committee')
  AND legacy.name IS DISTINCT FROM r.chart_name;

-- 3) Catch-all: any remaining posts on non-allowlist committee positions → Executive Member
UPDATE "CadreMemberPost" mp
SET "position_id" = target.id,
    "updated_at" = now()
FROM "CadrePosition" legacy
JOIN "CadrePositionLevel" l ON l.id = legacy.level_id
JOIN "CadrePosition" target
  ON target.level_id = legacy.level_id
 AND target.name = 'Executive Member'
WHERE mp.position_id = legacy.id
  AND l.key IN ('taluka_committee', 'ward_committee', 'booth_committee')
  AND (
    (l.key IN ('taluka_committee', 'ward_committee') AND legacy.name NOT IN (
      'Working President',
      'Vice President',
      'General Secretary',
      'Secretary',
      'Joint Secretary',
      'Treasurer',
      'Organization Secretary',
      'Office Secretary',
      'Executive Member'
    ))
    OR
    (l.key = 'booth_committee' AND legacy.name NOT IN (
      'Vice President',
      'Treasurer',
      'Secretary',
      'Organization Secretary',
      'Joint Secretary',
      'Executive Member'
    ))
  );

-- 4) Delete non-allowlist committee positions (posts no longer reference them)
DELETE FROM "CadrePosition" p
USING "CadrePositionLevel" l
WHERE p.level_id = l.id
  AND l.key IN ('taluka_committee', 'ward_committee')
  AND p.name NOT IN (
    'Working President',
    'Vice President',
    'General Secretary',
    'Secretary',
    'Joint Secretary',
    'Treasurer',
    'Organization Secretary',
    'Office Secretary',
    'Executive Member'
  );

DELETE FROM "CadrePosition" p
USING "CadrePositionLevel" l
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

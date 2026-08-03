-- After Ward → BMC rename, re-link BMC ServiceCatalog rows to ward letter types.
-- Specific civic complaints → ward-*; remaining BMC-prefixed catalog rows → ward.

-- 1) Specific BMC civic complaints → their ward-* letter types.
UPDATE public."ServiceCatalog" AS sc
SET
  letter_type = v.letter_type,
  updated_at = now()
FROM (
  VALUES
    ('BMC – Garbage Removal', 'ward-garbage'),
    ('BMC – Drain / Gutter Cleaning', 'ward-drain'),
    ('BMC – Tree Branch Trimming', 'ward-tree-trim'),
    ('BMC – Dead / Hazardous Tree Removal', 'ward-tree-dead'),
    ('BMC – Hazardous Tree Inspection', 'ward-tree-hazard'),
    ('BMC – Contaminated Water Supply', 'ward-water-contaminated'),
    ('BMC – Low Water Pressure', 'ward-water-low-pressure'),
    ('BMC – No Water Supply', 'ward-water-none'),
    ('BMC – Tanker Water Supply', 'ward-water-tanker'),
    ('BMC – Road Repair', 'ward-road-repair'),
    ('BMC – Footpath Repair', 'ward-footpath-repair'),
    ('BMC – Street Light Repair', 'ward-street-lights'),
    ('BMC – Speed Breaker Installation', 'ward-speed-breaker')
) AS v(name, letter_type)
WHERE sc.name = v.name;

-- 2) Other active BMC-prefixed catalog services without a letter type → generic ward.
UPDATE public."ServiceCatalog"
SET
  letter_type = 'ward',
  updated_at = now()
WHERE is_active = true
  AND letter_type IS NULL
  AND (
    name ILIKE 'BMC –%'
    OR name ILIKE 'BMC -%'
  );

-- Promote each ward civic complaint to its own letter_type (ward-*),
-- so ServiceCatalog / letter generation open a direct template without an
-- extra "type of complaint" step.

-- 1) ServiceCatalog: map catalog rows onto specific ward-* letter types.
UPDATE public."ServiceCatalog" AS sc
SET
  letter_type = v.letter_type,
  updated_at = now()
FROM (
  VALUES
    ('Ward – Garbage Removal', 'ward-garbage'),
    ('Ward – Drain / Gutter Cleaning', 'ward-drain'),
    ('Ward – Tree Branch Trimming', 'ward-tree-trim'),
    ('Ward – Dead / Hazardous Tree Removal', 'ward-tree-dead'),
    ('Ward – Hazardous Tree Inspection', 'ward-tree-hazard'),
    ('Ward – Contaminated Water Supply', 'ward-water-contaminated'),
    ('Ward – Low Water Pressure', 'ward-water-low-pressure'),
    ('Ward – No Water Supply', 'ward-water-none'),
    ('Ward – Tanker Water Supply', 'ward-water-tanker'),
    ('Ward – Road Repair', 'ward-road-repair'),
    ('Ward – Footpath Repair', 'ward-footpath-repair'),
    ('Ward – Street Light Repair', 'ward-street-lights'),
    ('Ward – Speed Breaker Installation', 'ward-speed-breaker')
) AS v(name, letter_type)
WHERE sc.name = v.name;

-- 2) Address-type links for each specific ward letter type (same as generic ward).
INSERT INTO public."LetterAddressTypeLink" (letter_type, address_field, address_type, sort_order)
SELECT v.letter_type, 'to', 'office', 1
FROM (
  VALUES
    ('ward-garbage'),
    ('ward-drain'),
    ('ward-tree-trim'),
    ('ward-tree-dead'),
    ('ward-tree-hazard'),
    ('ward-water-contaminated'),
    ('ward-water-low-pressure'),
    ('ward-water-none'),
    ('ward-water-tanker'),
    ('ward-road-repair'),
    ('ward-footpath-repair'),
    ('ward-street-lights'),
    ('ward-speed-breaker')
) AS v(letter_type)
ON CONFLICT (letter_type, address_field) DO NOTHING;

-- 3) Seed LetterMaster templates for each ward-* type from the generic ward masters.
INSERT INTO public."LetterMaster" (
  name,
  letter_type,
  letter_locale,
  template_html,
  paper_size,
  letterhead_url,
  letterhead_mode,
  created_at,
  updated_at
)
SELECT
  CASE v.letter_type
    WHEN 'ward-garbage' THEN
      CASE src.letter_locale WHEN 'mr' THEN 'प्रभाग – साचलेला कचरा हटविणे' ELSE 'Ward – Garbage Removal' END
    WHEN 'ward-drain' THEN
      CASE src.letter_locale WHEN 'mr' THEN 'प्रभाग – नाले/गटार साफसफाई' ELSE 'Ward – Drain / Gutter Cleaning' END
    WHEN 'ward-tree-trim' THEN
      CASE src.letter_locale WHEN 'mr' THEN 'प्रभाग – झाडांच्या फांद्यांची छाटणी' ELSE 'Ward – Tree Branch Trimming' END
    WHEN 'ward-tree-dead' THEN
      CASE src.letter_locale WHEN 'mr' THEN 'प्रभाग – मृत व धोकादायक झाडे हटविणे' ELSE 'Ward – Dead / Hazardous Tree Removal' END
    WHEN 'ward-tree-hazard' THEN
      CASE src.letter_locale WHEN 'mr' THEN 'प्रभाग – धोकादायक झाडाची पाहणी' ELSE 'Ward – Hazardous Tree Inspection' END
    WHEN 'ward-water-contaminated' THEN
      CASE src.letter_locale WHEN 'mr' THEN 'प्रभाग – दूषित पाणीपुरवठा' ELSE 'Ward – Contaminated Water Supply' END
    WHEN 'ward-water-low-pressure' THEN
      CASE src.letter_locale WHEN 'mr' THEN 'प्रभाग – कमी दाबाने पाणीपुरवठा' ELSE 'Ward – Low Water Pressure' END
    WHEN 'ward-water-none' THEN
      CASE src.letter_locale WHEN 'mr' THEN 'प्रभाग – पाणीपुरवठा होत नसणे' ELSE 'Ward – No Water Supply' END
    WHEN 'ward-water-tanker' THEN
      CASE src.letter_locale WHEN 'mr' THEN 'प्रभाग – टँकरद्वारे पाणीपुरवठा' ELSE 'Ward – Tanker Water Supply' END
    WHEN 'ward-road-repair' THEN
      CASE src.letter_locale WHEN 'mr' THEN 'प्रभाग – रस्त्याची दुरुस्ती' ELSE 'Ward – Road Repair' END
    WHEN 'ward-footpath-repair' THEN
      CASE src.letter_locale WHEN 'mr' THEN 'प्रभाग – पदपथाची दुरुस्ती' ELSE 'Ward – Footpath Repair' END
    WHEN 'ward-street-lights' THEN
      CASE src.letter_locale WHEN 'mr' THEN 'प्रभाग – बंद पथदिवे सुरू करणे' ELSE 'Ward – Street Light Repair' END
    WHEN 'ward-speed-breaker' THEN
      CASE src.letter_locale WHEN 'mr' THEN 'प्रभाग – गतिरोधक बसविणे' ELSE 'Ward – Speed Breaker Installation' END
    ELSE v.letter_type
  END AS name,
  v.letter_type,
  src.letter_locale,
  src.template_html,
  COALESCE(src.paper_size, 'a5'),
  src.letterhead_url,
  src.letterhead_mode,
  now(),
  now()
FROM (
  VALUES
    ('ward-garbage'),
    ('ward-drain'),
    ('ward-tree-trim'),
    ('ward-tree-dead'),
    ('ward-tree-hazard'),
    ('ward-water-contaminated'),
    ('ward-water-low-pressure'),
    ('ward-water-none'),
    ('ward-water-tanker'),
    ('ward-road-repair'),
    ('ward-footpath-repair'),
    ('ward-street-lights'),
    ('ward-speed-breaker')
) AS v(letter_type)
CROSS JOIN LATERAL (
  SELECT DISTINCT ON (lm.letter_locale)
    lm.letter_locale,
    lm.template_html,
    lm.paper_size,
    lm.letterhead_url,
    lm.letterhead_mode
  FROM public."LetterMaster" lm
  WHERE lm.letter_type = 'ward'
    AND lm.letter_locale IN ('en', 'mr')
  ORDER BY lm.letter_locale, lm.updated_at DESC NULLS LAST, lm.created_at DESC NULLS LAST
) AS src
WHERE NOT EXISTS (
  SELECT 1
  FROM public."LetterMaster" existing
  WHERE existing.letter_type = v.letter_type
    AND existing.letter_locale = src.letter_locale
);

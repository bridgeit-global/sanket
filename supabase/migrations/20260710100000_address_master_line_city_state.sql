-- Restructure address fields: line1, line2, city, state, pincode.

ALTER TABLE "AddressMaster"
  ADD COLUMN IF NOT EXISTS line1_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS line1_mr text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS line2_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS line2_mr text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city_mr text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS state_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS state_mr text NOT NULL DEFAULT '';

-- Migrate from legacy structured columns when present.
UPDATE "AddressMaster"
SET
  line1_en = COALESCE(NULLIF(line1_en, ''), house_number_en, ''),
  line1_mr = COALESCE(NULLIF(line1_mr, ''), house_number_mr, ''),
  line2_en = COALESCE(NULLIF(line2_en, ''), locality_street_en, ''),
  line2_mr = COALESCE(NULLIF(line2_mr, ''), locality_street_mr, ''),
  city_en = COALESCE(NULLIF(city_en, ''), town_village_en, ''),
  city_mr = COALESCE(NULLIF(city_mr, ''), town_village_mr, '')
WHERE house_number_en IS NOT NULL
   OR house_number_mr IS NOT NULL
   OR locality_street_en IS NOT NULL
   OR locality_street_mr IS NOT NULL
   OR town_village_en IS NOT NULL
   OR town_village_mr IS NOT NULL;

-- Improve seed rows with state.
UPDATE "AddressMaster"
SET
  line1_en = '',
  line2_en = 'Tahsildar Office, Kurla',
  city_en = 'Mumbai',
  state_en = 'Maharashtra',
  line1_mr = '',
  line2_mr = 'तहसीलदार कार्यालय, कुर्ला',
  city_mr = 'मुंबई',
  state_mr = 'महाराष्ट्र',
  pincode = ''
WHERE name = 'Tahsildar Office, Kurla';

UPDATE "AddressMaster"
SET
  line1_en = 'Shivajinagar 44-E Office',
  line2_en = 'Shivajinagar, Govandi',
  city_en = 'Mumbai',
  state_en = 'Maharashtra',
  line1_mr = 'शिवाजीनगर ४४ ई कार्यालय',
  line2_mr = 'शिवाजीनगर, गोवंडी',
  city_mr = 'मुंबई',
  state_mr = 'महाराष्ट्र',
  pincode = '400043'
WHERE name = 'Shivajinagar Ration Office';

ALTER TABLE "AddressMaster"
  DROP COLUMN IF EXISTS house_number_en,
  DROP COLUMN IF EXISTS house_number_mr,
  DROP COLUMN IF EXISTS locality_street_en,
  DROP COLUMN IF EXISTS locality_street_mr,
  DROP COLUMN IF EXISTS town_village_en,
  DROP COLUMN IF EXISTS town_village_mr;

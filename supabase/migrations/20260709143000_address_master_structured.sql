-- Replace single address_en/address_mr columns with structured address fields.

ALTER TABLE "AddressMaster"
  ADD COLUMN IF NOT EXISTS house_number_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS house_number_mr text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS locality_street_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS locality_street_mr text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS town_village_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS town_village_mr text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pincode text NOT NULL DEFAULT '';

-- Migrate legacy single-column values into locality_street.
UPDATE "AddressMaster"
SET
  locality_street_en = COALESCE(NULLIF(locality_street_en, ''), address_en, ''),
  locality_street_mr = COALESCE(NULLIF(locality_street_mr, ''), address_mr, '')
WHERE address_en IS NOT NULL OR address_mr IS NOT NULL;

-- Improve seed rows with structured values.
UPDATE "AddressMaster"
SET
  house_number_en = '',
  locality_street_en = 'Tahsildar Office, Kurla',
  town_village_en = 'Mumbai',
  house_number_mr = '',
  locality_street_mr = 'तहसीलदार कार्यालय, कुर्ला',
  town_village_mr = 'मुंबई',
  pincode = ''
WHERE name = 'Tahsildar Office, Kurla';

UPDATE "AddressMaster"
SET
  house_number_en = 'Shivajinagar 44-E Office',
  locality_street_en = 'Shivajinagar, Govandi',
  town_village_en = 'Mumbai',
  house_number_mr = 'शिवाजीनगर ४४ ई कार्यालय',
  locality_street_mr = 'शिवाजीनगर, गोवंडी',
  town_village_mr = 'मुंबई',
  pincode = '400043'
WHERE name = 'Shivajinagar Ration Office';

ALTER TABLE "AddressMaster"
  DROP COLUMN IF EXISTS address_en,
  DROP COLUMN IF EXISTS address_mr;

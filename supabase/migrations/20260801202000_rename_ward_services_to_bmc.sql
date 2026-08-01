-- Rename Service Catalog (and related) display names: "Ward –" → "BMC –"

UPDATE "ServiceCatalog"
SET
  name = replace(name, 'Ward –', 'BMC –'),
  updated_at = now()
WHERE name LIKE 'Ward –%';

UPDATE "ServiceCatalog"
SET
  name = replace(name, 'Ward -', 'BMC -'),
  updated_at = now()
WHERE name LIKE 'Ward -%';

-- Keep historical beneficiary services aligned with catalog names
UPDATE "BeneficiaryService"
SET
  service_name = replace(service_name, 'Ward –', 'BMC –'),
  updated_at = now()
WHERE service_name LIKE 'Ward –%';

UPDATE "BeneficiaryService"
SET
  service_name = replace(service_name, 'Ward -', 'BMC -'),
  updated_at = now()
WHERE service_name LIKE 'Ward -%';

-- Letter master / type labels that used the old English prefix
UPDATE "LetterMaster"
SET
  name = replace(name, 'Ward –', 'BMC –'),
  updated_at = now()
WHERE name LIKE 'Ward –%';

UPDATE "LetterMaster"
SET
  name = replace(name, 'Ward -', 'BMC -'),
  updated_at = now()
WHERE name LIKE 'Ward -%';

UPDATE "LetterTypeMaster"
SET
  label_en = replace(label_en, 'Ward –', 'BMC –'),
  updated_at = now()
WHERE label_en LIKE 'Ward –%';

UPDATE "LetterTypeMaster"
SET
  label_en = replace(label_en, 'Ward -', 'BMC -'),
  updated_at = now()
WHERE label_en LIKE 'Ward -%';

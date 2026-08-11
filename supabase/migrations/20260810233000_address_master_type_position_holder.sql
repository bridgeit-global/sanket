-- Normalize Address Master into Type / AddressBlock / Position / Holder.
-- Additive + in-place backfill only: preserve every AddressMaster id/row.

-- ---------------------------------------------------------------------------
-- 1. AddressTypeMaster
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AddressTypeMaster" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label_en text NOT NULL,
  label_mr text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "AddressTypeMaster_code_unique" UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS "AddressTypeMaster_is_active_idx"
  ON "AddressTypeMaster"(is_active);

CREATE INDEX IF NOT EXISTS "AddressTypeMaster_sort_order_idx"
  ON "AddressTypeMaster"(sort_order);

INSERT INTO "AddressTypeMaster" (code, label_en, label_mr, sort_order)
VALUES
  ('school', 'Institute', 'शाळा / संस्था', 1),
  ('office', 'Government Office', 'शासकीय कार्यालय', 2),
  ('ration_office', 'Ration Office', 'शिधावाटप कार्यालय', 3),
  ('general', 'General / Applicant', 'सामान्य / अर्जदार', 4),
  ('guardian_minister', 'Guardian Minister', 'पालकमंत्री', 10),
  ('co_guardian_minister', 'Co-Guardian Minister', 'सह-पालकमंत्री', 11),
  ('cabinet_minister', 'Cabinet Minister', 'कॅबिनेट मंत्री', 12),
  ('state_minister', 'Minister of State', 'राज्यमंत्री', 13),
  ('chief_minister', 'Chief Minister', 'मुख्यमंत्री', 14),
  ('deputy_chief_minister', 'Deputy Chief Minister', 'उपमुख्यमंत्री', 15)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. AddressBlock (physical address only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AddressBlock" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key text NOT NULL,
  line1_en text NOT NULL DEFAULT '',
  line1_mr text NOT NULL DEFAULT '',
  line2_en text NOT NULL DEFAULT '',
  line2_mr text NOT NULL DEFAULT '',
  line3_en text NOT NULL DEFAULT '',
  line3_mr text NOT NULL DEFAULT '',
  city_en text NOT NULL DEFAULT '',
  city_mr text NOT NULL DEFAULT '',
  state_en text NOT NULL DEFAULT '',
  state_mr text NOT NULL DEFAULT '',
  pincode text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid NULL REFERENCES "User"(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES "User"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "AddressBlock_content_key_unique" UNIQUE (content_key)
);

CREATE INDEX IF NOT EXISTS "AddressBlock_is_active_idx"
  ON "AddressBlock"(is_active);

CREATE INDEX IF NOT EXISTS "AddressBlock_pincode_idx"
  ON "AddressBlock"(pincode);

-- ---------------------------------------------------------------------------
-- 3. PositionMaster
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PositionMaster" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NULL,
  title_en text NOT NULL,
  title_mr text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid NULL REFERENCES "User"(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES "User"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "PositionMaster_code_unique" UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS "PositionMaster_is_active_idx"
  ON "PositionMaster"(is_active);

CREATE INDEX IF NOT EXISTS "PositionMaster_title_en_idx"
  ON "PositionMaster"(title_en);

-- ---------------------------------------------------------------------------
-- 4. Reshape AddressMaster in place (preserve ids)
-- ---------------------------------------------------------------------------
ALTER TABLE "AddressMaster"
  ADD COLUMN IF NOT EXISTS type_id uuid NULL,
  ADD COLUMN IF NOT EXISTS address_id uuid NULL,
  ADD COLUMN IF NOT EXISTS position_id uuid NULL,
  ADD COLUMN IF NOT EXISTS holder_name_en text NULL,
  ADD COLUMN IF NOT EXISTS holder_name_mr text NULL;

-- Holder from existing name columns
UPDATE "AddressMaster"
SET
  holder_name_en = COALESCE(NULLIF(trim(holder_name_en), ''), name),
  holder_name_mr = COALESCE(NULLIF(trim(holder_name_mr), ''), COALESCE(name_mr, ''));

-- Type FK from legacy address_type
UPDATE "AddressMaster" am
SET type_id = t.id
FROM "AddressTypeMaster" t
WHERE am.type_id IS NULL
  AND t.code = am.address_type;

-- Fallback type for any unexpected legacy values
UPDATE "AddressMaster" am
SET type_id = t.id
FROM "AddressTypeMaster" t
WHERE am.type_id IS NULL
  AND t.code = 'general';

-- Insert AddressBlocks from distinct physical address payloads (dedupe)
INSERT INTO "AddressBlock" (
  content_key,
  line1_en, line1_mr,
  line2_en, line2_mr,
  line3_en, line3_mr,
  city_en, city_mr,
  state_en, state_mr,
  pincode,
  sort_order,
  created_at,
  updated_at
)
SELECT DISTINCT ON (content_key)
  content_key,
  line1_en, line1_mr,
  line2_en, line2_mr,
  line3_en, line3_mr,
  city_en, city_mr,
  state_en, state_mr,
  pincode,
  0,
  now(),
  now()
FROM (
  SELECT
    md5(
      coalesce(line1_en, '') || E'\n' ||
      coalesce(line1_mr, '') || E'\n' ||
      coalesce(line2_en, '') || E'\n' ||
      coalesce(line2_mr, '') || E'\n' ||
      coalesce(line3_en, '') || E'\n' ||
      coalesce(line3_mr, '') || E'\n' ||
      coalesce(city_en, '') || E'\n' ||
      coalesce(city_mr, '') || E'\n' ||
      coalesce(state_en, '') || E'\n' ||
      coalesce(state_mr, '') || E'\n' ||
      coalesce(pincode, '')
    ) AS content_key,
    coalesce(line1_en, '') AS line1_en,
    coalesce(line1_mr, '') AS line1_mr,
    coalesce(line2_en, '') AS line2_en,
    coalesce(line2_mr, '') AS line2_mr,
    coalesce(line3_en, '') AS line3_en,
    coalesce(line3_mr, '') AS line3_mr,
    coalesce(city_en, '') AS city_en,
    coalesce(city_mr, '') AS city_mr,
    coalesce(state_en, '') AS state_en,
    coalesce(state_mr, '') AS state_mr,
    coalesce(pincode, '') AS pincode
  FROM "AddressMaster"
  WHERE address_id IS NULL
) src
ORDER BY content_key
ON CONFLICT (content_key) DO NOTHING;

-- Point AddressMaster rows at their AddressBlock
UPDATE "AddressMaster" am
SET address_id = ab.id
FROM "AddressBlock" ab
WHERE am.address_id IS NULL
  AND ab.content_key = md5(
    coalesce(am.line1_en, '') || E'\n' ||
    coalesce(am.line1_mr, '') || E'\n' ||
    coalesce(am.line2_en, '') || E'\n' ||
    coalesce(am.line2_mr, '') || E'\n' ||
    coalesce(am.line3_en, '') || E'\n' ||
    coalesce(am.line3_mr, '') || E'\n' ||
    coalesce(am.city_en, '') || E'\n' ||
    coalesce(am.city_mr, '') || E'\n' ||
    coalesce(am.state_en, '') || E'\n' ||
    coalesce(am.state_mr, '') || E'\n' ||
    coalesce(am.pincode, '')
  );

-- One PositionMaster per existing AddressMaster row (title = legacy name).
-- Temporary _source_am_id gives a precise 1:1 link without deleting any AM rows.
ALTER TABLE "PositionMaster"
  ADD COLUMN IF NOT EXISTS _source_am_id uuid;

INSERT INTO "PositionMaster" (
  _source_am_id,
  title_en,
  title_mr,
  sort_order,
  is_active,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  am.id,
  am.name,
  coalesce(am.name_mr, ''),
  am.sort_order,
  am.is_active,
  am.created_by,
  am.updated_by,
  am.created_at,
  am.updated_at
FROM "AddressMaster" am
WHERE am.position_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "PositionMaster" pm WHERE pm._source_am_id = am.id
  );

UPDATE "AddressMaster" am
SET position_id = pm.id
FROM "PositionMaster" pm
WHERE am.position_id IS NULL
  AND pm._source_am_id = am.id;

ALTER TABLE "PositionMaster"
  DROP COLUMN IF EXISTS _source_am_id;

-- Enforce FKs / NOT NULL after backfill
ALTER TABLE "AddressMaster"
  ALTER COLUMN holder_name_en SET NOT NULL,
  ALTER COLUMN holder_name_mr SET NOT NULL,
  ALTER COLUMN type_id SET NOT NULL,
  ALTER COLUMN address_id SET NOT NULL,
  ALTER COLUMN position_id SET NOT NULL;

ALTER TABLE "AddressMaster"
  DROP CONSTRAINT IF EXISTS "AddressMaster_type_id_fkey",
  DROP CONSTRAINT IF EXISTS "AddressMaster_address_id_fkey",
  DROP CONSTRAINT IF EXISTS "AddressMaster_position_id_fkey";

ALTER TABLE "AddressMaster"
  ADD CONSTRAINT "AddressMaster_type_id_fkey"
    FOREIGN KEY (type_id) REFERENCES "AddressTypeMaster"(id),
  ADD CONSTRAINT "AddressMaster_address_id_fkey"
    FOREIGN KEY (address_id) REFERENCES "AddressBlock"(id),
  ADD CONSTRAINT "AddressMaster_position_id_fkey"
    FOREIGN KEY (position_id) REFERENCES "PositionMaster"(id);

CREATE INDEX IF NOT EXISTS "AddressMaster_type_id_idx"
  ON "AddressMaster"(type_id);
CREATE INDEX IF NOT EXISTS "AddressMaster_address_id_idx"
  ON "AddressMaster"(address_id);
CREATE INDEX IF NOT EXISTS "AddressMaster_position_id_idx"
  ON "AddressMaster"(position_id);
CREATE INDEX IF NOT EXISTS "AddressMaster_holder_name_en_idx"
  ON "AddressMaster"(holder_name_en);

-- Drop legacy columns (rows preserved)
ALTER TABLE "AddressMaster"
  DROP CONSTRAINT IF EXISTS "AddressMaster_name_unique",
  DROP CONSTRAINT IF EXISTS "AddressMaster_address_type_check";

DROP INDEX IF EXISTS "AddressMaster_address_type_idx";

ALTER TABLE "AddressMaster"
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS name_mr,
  DROP COLUMN IF EXISTS address_type,
  DROP COLUMN IF EXISTS line1_en,
  DROP COLUMN IF EXISTS line1_mr,
  DROP COLUMN IF EXISTS line2_en,
  DROP COLUMN IF EXISTS line2_mr,
  DROP COLUMN IF EXISTS line3_en,
  DROP COLUMN IF EXISTS line3_mr,
  DROP COLUMN IF EXISTS city_en,
  DROP COLUMN IF EXISTS city_mr,
  DROP COLUMN IF EXISTS state_en,
  DROP COLUMN IF EXISTS state_mr,
  DROP COLUMN IF EXISTS pincode;

-- ---------------------------------------------------------------------------
-- 5. LetterAddressTypeLink: allow any AddressTypeMaster.code
-- ---------------------------------------------------------------------------
ALTER TABLE "LetterAddressTypeLink"
  DROP CONSTRAINT IF EXISTS "LetterAddressTypeLink_address_type_check";

ALTER TABLE "LetterAddressTypeLink"
  DROP CONSTRAINT IF EXISTS "LetterAddressTypeLink_address_type_fkey";

ALTER TABLE "LetterAddressTypeLink"
  ADD CONSTRAINT "LetterAddressTypeLink_address_type_fkey"
    FOREIGN KEY (address_type) REFERENCES "AddressTypeMaster"(code);

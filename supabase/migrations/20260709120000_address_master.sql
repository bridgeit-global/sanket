-- Reusable address master for letter generation

CREATE TABLE IF NOT EXISTS "AddressMaster" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address_type text NOT NULL,
  address_en text NOT NULL,
  address_mr text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid NULL REFERENCES "User"(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES "User"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "AddressMaster_name_unique" UNIQUE (name),
  CONSTRAINT "AddressMaster_address_type_check"
    CHECK (address_type IN ('school', 'office', 'ration_office', 'general'))
);

CREATE INDEX IF NOT EXISTS "AddressMaster_address_type_idx"
  ON "AddressMaster"(address_type);

CREATE INDEX IF NOT EXISTS "AddressMaster_is_active_idx"
  ON "AddressMaster"(is_active);

INSERT INTO "AddressMaster" (name, address_type, address_en, address_mr, sort_order)
VALUES
  (
    'Tahsildar Office, Kurla',
    'office',
    'Tahsildar Office, Kurla, Mumbai',
    'तहसीलदार कार्यालय, कुर्ला, मुंबई',
    1
  ),
  (
    'Shivajinagar Ration Office',
    'ration_office',
    'Shivajinagar 44-E Office, Shivajinagar, Govandi, Mumbai - 400 043',
    'शिवाजीनगर ४४ ई कार्यालय, शिवाजीनगर, गोवंडी, मुंबई - ४०० ०४३',
    2
  )
ON CONFLICT (name) DO NOTHING;

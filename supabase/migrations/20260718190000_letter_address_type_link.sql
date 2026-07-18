-- Maps letter types + address fields to AddressMaster.address_type for autofill pickers

CREATE TABLE IF NOT EXISTS "LetterAddressTypeLink" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_type text NOT NULL,
  address_field text NOT NULL,
  address_type text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "LetterAddressTypeLink_letter_field_unique"
    UNIQUE (letter_type, address_field),
  CONSTRAINT "LetterAddressTypeLink_address_type_check"
    CHECK (address_type IN ('school', 'office', 'ration_office', 'general')),
  CONSTRAINT "LetterAddressTypeLink_address_field_check"
    CHECK (address_field IN (
      'school',
      'applicant',
      'rationOffice',
      'office',
      'fromRationOffice',
      'toRationOffice'
    ))
);

CREATE INDEX IF NOT EXISTS "LetterAddressTypeLink_letter_type_idx"
  ON "LetterAddressTypeLink"(letter_type);

INSERT INTO "LetterAddressTypeLink" (letter_type, address_field, address_type, sort_order)
VALUES
  ('fees', 'school', 'school', 1),
  ('school-admission', 'school', 'school', 1),
  ('school-admission', 'applicant', 'general', 2),
  ('school-transfer', 'school', 'school', 1),
  ('school-transfer', 'applicant', 'general', 2),
  ('ration-new', 'rationOffice', 'ration_office', 1),
  ('ration-new', 'applicant', 'general', 2),
  ('ration-add-members', 'rationOffice', 'ration_office', 1),
  ('ration-add-members', 'applicant', 'general', 2),
  ('ration-delete-members', 'rationOffice', 'ration_office', 1),
  ('ration-delete-members', 'applicant', 'general', 2),
  ('ration-transfer', 'rationOffice', 'ration_office', 1),
  ('ration-transfer', 'fromRationOffice', 'ration_office', 2),
  ('ration-transfer', 'toRationOffice', 'ration_office', 3),
  ('ration-transfer', 'applicant', 'general', 4),
  ('income', 'office', 'office', 1),
  ('income', 'applicant', 'general', 2),
  ('domicile', 'office', 'office', 1),
  ('domicile', 'applicant', 'general', 2)
ON CONFLICT (letter_type, address_field) DO NOTHING;

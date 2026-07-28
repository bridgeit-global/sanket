-- Allow ward letter recipient slot ("to") on LetterAddressTypeLink

ALTER TABLE "LetterAddressTypeLink"
  DROP CONSTRAINT IF EXISTS "LetterAddressTypeLink_address_field_check";

ALTER TABLE "LetterAddressTypeLink"
  ADD CONSTRAINT "LetterAddressTypeLink_address_field_check"
  CHECK (address_field IN (
    'school',
    'applicant',
    'rationOffice',
    'office',
    'to',
    'fromRationOffice',
    'toRationOffice'
  ));

INSERT INTO "LetterAddressTypeLink" (letter_type, address_field, address_type, sort_order)
VALUES
  ('ward', 'to', 'office', 1)
ON CONFLICT (letter_type, address_field) DO NOTHING;

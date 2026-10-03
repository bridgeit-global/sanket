-- Temporary Ration Card service + address-type links for letter generation.

INSERT INTO public."ServiceCatalog" (name, category, sort_order, letter_type, is_active)
VALUES (
  'Ration Card - Temporary',
  'Identity, Cards & Certificates',
  112,
  'ration-temporary',
  true
)
ON CONFLICT (name) DO UPDATE
SET
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  letter_type = EXCLUDED.letter_type,
  is_active = true,
  updated_at = now();

INSERT INTO public."LetterAddressTypeLink" (letter_type, address_field, address_type, sort_order)
VALUES
  ('ration-temporary', 'rationOffice', 'ration_office', 1),
  ('ration-temporary', 'applicant', 'general', 2)
ON CONFLICT (letter_type, address_field) DO UPDATE
SET
  address_type = EXCLUDED.address_type,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

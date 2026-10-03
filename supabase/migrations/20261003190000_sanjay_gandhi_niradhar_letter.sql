-- Sanjay Gandhi Niradhar Yojana restart letter + catalog link.

INSERT INTO public."ServiceCatalog" (name, category, sort_order, letter_type, is_active)
VALUES (
  'Sanjay Gandhi Niradhar Yojana',
  'Pension & Social Welfare',
  114,
  'sanjay-gandhi-niradhar',
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
  ('sanjay-gandhi-niradhar', 'office', 'office', 1),
  ('sanjay-gandhi-niradhar', 'applicant', 'general', 2)
ON CONFLICT (letter_type, address_field) DO UPDATE
SET
  address_type = EXCLUDED.address_type,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

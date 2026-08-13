-- Link College Admission service to the new college-admission letter type,
-- and seed address-type links for its form pickers.

INSERT INTO public."ServiceCatalog" (name, category, sort_order, letter_type, is_active)
VALUES (
  'College Admission',
  'Education & Student Services',
  15,
  'college-admission',
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
  ('college-admission', 'school', 'school', 1),
  ('college-admission', 'applicant', 'general', 2)
ON CONFLICT (letter_type, address_field) DO UPDATE
SET
  address_type = EXCLUDED.address_type,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

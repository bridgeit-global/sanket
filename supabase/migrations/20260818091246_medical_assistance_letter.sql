-- Link medical assistance catalog services to the new letter type,
-- and seed address-type links for hospital + applicant pickers.

UPDATE public."ServiceCatalog"
SET
  letter_type = 'medical-assistance',
  updated_at = now()
WHERE name IN (
  'Medical Assistance',
  'Medical Aid',
  'Cancer-Related Assistance'
);

INSERT INTO public."LetterAddressTypeLink" (letter_type, address_field, address_type, sort_order)
VALUES
  ('medical-assistance', 'school', 'school', 1),
  ('medical-assistance', 'applicant', 'general', 2)
ON CONFLICT (letter_type, address_field) DO UPDATE
SET
  address_type = EXCLUDED.address_type,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- QR Birth Certificate service, linked to letter type qr-birth-certificate.

UPDATE public."ServiceCatalog"
SET
  letter_type = 'qr-birth-certificate',
  updated_at = now()
WHERE letter_type = 'birth-certificate'
   OR name = 'QR Birth Certificate';

UPDATE public."LetterAddressTypeLink"
SET
  letter_type = 'qr-birth-certificate',
  updated_at = now()
WHERE letter_type = 'birth-certificate';

UPDATE public."LetterMaster"
SET
  letter_type = 'qr-birth-certificate',
  updated_at = now()
WHERE letter_type = 'birth-certificate';

UPDATE public."Letter"
SET letter_type = 'qr-birth-certificate'
WHERE letter_type = 'birth-certificate';

INSERT INTO public."ServiceCatalog" (name, category, sort_order, letter_type, is_active)
VALUES (
  'QR Birth Certificate',
  'Identity, Cards & Certificates',
  111,
  'qr-birth-certificate',
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
  ('qr-birth-certificate', 'office', 'office', 1)
ON CONFLICT (letter_type, address_field) DO UPDATE
SET
  address_type = EXCLUDED.address_type,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

UPDATE public."LetterMaster"
SET
  name = CASE letter_locale
    WHEN 'mr' THEN 'QR जन्म प्रमाणपत्र'
    ELSE 'QR Birth Certificate'
  END,
  updated_at = now()
WHERE letter_type = 'qr-birth-certificate'
  AND name IN (
    'QR Code Birth Certificate Recommendation',
    'QR Code जन्म प्रमाणपत्र शिफारस',
    'QR Code Birth Certificate',
    'QR Code जन्म प्रमाणपत्र'
  );

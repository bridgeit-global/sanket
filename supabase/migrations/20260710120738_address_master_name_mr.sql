-- Add Marathi display name alongside English `name`.

ALTER TABLE "AddressMaster"
  ADD COLUMN IF NOT EXISTS name_mr text NOT NULL DEFAULT '';

UPDATE "AddressMaster"
SET name_mr = CASE name
  WHEN 'Tahsildar Office, Kurla' THEN 'तहसीलदार कार्यालय, कुर्ला'
  WHEN 'Shivajinagar Ration Office' THEN 'शिवाजीनगर रेशन कार्यालय'
  ELSE name_mr
END
WHERE name_mr = '';

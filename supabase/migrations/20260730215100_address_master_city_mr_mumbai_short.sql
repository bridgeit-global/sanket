-- Shorten Marathi city label for Mumbai in AddressMaster
UPDATE "AddressMaster"
SET city_mr = 'मु',
    updated_at = NOW()
WHERE city_mr = 'मुंबई';

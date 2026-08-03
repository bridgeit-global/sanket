-- Restore full Marathi city label for Mumbai in AddressMaster
UPDATE "AddressMaster"
SET city_mr = 'मुंबई',
    updated_at = NOW()
WHERE city_mr = 'मु';

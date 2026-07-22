-- Replace legacy Marathi term 'रेशनिंग' with 'शिधावाटप' in AddressMaster display names.

UPDATE "AddressMaster"
SET name_mr = REPLACE(name_mr, 'रेशनिंग', 'शिधावाटप')
WHERE name_mr LIKE '%रेशनिंग%';

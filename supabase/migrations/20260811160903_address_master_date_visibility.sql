-- Optional date window for letter address pickers.
-- If end_date is null, the entry is always shown (when active).
-- If end_date is set, the entry is shown only when the letter date falls
-- within [start_date, end_date] (null start_date is open-ended).
-- New/existing rows default start_date to 2026-01-01.

ALTER TABLE "AddressMaster"
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

ALTER TABLE "AddressMaster"
  DROP COLUMN IF EXISTS date_visible;

UPDATE "AddressMaster"
SET start_date = DATE '2026-01-01'
WHERE start_date IS NULL;

ALTER TABLE "AddressMaster"
  ALTER COLUMN start_date SET DEFAULT DATE '2026-01-01';

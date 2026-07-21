-- Add an optional third street line to addresses (between line2 and city).

ALTER TABLE "AddressMaster"
  ADD COLUMN IF NOT EXISTS line3_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS line3_mr text NOT NULL DEFAULT '';

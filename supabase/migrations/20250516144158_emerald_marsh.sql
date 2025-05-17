/*
  # Add columns for controlling deck visibility and sellability

  1. Changes
     - Add `is_listed` column to decks table (boolean, defaults to false)
       Controls whether the deck is visible in the marketplace
     - Add `is_sellable` column to decks table (boolean, defaults to false)
       Controls whether the deck can be purchased (if false, it can be offered for free)

  2. These columns allow deck creators to control:
     - Whether their deck appears in the marketplace at all
     - Whether their deck can be purchased or only offered for free
*/

-- Add columns to control deck visibility and sellability
ALTER TABLE decks
ADD COLUMN IF NOT EXISTS is_listed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE decks
ADD COLUMN IF NOT EXISTS is_sellable BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing records to maintain backwards compatibility
UPDATE decks
SET is_listed = is_public
WHERE is_listed = FALSE;

-- For free decks, make them not sellable by default
UPDATE decks
SET is_sellable = NOT is_free
WHERE is_sellable = FALSE;
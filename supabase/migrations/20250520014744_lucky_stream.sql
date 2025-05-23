/*
  # Fix reader price validation trigger

  1. Changes
     - Improve the validate_reader_price function to properly handle free readings
     - Ensure custom_price_per_minute can be set to 0 for free readings
     - Fix case where reader level changes and price needs validation

  2. Security
     - Maintains existing row level security
*/

-- Drop the trigger first
DROP TRIGGER IF EXISTS validate_reader_price_trigger ON users;

-- Then drop the function
DROP FUNCTION IF EXISTS validate_reader_price;

-- Create an improved validate_reader_price function that properly handles free readings
CREATE OR REPLACE FUNCTION validate_reader_price()
RETURNS trigger AS $$
BEGIN
  -- Special case: if price is 0, allow it (free readings) regardless of level
  IF NEW.custom_price_per_minute = 0 THEN
    -- Free reading is always allowed
    RETURN NEW;
  END IF;
  
  -- If updating price or level, validate the price against level's max
  IF (TG_OP = 'UPDATE') AND (
     (NEW.custom_price_per_minute IS DISTINCT FROM OLD.custom_price_per_minute) OR
     (NEW.level_id IS DISTINCT FROM OLD.level_id)
  ) THEN
    -- Validate against level's max price
    IF NEW.custom_price_per_minute IS NOT NULL AND NEW.level_id IS NOT NULL THEN
      -- Get the max price from reader's level
      DECLARE
        max_price numeric;
      BEGIN
        SELECT base_price_per_minute INTO max_price 
        FROM reader_levels 
        WHERE id = NEW.level_id;
        
        -- If max_price was found and custom price exceeds max price, cap at max price
        IF max_price IS NOT NULL AND NEW.custom_price_per_minute > max_price THEN
          NEW.custom_price_per_minute := max_price;
        END IF;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with correct columns being watched
CREATE TRIGGER validate_reader_price_trigger
BEFORE UPDATE OF custom_price_per_minute, level_id ON users
FOR EACH ROW
EXECUTE FUNCTION validate_reader_price();

-- Make sure we have the performance index
CREATE INDEX IF NOT EXISTS idx_users_custom_price_per_minute
ON users (custom_price_per_minute)
WHERE custom_price_per_minute IS NOT NULL;
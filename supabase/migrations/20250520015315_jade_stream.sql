/*
  # Reader rate settings migration
  
  1. Changes
     - Enhance validate_reader_price function to properly handle free readings
     - Fix issues with the trigger implementation
     - Add performance index for querying by price
     
  2. Security
     - No security changes
*/

-- First drop the trigger to avoid dependency issues
DROP TRIGGER IF EXISTS validate_reader_price_trigger ON users;

-- Then drop the function
DROP FUNCTION IF EXISTS validate_reader_price();

-- Create an improved validate_reader_price function
CREATE OR REPLACE FUNCTION validate_reader_price()
RETURNS trigger AS $$
BEGIN
  -- Special case: if price is 0, allow it (free readings)
  IF NEW.custom_price_per_minute = 0 THEN
    -- Free reading is always allowed
    RETURN NEW;
  END IF;
  
  -- If updating price or level, validate the price against level's max
  IF NEW.custom_price_per_minute IS NOT NULL AND NEW.level_id IS NOT NULL THEN
    -- Get the max price from reader's level
    DECLARE
      max_price numeric;
    BEGIN
      SELECT base_price_per_minute INTO max_price 
      FROM reader_levels 
      WHERE id = NEW.level_id;
      
      -- If max_price was found and custom price exceeds max price, set to max price
      IF max_price IS NOT NULL AND NEW.custom_price_per_minute > max_price THEN
        NEW.custom_price_per_minute := max_price;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger with proper columns being watched
CREATE TRIGGER validate_reader_price_trigger
BEFORE UPDATE OF custom_price_per_minute, level_id ON users
FOR EACH ROW
EXECUTE FUNCTION validate_reader_price();

-- Create performance index for price queries if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'users' AND indexname = 'idx_users_custom_price_per_minute'
  ) THEN
    CREATE INDEX idx_users_custom_price_per_minute
    ON users (custom_price_per_minute)
    WHERE custom_price_per_minute IS NOT NULL;
  END IF;
END $$;
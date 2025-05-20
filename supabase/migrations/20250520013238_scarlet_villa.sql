-- Drop the trigger first
DROP TRIGGER IF EXISTS validate_reader_price_trigger ON users;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS validate_reader_price;

-- Create an improved validate_reader_price function
CREATE OR REPLACE FUNCTION validate_reader_price()
RETURNS trigger AS $$
BEGIN
  -- Only perform validation when custom_price_per_minute is being set
  IF TG_OP = 'UPDATE' THEN
    -- Special case: if price is 0, allow it (free readings)
    IF NEW.custom_price_per_minute = 0 THEN
      -- Free reading is always allowed
      RETURN NEW;
    END IF;
    
    -- If not free (0), validate against max price
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Make sure the trigger is in place
CREATE TRIGGER validate_reader_price_trigger
BEFORE UPDATE OF custom_price_per_minute, level_id ON users
FOR EACH ROW
EXECUTE FUNCTION validate_reader_price();

-- Create an index on custom_price_per_minute for performance
CREATE INDEX IF NOT EXISTS idx_users_custom_price_per_minute
ON users (custom_price_per_minute)
WHERE custom_price_per_minute IS NOT NULL;
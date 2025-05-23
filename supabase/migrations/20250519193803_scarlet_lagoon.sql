-- Add custom_price_per_minute column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'custom_price_per_minute'
  ) THEN
    ALTER TABLE users ADD COLUMN custom_price_per_minute numeric;
    COMMENT ON COLUMN users.custom_price_per_minute IS 'Custom price per minute set by readers, can be less than or equal to their level''s max rate';
  END IF;
END $$;

-- Create a function to validate custom price is not higher than level's base price
CREATE OR REPLACE FUNCTION validate_reader_price()
RETURNS trigger AS $$
BEGIN
  -- Only perform validation when custom_price_per_minute is being set
  IF NEW.custom_price_per_minute IS NOT NULL AND TG_OP = 'UPDATE' THEN
    -- Get the max price from reader's level
    DECLARE
      max_price numeric;
    BEGIN
      SELECT base_price_per_minute INTO max_price 
      FROM reader_levels 
      WHERE id = NEW.level_id;
      
      -- If custom price exceeds max price for the reader's level, reset to max price
      IF NEW.custom_price_per_minute > max_price THEN
        NEW.custom_price_per_minute := max_price;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger for the function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'validate_reader_price_trigger'
  ) THEN
    CREATE TRIGGER validate_reader_price_trigger
    BEFORE UPDATE OF custom_price_per_minute, level_id ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_reader_price();
  END IF;
END $$;
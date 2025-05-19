/*
  # Update reader levels to use chakra system colors

  1. Updates
    - Changes reader level color themes to match VIBGYOR chakra system
    - Updates icons to match their chakra level
    - Ensures all 5 levels exist with the correct configuration
  
  2. Performance
    - Adds database indexes to improve sorting and filtering
    - Creates indexes for reader level queries
    - Optimizes reader card sorting by level and price
*/

-- Update reader levels with chakra system colors
UPDATE reader_levels SET
  color_theme = 'red',
  icon = 'flame' 
WHERE name = 'Novice Seer' OR rank_order = 1;

UPDATE reader_levels SET
  color_theme = 'orange',
  icon = 'sparkles'
WHERE name = 'Mystic Adept' OR rank_order = 2;

UPDATE reader_levels SET
  color_theme = 'yellow',
  icon = 'sun'
WHERE name = 'Ethereal Guide' OR rank_order = 3;

UPDATE reader_levels SET
  color_theme = 'green', 
  icon = 'heart'
WHERE name = 'Celestial Oracle' OR rank_order = 4;

UPDATE reader_levels SET
  color_theme = 'violet',
  icon = 'crown'
WHERE name = 'Arcane Hierophant' OR rank_order = 5;

-- Make sure we have all five levels in the VIBGYOR order
DO $$
BEGIN
  -- Create the levels if they don't exist
  IF NOT EXISTS (SELECT 1 FROM reader_levels WHERE rank_order = 1) THEN
    INSERT INTO reader_levels (name, description, min_rating, min_readings, base_price_per_minute, color_theme, icon, required_quiz_score, rank_order)
    VALUES ('Novice Seer', 'Beginning your journey into the mystical arts of tarot reading.', 0, 0, 0.25, 'red', 'flame', 75, 1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM reader_levels WHERE rank_order = 2) THEN
    INSERT INTO reader_levels (name, description, min_rating, min_readings, base_price_per_minute, color_theme, icon, required_quiz_score, rank_order)
    VALUES ('Mystic Adept', 'Developing deeper insight and intuition with tarot symbolism.', 3.5, 5, 0.5, 'orange', 'sparkles', 80, 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM reader_levels WHERE rank_order = 3) THEN
    INSERT INTO reader_levels (name, description, min_rating, min_readings, base_price_per_minute, color_theme, icon, required_quiz_score, rank_order)
    VALUES ('Ethereal Guide', 'Advanced understanding of complex tarot interpretations.', 4.0, 15, 0.75, 'yellow', 'sun', 85, 3);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM reader_levels WHERE rank_order = 4) THEN
    INSERT INTO reader_levels (name, description, min_rating, min_readings, base_price_per_minute, color_theme, icon, required_quiz_score, rank_order)
    VALUES ('Celestial Oracle', 'Mastery of esoteric knowledge and profound wisdom.', 4.5, 30, 1.0, 'green', 'heart', 90, 4);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM reader_levels WHERE rank_order = 5) THEN
    INSERT INTO reader_levels (name, description, min_rating, min_readings, base_price_per_minute, color_theme, icon, required_quiz_score, rank_order)
    VALUES ('Arcane Hierophant', 'Supreme level of tarot mastery and enlightenment.', 4.8, 50, 1.5, 'violet', 'crown', 95, 5);
  END IF;
END $$;

-- Add indexes to improve sorting performance
DO $$
BEGIN
  -- Reader level indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'reader_levels' AND indexname = 'reader_levels_rank_order_idx'
  ) THEN
    CREATE INDEX reader_levels_rank_order_idx ON reader_levels(rank_order);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'reader_levels' AND indexname = 'reader_levels_base_price_idx'
  ) THEN
    CREATE INDEX reader_levels_base_price_idx ON reader_levels(base_price_per_minute);
  END IF;
  
  -- User reader indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'users' AND indexname = 'users_level_id_idx'
  ) THEN
    CREATE INDEX users_level_id_idx ON users(level_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'users' AND indexname = 'users_reader_sorting_idx'
  ) THEN
    CREATE INDEX users_reader_sorting_idx ON users(is_reader, average_rating, reader_since);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'users' AND indexname = 'users_is_reader_level_id_idx'
  ) THEN
    CREATE INDEX users_is_reader_level_id_idx ON users(is_reader, level_id);
  END IF;
  
  -- Pagination indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'users' AND indexname = 'users_reader_pagination_idx'
  ) THEN
    CREATE INDEX users_reader_pagination_idx ON users(is_reader, level_id, average_rating);
  END IF;
END $$;
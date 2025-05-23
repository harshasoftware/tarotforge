/*
  # Update Reader Levels with Chakra System Colors
  
  1. Changes
    - Update color themes for reader levels to follow chakra system colors
    - Red (Root) for Novice Seer
    - Orange (Sacral) for Mystic Adept  
    - Yellow (Solar Plexus) for Ethereal Guide
    - Green (Heart) for Celestial Oracle
    - Violet/Purple (Crown) for Arcane Hierophant
    
  2. Security
    - No changes to security policies
    
  3. Notes
    - Maintains existing color field names but updates values
    - Ensures icons match the chakra system theme
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

-- Make sure we have the correct reader levels set up
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
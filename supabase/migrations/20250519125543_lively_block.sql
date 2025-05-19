/*
  # Reader Levels and Rating System

  1. New Tables
    - `reader_levels` - Defines mystical reader ranking levels and pricing tiers
    - `reader_reviews` - Tracks ratings and reviews for readers
  
  2. Modified Tables  
    - Added `level_id` to `users` table to track reader level
  
  3. Security
    - Enable RLS on new tables
    - Add appropriate policies for data access
*/

-- Reader Levels Table
CREATE TABLE IF NOT EXISTS public.reader_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  min_rating numeric,
  min_readings integer,
  base_price_per_minute numeric NOT NULL DEFAULT 0.25,
  color_theme text,
  icon text,
  required_quiz_score numeric NOT NULL DEFAULT 75.0,
  created_at timestamp with time zone DEFAULT now(),
  rank_order integer NOT NULL,
  
  CONSTRAINT reader_levels_min_rating_check CHECK (min_rating >= 0 AND min_rating <= 5),
  CONSTRAINT reader_levels_min_readings_check CHECK (min_readings >= 0),
  CONSTRAINT reader_levels_base_price_check CHECK (base_price_per_minute >= 0),
  CONSTRAINT reader_levels_required_quiz_score_check CHECK (required_quiz_score >= 0 AND required_quiz_score <= 100)
);

-- Enable RLS on reader_levels
ALTER TABLE public.reader_levels ENABLE ROW LEVEL SECURITY;

-- Create policies for reader_levels
CREATE POLICY "Anyone can read reader levels" 
  ON public.reader_levels 
  FOR SELECT 
  TO public 
  USING (true);

-- Only allow admins to modify reader levels (to be implemented later)

-- Reader Reviews Table
CREATE TABLE IF NOT EXISTS public.reader_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating numeric NOT NULL,
  review text,
  reading_id uuid, -- Optional reference to specific reading
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT reader_reviews_rating_check CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT reader_reviews_unique_per_reading UNIQUE (reader_id, client_id, reading_id)
);

-- Enable RLS on reader_reviews
ALTER TABLE public.reader_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for reader_reviews
CREATE POLICY "Anyone can read reader reviews" 
  ON public.reader_reviews 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Users can create reviews for readers"
  ON public.reader_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can update their own reviews"
  ON public.reader_reviews
  FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can delete their own reviews"
  ON public.reader_reviews
  FOR DELETE
  TO authenticated
  USING (client_id = auth.uid());

-- Add level_id to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'level_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN level_id uuid REFERENCES public.reader_levels(id);
  END IF;
END $$;

-- Add average_rating to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE public.users ADD COLUMN average_rating numeric DEFAULT 0;
    ALTER TABLE public.users ADD CONSTRAINT users_average_rating_check 
      CHECK (average_rating >= 0 AND average_rating <= 5);
  END IF;
END $$;

-- Add completed_readings to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'completed_readings'
  ) THEN
    ALTER TABLE public.users ADD COLUMN completed_readings integer DEFAULT 0;
  END IF;
END $$;

-- Add field to quiz_attempts to track quiz difficulty level
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_attempts' 
    AND column_name = 'difficulty_level'
  ) THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN difficulty_level text 
      CHECK (difficulty_level IN ('novice', 'adept', 'mystic', 'oracle', 'archmage'));
    
    -- Default to 'novice' for existing records
    UPDATE public.quiz_attempts SET difficulty_level = 'novice' WHERE difficulty_level IS NULL;
    
    -- Now make it not null
    ALTER TABLE public.quiz_attempts ALTER COLUMN difficulty_level SET NOT NULL;
  END IF;
END $$;

-- Function to update user's average rating
CREATE OR REPLACE FUNCTION public.update_reader_average_rating()
RETURNS trigger AS $$
BEGIN
  UPDATE public.users
  SET average_rating = (
    SELECT AVG(rating)
    FROM public.reader_reviews
    WHERE reader_id = NEW.reader_id
  )
  WHERE id = NEW.reader_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updating average rating
DROP TRIGGER IF EXISTS update_reader_rating_on_review ON public.reader_reviews;
CREATE TRIGGER update_reader_rating_on_review
AFTER INSERT OR UPDATE OR DELETE ON public.reader_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_reader_average_rating();

-- Insert default reader levels
INSERT INTO public.reader_levels (name, description, min_rating, min_readings, base_price_per_minute, color_theme, icon, required_quiz_score, rank_order) 
VALUES
  ('Novice Seer', 'Beginning their journey into the mystical arts of tarot reading. Equipped with fundamental knowledge.', 0, 0, 0.25, 'blue', 'star', 75, 1),
  ('Mystic Adept', 'Developed intuitive connections with the cards. Provides insightful readings with growing confidence.', 4.0, 10, 0.50, 'purple', 'moon', 80, 2),
  ('Ethereal Guide', 'Mastered the art of tarot with deep symbolic understanding. Delivers profound and accurate readings.', 4.5, 50, 0.75, 'teal', 'sun', 85, 3), 
  ('Celestial Oracle', 'Achieved remarkable insight and intuition. Revered for spiritual wisdom and transformative readings.', 4.7, 100, 1.0, 'gold', 'sparkles', 90, 4),
  ('Arcane Hierophant', 'Legendary status with extraordinary gifts. The highest level of tarot mastery and spiritual insight.', 4.9, 250, 1.5, 'crimson', 'crown', 95, 5)
ON CONFLICT DO NOTHING;

-- Add functions to check and update reader levels based on criteria
CREATE OR REPLACE FUNCTION public.check_and_update_reader_level()
RETURNS trigger AS $$
DECLARE
  current_level_id uuid;
  eligible_level record;
BEGIN
  -- Only proceed if the user is a reader
  IF NEW.is_reader = false THEN
    RETURN NEW;
  END IF;

  -- Get current level_id
  current_level_id := NEW.level_id;
  
  -- If no level is assigned, assign the default "Novice Seer" level
  IF current_level_id IS NULL THEN
    SELECT id INTO current_level_id FROM public.reader_levels WHERE name = 'Novice Seer';
    NEW.level_id := current_level_id;
  END IF;
  
  -- Check if reader is eligible for a higher level
  SELECT * INTO eligible_level 
  FROM public.reader_levels 
  WHERE (min_rating IS NULL OR min_rating <= NEW.average_rating)
    AND (min_readings IS NULL OR min_readings <= NEW.completed_readings)
    AND rank_order > (SELECT rank_order FROM public.reader_levels WHERE id = current_level_id)
  ORDER BY rank_order ASC
  LIMIT 1;
  
  -- If eligible for an upgrade, update the level
  IF found THEN
    NEW.level_id := eligible_level.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to check and update reader level
DROP TRIGGER IF EXISTS check_reader_level_trigger ON public.users;
CREATE TRIGGER check_reader_level_trigger
BEFORE UPDATE OF average_rating, completed_readings, is_reader ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.check_and_update_reader_level();

-- Function to set initial level when user becomes a reader
CREATE OR REPLACE FUNCTION public.set_initial_reader_level()
RETURNS trigger AS $$
DECLARE
  novice_level_id uuid;
BEGIN
  -- Only run if is_reader changed from false to true
  IF OLD.is_reader = false AND NEW.is_reader = true THEN
    -- Get the Novice Seer level id
    SELECT id INTO novice_level_id FROM public.reader_levels WHERE name = 'Novice Seer';
    
    -- Set the initial level
    NEW.level_id := novice_level_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to assign initial level when becoming a reader
DROP TRIGGER IF EXISTS set_initial_reader_level_trigger ON public.users;
CREATE TRIGGER set_initial_reader_level_trigger
BEFORE UPDATE OF is_reader ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_initial_reader_level();

-- Add functions for updating quiz difficulty
CREATE OR REPLACE FUNCTION public.update_quiz_difficulty()
RETURNS trigger AS $$
DECLARE
  user_level record;
BEGIN
  -- Get the user's current level
  SELECT rl.* INTO user_level 
  FROM public.reader_levels rl
  JOIN public.users u ON u.level_id = rl.id
  WHERE u.id = NEW.user_id;
  
  -- Set difficulty based on user's level
  IF FOUND THEN
    -- Higher ranks get more difficult quizzes
    CASE 
      WHEN user_level.rank_order >= 4 THEN
        NEW.difficulty_level := 'archmage';
      WHEN user_level.rank_order = 3 THEN
        NEW.difficulty_level := 'oracle';
      WHEN user_level.rank_order = 2 THEN
        NEW.difficulty_level := 'mystic';
      WHEN user_level.rank_order = 1 THEN
        NEW.difficulty_level := 'adept';
      ELSE
        NEW.difficulty_level := 'novice';
    END CASE;
  ELSE
    -- Default to novice if no level is found
    NEW.difficulty_level := 'novice';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for setting quiz difficulty
DROP TRIGGER IF EXISTS set_quiz_difficulty_trigger ON public.quiz_attempts;
CREATE TRIGGER set_quiz_difficulty_trigger
BEFORE INSERT ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_quiz_difficulty();
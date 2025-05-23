/*
  # Add Deck Generation Tracking

  1. New Tables
    - `deck_generation_limits` - Stores the limits for each plan type
    - `user_deck_usage` - Tracks each user's deck generation usage

  2. Changes
    - Adds tracking for major arcana decks, complete decks, and regenerations
    - Implements plan-based limits with monthly reset periods
    - Supports the pricing model where free users get 1 major arcana deck per month
    - Supports one-time upgrades for complete decks

  3. Security
    - Enable RLS on both tables
    - Add appropriate policies for access control
*/

-- Create table for plan-based deck generation limits
CREATE TABLE IF NOT EXISTS deck_generation_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type text NOT NULL UNIQUE,
  major_arcana_limit integer NOT NULL DEFAULT 0,
  complete_deck_limit integer NOT NULL DEFAULT 0,
  regeneration_limit integer NOT NULL DEFAULT 0,
  quality_level text NOT NULL DEFAULT 'medium',
  max_storage integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for tracking user deck generation usage
CREATE TABLE IF NOT EXISTS user_deck_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type text NOT NULL,
  major_arcana_generated integer NOT NULL DEFAULT 0,
  complete_decks_generated integer NOT NULL DEFAULT 0,
  regenerations_used integer NOT NULL DEFAULT 0,
  last_reset_date timestamptz,
  next_reset_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE deck_generation_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_deck_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for deck_generation_limits
CREATE POLICY "Anyone can read deck generation limits" 
  ON deck_generation_limits
  FOR SELECT
  TO public
  USING (true);

-- Create policies for user_deck_usage
CREATE POLICY "System can update user deck usage" 
  ON user_deck_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own deck usage" 
  ON user_deck_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Insert default limits for different plan types
INSERT INTO deck_generation_limits (plan_type, major_arcana_limit, complete_deck_limit, regeneration_limit, quality_level, max_storage)
VALUES
  ('free', 1, 0, 2, 'medium', 3),
  ('explorer-plus', 1, 1, 5, 'medium', 3),
  ('mystic', 2, 2, 999, 'medium', 15),
  ('creator', 4, 4, 999, 'high', 50),
  ('visionary', 8, 8, 999, 'high', 999);

-- Create function to initialize user deck usage when a user is created
CREATE OR REPLACE FUNCTION initialize_user_deck_usage()
RETURNS TRIGGER AS $$
DECLARE
  user_plan_type text;
  next_reset_date timestamptz;
BEGIN
  -- Determine the user's plan type (default to free)
  user_plan_type := 'free';
  
  -- Calculate next reset date (first day of next month)
  next_reset_date := date_trunc('month', now()) + interval '1 month';
  
  -- Create user_deck_usage record
  INSERT INTO user_deck_usage (
    user_id,
    plan_type,
    major_arcana_generated,
    complete_decks_generated,
    regenerations_used,
    next_reset_date
  ) VALUES (
    NEW.id,
    user_plan_type,
    0,
    0,
    0,
    next_reset_date
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize user deck usage when a user is created
CREATE TRIGGER initialize_user_deck_usage_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION initialize_user_deck_usage();

-- Create function to increment deck generation counters
CREATE OR REPLACE FUNCTION increment_deck_generation_counter(
  user_id_param uuid,
  field_name text
)
RETURNS boolean AS $$
DECLARE
  updated_rows integer;
BEGIN
  -- Update the specified counter field
  UPDATE user_deck_usage
  SET 
    updated_at = now(),
    major_arcana_generated = CASE WHEN field_name = 'major_arcana_generated' 
                                THEN major_arcana_generated + 1 
                                ELSE major_arcana_generated END,
    complete_decks_generated = CASE WHEN field_name = 'complete_decks_generated' 
                                  THEN complete_decks_generated + 1 
                                  ELSE complete_decks_generated END,
    regenerations_used = CASE WHEN field_name = 'regenerations_used' 
                           THEN regenerations_used + 1 
                           ELSE regenerations_used END
  WHERE user_id = user_id_param;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  -- Return true if the update was successful
  RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql;

-- Create function to update user plan type based on subscription
CREATE OR REPLACE FUNCTION update_user_deck_plan_type()
RETURNS TRIGGER AS $$
DECLARE
  user_id_var uuid;
  plan_type_var text;
  next_reset_date_var timestamptz;
BEGIN
  -- Get the user ID from the customer ID
  SELECT user_id INTO user_id_var
  FROM stripe_customers
  WHERE customer_id = NEW.customer_id;
  
  IF user_id_var IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Determine plan type based on price ID
  CASE
    WHEN NEW.price_id LIKE '%mystic%' THEN
      plan_type_var := 'mystic';
    WHEN NEW.price_id LIKE '%creator%' THEN
      plan_type_var := 'creator';
    WHEN NEW.price_id LIKE '%visionary%' THEN
      plan_type_var := 'visionary';
    ELSE
      plan_type_var := 'free';
  END CASE;
  
  -- Calculate next reset date based on subscription period
  IF NEW.current_period_end IS NOT NULL THEN
    next_reset_date_var := to_timestamp(NEW.current_period_end);
  ELSE
    next_reset_date_var := date_trunc('month', now()) + interval '1 month';
  END IF;
  
  -- Update user's plan type
  UPDATE user_deck_usage
  SET 
    plan_type = plan_type_var,
    next_reset_date = next_reset_date_var,
    updated_at = now()
  WHERE user_id = user_id_var;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user plan type when subscription changes
CREATE TRIGGER update_user_deck_plan_type_trigger
AFTER INSERT OR UPDATE OF status, price_id ON stripe_subscriptions
FOR EACH ROW
WHEN ((NEW.status = 'active') OR (NEW.status = 'trialing'))
EXECUTE FUNCTION update_user_deck_plan_type();

-- Create function to check if a user can generate a deck
CREATE OR REPLACE FUNCTION can_generate_deck(
  user_id_param uuid,
  deck_type text
)
RETURNS boolean AS $$
DECLARE
  user_plan text;
  user_major_arcana_generated integer;
  user_complete_decks_generated integer;
  plan_major_arcana_limit integer;
  plan_complete_deck_limit integer;
BEGIN
  -- Get user's current usage and plan limits
  SELECT 
    u.plan_type, 
    u.major_arcana_generated, 
    u.complete_decks_generated,
    l.major_arcana_limit,
    l.complete_deck_limit
  INTO 
    user_plan, 
    user_major_arcana_generated, 
    user_complete_decks_generated,
    plan_major_arcana_limit,
    plan_complete_deck_limit
  FROM 
    user_deck_usage u
    JOIN deck_generation_limits l ON u.plan_type = l.plan_type
  WHERE 
    u.user_id = user_id_param;
  
  -- Check if the user can generate the requested deck type
  IF deck_type = 'major_arcana' THEN
    RETURN user_major_arcana_generated < plan_major_arcana_limit;
  ELSIF deck_type = 'complete' THEN
    RETURN user_complete_decks_generated < plan_complete_deck_limit;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset usage counters on the first of each month
CREATE OR REPLACE FUNCTION reset_monthly_deck_usage()
RETURNS void AS $$
DECLARE
  next_reset_date timestamptz;
  user_plan text;
BEGIN
  -- Calculate next reset date (first day of next month)
  next_reset_date := date_trunc('month', now()) + interval '1 month';
  
  -- Reset counters for all users whose reset date has passed
  UPDATE user_deck_usage
  SET 
    major_arcana_generated = 0,
    complete_decks_generated = 0,
    regenerations_used = 0,
    last_reset_date = now(),
    next_reset_date = next_reset_date,
    updated_at = now()
  WHERE next_reset_date <= now();
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to reset usage counters (this would be set up separately in production)
-- For this migration, we'll just create the function
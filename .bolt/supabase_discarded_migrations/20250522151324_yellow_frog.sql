/*
  # Remove credit system and transition to deck-based pricing

  1. Changes
     - Drop credit_transactions table
     - Drop user_credits table
     - Add deck_generation_limits table
     - Add user_deck_usage table

  2. Security
     - Enable RLS on new tables
     - Add appropriate policies
*/

-- First remove tables for the credit system
DROP TABLE IF EXISTS credit_transactions;
DROP TABLE IF EXISTS user_credits;

-- Create new tables for deck-based pricing system
CREATE TABLE IF NOT EXISTS deck_generation_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL,
  major_arcana_limit INTEGER NOT NULL DEFAULT 1,
  complete_deck_limit INTEGER NOT NULL DEFAULT 0,
  regeneration_limit INTEGER NOT NULL DEFAULT 2,
  quality_level TEXT NOT NULL DEFAULT 'medium',
  max_storage INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table to track user's deck generation usage
CREATE TABLE IF NOT EXISTS user_deck_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'free',
  major_arcana_generated INTEGER NOT NULL DEFAULT 0,
  complete_decks_generated INTEGER NOT NULL DEFAULT 0,
  regenerations_used INTEGER NOT NULL DEFAULT 0,
  last_reset_date TIMESTAMPTZ,
  next_reset_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Populate default deck generation limits
INSERT INTO deck_generation_limits (plan_type, major_arcana_limit, complete_deck_limit, regeneration_limit, quality_level, max_storage)
VALUES 
  ('free', 1, 0, 2, 'medium', 3),
  ('explorer-plus', 1, 1, 5, 'medium', 3),
  ('mystic', 0, 2, 999999, 'medium', 15),
  ('creator', 0, 4, 999999, 'medium-high', 50),
  ('visionary', 0, 8, 999999, 'high', 999999);

-- Enable Row Level Security
ALTER TABLE deck_generation_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_deck_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deck_generation_limits
CREATE POLICY "Anyone can read deck generation limits"
  ON deck_generation_limits
  FOR SELECT
  TO public
  USING (true);

-- RLS Policies for user_deck_usage
CREATE POLICY "Users can view their own deck usage"
  ON user_deck_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to initialize user deck usage record when a user subscribes
CREATE OR REPLACE FUNCTION initialize_user_deck_usage()
RETURNS TRIGGER AS $$
DECLARE
  plan_name TEXT;
  current_period_end TIMESTAMPTZ;
BEGIN
  -- Get the plan name from subscription
  SELECT 
    CASE
      WHEN NEW.price_id LIKE '%mystic%' THEN 'mystic'
      WHEN NEW.price_id LIKE '%creator%' THEN 'creator'
      WHEN NEW.price_id LIKE '%visionary%' THEN 'visionary'
      ELSE 'free'
    END INTO plan_name
  FROM stripe_subscriptions
  WHERE customer_id = NEW.customer_id;
  
  -- Get the user_id from stripe_customers
  DECLARE
    user_id_val uuid;
  BEGIN
    SELECT user_id INTO user_id_val
    FROM stripe_customers
    WHERE customer_id = NEW.customer_id;
    
    -- If customer found, set up or update user_deck_usage
    IF FOUND THEN
      -- Calculate next reset date
      current_period_end := to_timestamp(NEW.current_period_end);
      
      -- Update or insert user deck usage
      INSERT INTO user_deck_usage (
        user_id, 
        plan_type, 
        major_arcana_generated,
        complete_decks_generated,
        regenerations_used,
        last_reset_date,
        next_reset_date
      ) 
      VALUES (
        user_id_val, 
        plan_name, 
        0, -- Reset major arcana count
        0, -- Reset complete deck count
        0, -- Reset regenerations
        now(), -- Last reset is now
        current_period_end -- Next reset is at the end of billing period
      )
      ON CONFLICT (user_id) DO UPDATE SET
        plan_type = plan_name,
        major_arcana_generated = 0, -- Reset counter on plan change
        complete_decks_generated = 0, -- Reset counter on plan change
        regenerations_used = 0, -- Reset counter on plan change
        last_reset_date = now(),
        next_reset_date = current_period_end,
        updated_at = now();
    END IF;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for subscription changes
CREATE TRIGGER initialize_deck_usage_on_subscription
AFTER INSERT OR UPDATE OF status, price_id ON stripe_subscriptions
FOR EACH ROW
WHEN ((NEW.status = 'active') OR (NEW.status = 'trialing'))
EXECUTE FUNCTION initialize_user_deck_usage();

-- Function to initialize free user deck usage
CREATE OR REPLACE FUNCTION initialize_free_user_deck_usage()
RETURNS TRIGGER AS $$
DECLARE
  next_month TIMESTAMPTZ;
BEGIN
  -- Calculate next month
  next_month := date_trunc('month', now()) + interval '1 month';
  
  -- Create user_deck_usage record for new user with free plan settings
  INSERT INTO user_deck_usage (
    user_id,
    plan_type,
    major_arcana_generated,
    complete_decks_generated,
    regenerations_used,
    last_reset_date,
    next_reset_date
  )
  VALUES (
    NEW.id,
    'free',
    0,
    0,
    0,
    now(),
    next_month
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to initialize deck usage for new users
CREATE TRIGGER initialize_free_deck_usage_trigger
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION initialize_free_user_deck_usage();
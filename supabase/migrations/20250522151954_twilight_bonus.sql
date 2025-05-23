/*
  # Create deck generation system tables

  1. New Tables
    - `deck_generation_limits` - Defines the deck generation limits for each plan type
    - `user_deck_usage` - Tracks a user's deck generation usage
  
  2. Security
    - Enable RLS on all tables
    - Add policies for access control
  
  This migration replaces the credit system with a deck-based generation system.
*/

-- Table to define plan limits for each plan type
CREATE TABLE IF NOT EXISTS deck_generation_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL UNIQUE,
  major_arcana_limit INTEGER NOT NULL DEFAULT 0,
  complete_deck_limit INTEGER NOT NULL DEFAULT 0,
  regeneration_limit INTEGER NOT NULL DEFAULT 0,
  quality_level TEXT NOT NULL DEFAULT 'medium',
  max_storage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table to track user deck generation usage
CREATE TABLE IF NOT EXISTS user_deck_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  major_arcana_generated INTEGER NOT NULL DEFAULT 0,
  complete_decks_generated INTEGER NOT NULL DEFAULT 0,
  regenerations_used INTEGER NOT NULL DEFAULT 0,
  last_reset_date TIMESTAMPTZ,
  next_reset_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Initialize the plan limits
INSERT INTO deck_generation_limits (plan_type, major_arcana_limit, complete_deck_limit, regeneration_limit, quality_level, max_storage)
VALUES 
  ('free', 1, 0, 2, 'medium', 3),
  ('explorer-plus', 1, 1, 5, 'medium', 3),
  ('mystic', 0, 2, 999999, 'medium', 15),
  ('creator', 0, 4, 999999, 'medium_high', 50),
  ('visionary', 0, 8, 999999, 'high', 999999)
ON CONFLICT (plan_type) 
DO UPDATE SET 
  major_arcana_limit = EXCLUDED.major_arcana_limit,
  complete_deck_limit = EXCLUDED.complete_deck_limit,
  regeneration_limit = EXCLUDED.regeneration_limit,
  quality_level = EXCLUDED.quality_level,
  max_storage = EXCLUDED.max_storage,
  updated_at = now();

-- Create trigger function to initialize deck usage for new users
CREATE OR REPLACE FUNCTION initialize_user_deck_usage() 
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user already has a record
  IF NOT EXISTS (SELECT 1 FROM public.user_deck_usage WHERE user_id = NEW.id) THEN
    -- Create initial record with free plan
    INSERT INTO public.user_deck_usage (
      user_id, 
      plan_type, 
      major_arcana_generated,
      complete_decks_generated,
      regenerations_used,
      last_reset_date,
      next_reset_date
    ) VALUES (
      NEW.id, 
      'free',
      0,
      0,
      0,
      now(),
      date_trunc('month', now()) + interval '1 month'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize deck usage for new users
DROP TRIGGER IF EXISTS initialize_user_deck_usage_trigger ON auth.users;
CREATE TRIGGER initialize_user_deck_usage_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION initialize_user_deck_usage();

-- Function to update user's plan type based on subscription
CREATE OR REPLACE FUNCTION update_user_plan_type() 
RETURNS TRIGGER AS $$
DECLARE
  plan_type TEXT;
BEGIN
  -- Determine plan type from price_id
  CASE
    WHEN NEW.price_id LIKE '%mystic%' THEN plan_type := 'mystic';
    WHEN NEW.price_id LIKE '%creator%' THEN plan_type := 'creator';
    WHEN NEW.price_id LIKE '%visionary%' THEN plan_type := 'visionary';
    ELSE plan_type := 'free';
  END CASE;
  
  -- Update the user's plan in user_deck_usage
  IF EXISTS (SELECT 1 FROM public.user_deck_usage WHERE user_id = (
    SELECT user_id FROM public.stripe_customers WHERE customer_id = NEW.customer_id
  )) THEN
    UPDATE public.user_deck_usage 
    SET 
      plan_type = plan_type,
      updated_at = now()
    WHERE user_id = (
      SELECT user_id FROM public.stripe_customers WHERE customer_id = NEW.customer_id
    );
  ELSE
    -- Create new record if none exists
    INSERT INTO public.user_deck_usage (
      user_id,
      plan_type,
      major_arcana_generated,
      complete_decks_generated,
      regenerations_used,
      last_reset_date,
      next_reset_date
    ) VALUES (
      (SELECT user_id FROM public.stripe_customers WHERE customer_id = NEW.customer_id),
      plan_type,
      0,
      0,
      0,
      now(),
      date_trunc('month', now()) + interval '1 month'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update user plan type when subscription changes
DROP TRIGGER IF EXISTS update_user_plan_type_trigger ON public.stripe_subscriptions;
CREATE TRIGGER update_user_plan_type_trigger
AFTER INSERT OR UPDATE OF status, price_id ON public.stripe_subscriptions
FOR EACH ROW WHEN ((NEW.status = 'active') OR (NEW.status = 'trialing'))
EXECUTE FUNCTION update_user_plan_type();

-- Enable row level security on the tables
ALTER TABLE deck_generation_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_deck_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for deck_generation_limits table
CREATE POLICY "Anyone can read deck generation limits" 
ON deck_generation_limits FOR SELECT TO public 
USING (TRUE);

-- Create policies for user_deck_usage table
CREATE POLICY "Users can view their own deck usage" 
ON user_deck_usage FOR SELECT TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "System can update user deck usage"
ON user_deck_usage FOR ALL TO service_role
USING (TRUE)
WITH CHECK (TRUE);
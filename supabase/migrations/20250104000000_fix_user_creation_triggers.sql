-- Fix user creation triggers to prevent database errors
-- Remove any conflicting or outdated triggers

-- Drop any remaining credit-related triggers that might be causing issues
DROP TRIGGER IF EXISTS initialize_free_credits_trigger ON auth.users;
DROP TRIGGER IF EXISTS initialize_credits_on_user_create ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_credits ON auth.users;

-- Drop any obsolete functions that might be referenced by triggers
DROP FUNCTION IF EXISTS initialize_free_credits();
DROP FUNCTION IF EXISTS initialize_user_credits();
DROP FUNCTION IF EXISTS handle_new_user_credits();

-- Ensure the user_deck_usage trigger is properly set up (this should work since the table exists)
-- First drop the existing trigger to recreate it cleanly
DROP TRIGGER IF EXISTS initialize_user_deck_usage_trigger ON auth.users;

-- Recreate the user deck usage initialization function
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
  
  -- Create user_deck_usage record (use INSERT ... ON CONFLICT to avoid duplicate errors)
  INSERT INTO user_deck_usage (
    user_id,
    plan_type,
    major_arcana_generated,
    complete_decks_generated,
    regenerations_used,
    next_reset_date,
    last_reset_date,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    user_plan_type,
    0,
    0,
    0,
    next_reset_date,
    now(),
    now(),
    now()
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER initialize_user_deck_usage_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION initialize_user_deck_usage();

-- Ensure the public.users table sync is working properly
-- Drop and recreate the handle_new_user function to be safe
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table with basic information
  INSERT INTO public.users (
    id, 
    email, 
    username, 
    full_name, 
    created_at, 
    updated_at,
    email_confirmed_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.created_at,
    NEW.updated_at,
    NEW.email_confirmed_at
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = EXCLUDED.updated_at,
    email_confirmed_at = EXCLUDED.email_confirmed_at;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the user sync trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- Comment for documentation
COMMENT ON FUNCTION initialize_user_deck_usage() IS 'Initializes deck usage tracking for new users';
COMMENT ON FUNCTION handle_new_user() IS 'Syncs auth.users to public.users table with basic profile info'; 
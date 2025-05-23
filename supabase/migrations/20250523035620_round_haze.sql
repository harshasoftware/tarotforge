/*
  # Reset Free Users to Fresh State

  1. Changes
     - Resets all users with no subscription to have 1 major arcana deck per month
     - Updates user_deck_usage for free users to reset their counters
     - Sets next reset date to first day of next month
     - Preserves data for users with active subscriptions

  2. Security
     - Executed with security definer to ensure proper permissions
*/

-- Create a function to reset free users
CREATE OR REPLACE FUNCTION reset_free_users()
RETURNS void AS $$
DECLARE
  next_reset_date timestamptz;
BEGIN
  -- Calculate next reset date (first day of next month)
  next_reset_date := date_trunc('month', now()) + interval '1 month';
  
  -- Update user_deck_usage for users without an active subscription
  UPDATE user_deck_usage u
  SET 
    major_arcana_generated = 0,
    complete_decks_generated = 0,
    regenerations_used = 0,
    last_reset_date = now(),
    next_reset_date = next_reset_date,
    updated_at = now(),
    plan_type = 'free'
  WHERE 
    -- Only update users who don't have an active subscription
    NOT EXISTS (
      SELECT 1 
      FROM stripe_subscriptions s
      JOIN stripe_customers c ON s.customer_id = c.customer_id
      WHERE c.user_id = u.user_id
        AND (s.status = 'active' OR s.status = 'trialing')
        AND c.deleted_at IS NULL
    );
  
  -- Also ensure all users have a deck_usage record
  INSERT INTO user_deck_usage (
    user_id,
    plan_type,
    major_arcana_generated,
    complete_decks_generated,
    regenerations_used,
    last_reset_date,
    next_reset_date
  )
  SELECT 
    u.id,
    'free',
    0,
    0,
    0,
    now(),
    next_reset_date
  FROM 
    auth.users u
  WHERE 
    NOT EXISTS (
      SELECT 1 FROM user_deck_usage ud WHERE ud.user_id = u.id
    )
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to reset free users
SELECT reset_free_users();

-- Create a function to reset user credits for free users
CREATE OR REPLACE FUNCTION reset_free_user_credits()
RETURNS void AS $$
BEGIN
  -- Update user_credits for users without an active subscription
  UPDATE user_credits uc
  SET 
    basic_credits = 5, -- Free users get 5 basic credits
    premium_credits = 0,
    basic_credits_used = 0,
    premium_credits_used = 0,
    last_refresh_date = now(),
    next_refresh_date = date_trunc('month', now()) + interval '1 month',
    plan_tier = 'free',
    max_rollover_credits = 0,
    updated_at = now()
  WHERE 
    -- Only update users who don't have an active subscription
    NOT EXISTS (
      SELECT 1 
      FROM stripe_subscriptions s
      JOIN stripe_customers c ON s.customer_id = c.customer_id
      WHERE c.user_id = uc.user_id
        AND (s.status = 'active' OR s.status = 'trialing')
        AND c.deleted_at IS NULL
    );
  
  -- Also ensure all users have a credit record
  INSERT INTO user_credits (
    user_id,
    basic_credits,
    premium_credits,
    basic_credits_used,
    premium_credits_used,
    last_refresh_date,
    next_refresh_date,
    plan_tier,
    max_rollover_credits
  )
  SELECT 
    u.id,
    5, -- Free users get 5 basic credits
    0,
    0,
    0,
    now(),
    date_trunc('month', now()) + interval '1 month',
    'free',
    0
  FROM 
    auth.users u
  WHERE 
    NOT EXISTS (
      SELECT 1 FROM user_credits uc WHERE uc.user_id = u.id
    )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Record credit transactions for the reset
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    basic_credits_change,
    premium_credits_change,
    description
  )
  SELECT
    uc.user_id,
    'allocation',
    5, -- 5 basic credits
    0,
    'Credits reset to free plan default'
  FROM
    user_credits uc
  WHERE
    -- Only for users who don't have an active subscription
    NOT EXISTS (
      SELECT 1 
      FROM stripe_subscriptions s
      JOIN stripe_customers c ON s.customer_id = c.customer_id
      WHERE c.user_id = uc.user_id
        AND (s.status = 'active' OR s.status = 'trialing')
        AND c.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to reset free user credits
SELECT reset_free_user_credits();

-- Create a scheduled function to run this reset periodically (e.g., monthly)
-- This would typically be set up as a cron job or scheduled task in production
-- For this migration, we've just created and executed the functions directly
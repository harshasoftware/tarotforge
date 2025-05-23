/*
  # Remove Credit Tables

  1. Changes
    - Drop the `user_credits` table
    - Drop the `credit_transactions` table
    - Remove references to credits in functions and triggers
    - Update the `reset_free_users_with_deck_deletion` function to no longer handle credits
*/

-- First, drop any functions that depend on the credit tables
DROP FUNCTION IF EXISTS reset_free_user_credits();
DROP FUNCTION IF EXISTS initialize_user_credit_record(uuid, text, integer, integer, integer, text);
DROP FUNCTION IF EXISTS initialize_user_credits();
DROP FUNCTION IF EXISTS consume_user_credits(uuid, integer, integer, uuid, text);
DROP FUNCTION IF EXISTS handle_credit_rollover();

-- Drop triggers that reference the credit tables
DROP TRIGGER IF EXISTS initialize_credits_on_subscription ON stripe_subscriptions;
DROP TRIGGER IF EXISTS initialize_free_credits_trigger ON users;
DROP TRIGGER IF EXISTS handle_credit_rollover_trigger ON user_credits;

-- Drop the credit_transactions table
DROP TABLE IF EXISTS credit_transactions;

-- Drop the user_credits table
DROP TABLE IF EXISTS user_credits;

-- Update the reset_free_users_with_deck_deletion function to remove credit-related functionality
CREATE OR REPLACE FUNCTION reset_free_users_with_deck_deletion()
RETURNS TABLE (
  user_id uuid,
  decks_deleted integer,
  usage_reset boolean
) AS $$
DECLARE
  next_reset_date timestamptz;
  free_user record;
  decks_deleted integer;
  usage_updated boolean;
BEGIN
  -- Calculate next reset date (first day of next month)
  next_reset_date := date_trunc('month', now()) + interval '1 month';
  
  -- Process each free user (users without active subscriptions)
  FOR free_user IN
    SELECT u.id
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 
      FROM stripe_subscriptions s
      JOIN stripe_customers c ON s.customer_id = c.customer_id
      WHERE c.user_id = u.id
        AND (s.status = 'active' OR s.status = 'trialing')
        AND c.deleted_at IS NULL
    )
  LOOP
    -- Delete all decks created by this user
    decks_deleted := delete_user_decks(free_user.id);
    
    -- Reset user's deck usage
    UPDATE user_deck_usage
    SET 
      major_arcana_generated = 0,
      complete_decks_generated = 0,
      regenerations_used = 0,
      last_reset_date = now(),
      next_reset_date = next_reset_date,
      updated_at = now(),
      plan_type = 'free'
    WHERE user_id = free_user.id;
    
    GET DIAGNOSTICS usage_updated = ROW_COUNT;
    
    -- If no usage record exists, create one
    IF usage_updated = 0 THEN
      INSERT INTO user_deck_usage (
        user_id,
        plan_type,
        major_arcana_generated,
        complete_decks_generated,
        regenerations_used,
        last_reset_date,
        next_reset_date
      ) VALUES (
        free_user.id,
        'free',
        0,
        0,
        0,
        now(),
        next_reset_date
      )
      ON CONFLICT (user_id) DO NOTHING;
      
      GET DIAGNOSTICS usage_updated = ROW_COUNT;
    END IF;
    
    -- Return the results for this user
    user_id := free_user.id;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update any views that reference the credit tables
DROP VIEW IF EXISTS user_subscription_credits;

-- Create a new view for subscription status without credits
CREATE OR REPLACE VIEW user_subscription_status AS
SELECT
  u.id AS user_id,
  u.email,
  u.username,
  s.subscription_id,
  s.subscription_status,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  s.price_id
FROM
  users u
LEFT JOIN
  stripe_user_subscriptions s ON s.customer_id IN (
    SELECT customer_id FROM stripe_customers WHERE user_id = u.id AND deleted_at IS NULL
  );

-- Grant permissions on the new view
GRANT SELECT ON user_subscription_status TO authenticated;

-- Update the initialize_user_deck_usage function to handle plan type determination
CREATE OR REPLACE FUNCTION initialize_user_deck_usage()
RETURNS TRIGGER AS $$
DECLARE
  user_plan_type text;
  next_reset_date timestamptz;
  has_subscription boolean;
BEGIN
  -- Check if user has an active subscription
  SELECT EXISTS (
    SELECT 1 
    FROM stripe_subscriptions s
    JOIN stripe_customers c ON s.customer_id = c.customer_id
    WHERE c.user_id = NEW.id
      AND (s.status = 'active' OR s.status = 'trialing')
      AND c.deleted_at IS NULL
  ) INTO has_subscription;
  
  -- Determine the user's plan type (default to free)
  IF has_subscription THEN
    -- Determine plan type based on subscription
    SELECT
      CASE
        WHEN s.price_id LIKE '%mystic%' THEN 'mystic'
        WHEN s.price_id LIKE '%creator%' THEN 'creator'
        WHEN s.price_id LIKE '%visionary%' THEN 'visionary'
        ELSE 'free'
      END INTO user_plan_type
    FROM stripe_subscriptions s
    JOIN stripe_customers c ON s.customer_id = c.customer_id
    WHERE c.user_id = NEW.id
      AND (s.status = 'active' OR s.status = 'trialing')
      AND c.deleted_at IS NULL
    LIMIT 1;
  ELSE
    user_plan_type := 'free';
  END IF;
  
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

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION reset_free_users_with_deck_deletion TO service_role;
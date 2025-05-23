/*
  # Credit Migration for Existing Accounts

  1. New Functions
    - `migrate_existing_user_credits`: Migrates all existing accounts without credit records
    - `migrate_single_user_credits`: Migrates a single user's credit record
  
  2. Security
    - Functions are SECURITY DEFINER to ensure proper access control
    - Specific grants provided for service_role

  This migration creates functions to handle existing accounts that were upgraded 
  before the credit system was fully implemented. It automatically creates credit 
  records based on subscription status, eliminating frontend errors for these users.
*/

-- Function to migrate a single user's credits based on subscription status
CREATE OR REPLACE FUNCTION migrate_single_user_credits(
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_subscription_record RECORD;
  v_plan_tier TEXT := 'free';
  v_basic_credits INTEGER := 5; -- Default free credits
  v_premium_credits INTEGER := 0;
  v_max_rollover_credits INTEGER := 0;
  v_next_refresh_date TIMESTAMP WITH TIME ZONE;
  v_existing_record_id UUID;
BEGIN
  -- Check if user already has a credit record
  SELECT id INTO v_existing_record_id
  FROM user_credits
  WHERE user_id = p_user_id;
  
  -- If record exists, no migration needed
  IF v_existing_record_id IS NOT NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's subscription status and price ID
  SELECT subscription_status, price_id INTO v_subscription_record
  FROM stripe_user_subscriptions
  WHERE customer_id IN (
    SELECT customer_id FROM stripe_customers WHERE user_id = p_user_id
  )
  LIMIT 1;
  
  -- Determine credit allocation based on subscription
  IF v_subscription_record.subscription_status = 'active' OR v_subscription_record.subscription_status = 'trialing' THEN
    -- Check which plan this price ID belongs to
    CASE 
      -- Mystic Monthly
      WHEN v_subscription_record.price_id = 'price_1ROxKkCzE3rkgdDIwV7o3c6S' THEN
        v_plan_tier := 'mystic';
        v_basic_credits := 22;
        v_premium_credits := 0;
        v_max_rollover_credits := 5;
      
      -- Mystic Yearly
      WHEN v_subscription_record.price_id = 'price_1RR3kzCzE3rkgdDI9AYaw6Ts' THEN
        v_plan_tier := 'mystic';
        v_basic_credits := 264; -- 22 * 12
        v_premium_credits := 0;
        v_max_rollover_credits := 22;
      
      -- Creator Monthly
      WHEN v_subscription_record.price_id = 'price_1RR3oICzE3rkgdDIAa5rt1Ds' THEN
        v_plan_tier := 'creator';
        v_basic_credits := 78;
        v_premium_credits := 0;
        v_max_rollover_credits := 15;
      
      -- Creator Yearly
      WHEN v_subscription_record.price_id = 'price_1RR3oICzE3rkgdDIT9XhLhah' THEN
        v_plan_tier := 'creator';
        v_basic_credits := 936; -- 78 * 12
        v_premium_credits := 0;
        v_max_rollover_credits := 78;
      
      -- Visionary Monthly
      WHEN v_subscription_record.price_id = 'price_1RR3r8CzE3rkgdDIWbWO283C' THEN
        v_plan_tier := 'visionary';
        v_basic_credits := 0;
        v_premium_credits := 118;
        v_max_rollover_credits := 118;
      
      -- Visionary Yearly
      WHEN v_subscription_record.price_id = 'price_1RR3sACzE3rkgdDI72SXNpqb' THEN
        v_plan_tier := 'visionary';
        v_basic_credits := 0;
        v_premium_credits := 1416; -- 118 * 12
        v_max_rollover_credits := 236;
      
      -- Default to free plan if price ID not recognized
      ELSE
        v_plan_tier := 'free';
        v_basic_credits := 5;
        v_premium_credits := 0;
        v_max_rollover_credits := 0;
    END CASE;
  END IF;
  
  -- Calculate next refresh date 
  IF v_subscription_record.subscription_status IN ('active', 'trialing') THEN
    -- For subscribers, use the current period end from subscription if available
    SELECT to_timestamp(current_period_end) INTO v_next_refresh_date
    FROM stripe_subscriptions
    WHERE customer_id IN (
      SELECT customer_id FROM stripe_customers WHERE user_id = p_user_id
    )
    LIMIT 1;
    
    -- Fallback to 1 month from now if current_period_end not available
    IF v_next_refresh_date IS NULL THEN
      v_next_refresh_date := NOW() + INTERVAL '1 month';
    END IF;
  ELSE
    -- Free users refresh in 1 month
    v_next_refresh_date := NOW() + INTERVAL '1 month';
  END IF;
  
  -- Create credit record
  INSERT INTO user_credits (
    user_id,
    basic_credits,
    premium_credits,
    basic_credits_used,
    premium_credits_used,
    plan_tier,
    max_rollover_credits,
    last_refresh_date,
    next_refresh_date,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_basic_credits,
    v_premium_credits,
    0, -- basic_credits_used
    0, -- premium_credits_used
    v_plan_tier,
    v_max_rollover_credits,
    NOW(), -- last_refresh_date
    v_next_refresh_date,
    NOW(),
    NOW()
  );
  
  -- Add transaction record
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    basic_credits_change,
    premium_credits_change,
    description,
    created_at
  ) VALUES (
    p_user_id,
    'allocation',
    v_basic_credits,
    v_premium_credits,
    'Initial credit allocation during migration for ' || v_plan_tier || ' plan',
    NOW()
  );
  
  RETURN TRUE;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error and return false
  RAISE NOTICE 'Error migrating credits for user %: %', p_user_id, SQLERRM;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to migrate all users who don't have credit records
CREATE OR REPLACE FUNCTION migrate_existing_user_credits() RETURNS INTEGER AS $$
DECLARE
  v_user_record RECORD;
  v_migration_count INTEGER := 0;
  v_success BOOLEAN;
BEGIN
  -- Find users without credit records
  FOR v_user_record IN
    SELECT u.id 
    FROM auth.users u
    LEFT JOIN user_credits uc ON u.id = uc.user_id
    WHERE uc.id IS NULL
  LOOP
    -- Migrate each user
    v_success := migrate_single_user_credits(v_user_record.id);
    
    IF v_success THEN
      v_migration_count := v_migration_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_migration_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION migrate_single_user_credits TO service_role;
GRANT EXECUTE ON FUNCTION migrate_existing_user_credits TO service_role;

-- Create an RPC endpoint that can be called from the client if needed
CREATE OR REPLACE FUNCTION check_and_create_user_credits(p_user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  -- This function can be called by client code to ensure a user has credits
  RETURN migrate_single_user_credits(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_and_create_user_credits TO authenticated;

-- Run the migration immediately to fix existing accounts
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT migrate_existing_user_credits() INTO v_count;
  RAISE NOTICE 'Migrated % users without credit records', v_count;
END $$;
/*
  # Fix Missing Credit Records

  1. Changes
     - Creates a function to directly fix and verify credit records for any user ID
     - Creates a trigger to automatically initialize credits when a user first accesses the system
     
  2. Purpose
     - Addresses issue where some users on paid plans don't have credit records
     - Provides consistent way to ensure all users have proper credit allocations
*/

-- Function to directly check and fix a credit record for a specific user
-- This can be called from application code as well as database triggers
CREATE OR REPLACE FUNCTION ensure_user_credit_record(
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_subscription_record RECORD;
  v_plan_tier TEXT := 'free';
  v_basic_credits INTEGER := 5; -- Default free credits
  v_premium_credits INTEGER := 0;
  v_max_rollover_credits INTEGER := 0;
  v_next_refresh_date TIMESTAMP WITH TIME ZONE;
  v_existing_record RECORD;
  v_customer_id TEXT;
BEGIN
  -- Check if user already has a credit record
  SELECT * INTO v_existing_record
  FROM user_credits
  WHERE user_id = p_user_id;
  
  -- If record exists, we're done
  IF v_existing_record IS NOT NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Find customer_id for this user
  SELECT customer_id INTO v_customer_id
  FROM stripe_customers
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- Get user's subscription status and price ID
  IF v_customer_id IS NOT NULL THEN
    -- First try the view
    SELECT subscription_status, price_id INTO v_subscription_record
    FROM stripe_user_subscriptions
    WHERE customer_id = v_customer_id
    LIMIT 1;
    
    -- If not found in the view, check the table directly
    IF v_subscription_record IS NULL THEN
      SELECT status as subscription_status, price_id INTO v_subscription_record
      FROM stripe_subscriptions
      WHERE customer_id = v_customer_id
      AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 1;
    END IF;
  END IF;
  
  -- Determine credit allocation based on subscription
  IF v_subscription_record.subscription_status IN ('active', 'trialing') THEN
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
    WHERE customer_id = v_customer_id
    AND deleted_at IS NULL
    ORDER BY updated_at DESC
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
    'Credit record created for ' || v_plan_tier || ' plan',
    NOW()
  );
  
  RAISE NOTICE 'Created missing credit record for user %, plan: %, basic: %, premium: %', 
    p_user_id, v_plan_tier, v_basic_credits, v_premium_credits;
    
  RETURN TRUE;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error and return false
  RAISE NOTICE 'Error creating credit record for user %: %', p_user_id, SQLERRM;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to ensure any user record access creates a credit record if missing
CREATE OR REPLACE FUNCTION ensure_credit_record_on_user_access() RETURNS TRIGGER AS $$
BEGIN
  -- Call the function to ensure the user has a credit record
  PERFORM ensure_user_credit_record(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to the users table
DROP TRIGGER IF EXISTS ensure_credit_record_trigger ON users;
CREATE TRIGGER ensure_credit_record_trigger
AFTER INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION ensure_credit_record_on_user_access();

-- Create an RPC endpoint that can be directly called from client code
CREATE OR REPLACE FUNCTION public.fix_missing_credit_record(
  user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN ensure_user_credit_record(user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION ensure_user_credit_record TO service_role;
GRANT EXECUTE ON FUNCTION ensure_credit_record_on_user_access TO service_role;
GRANT EXECUTE ON FUNCTION public.fix_missing_credit_record TO authenticated;
GRANT EXECUTE ON FUNCTION public.fix_missing_credit_record TO anon;

-- Create a function to retroactively fix ALL users
CREATE OR REPLACE FUNCTION fix_all_user_credit_records() RETURNS INTEGER AS $$
DECLARE
  v_user_record RECORD;
  v_fixed_count INTEGER := 0;
  v_success BOOLEAN;
BEGIN
  -- Find all users without credit records
  FOR v_user_record IN
    SELECT u.id 
    FROM auth.users u
    LEFT JOIN user_credits uc ON u.id = uc.user_id
    WHERE uc.id IS NULL
  LOOP
    -- Fix each user
    v_success := ensure_user_credit_record(v_user_record.id);
    
    IF v_success THEN
      v_fixed_count := v_fixed_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_fixed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to admin role
GRANT EXECUTE ON FUNCTION fix_all_user_credit_records TO service_role;

-- Run immediately to fix current users
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT fix_all_user_credit_records() INTO v_count;
  RAISE NOTICE 'Fixed % users with missing credit records', v_count;
END $$;
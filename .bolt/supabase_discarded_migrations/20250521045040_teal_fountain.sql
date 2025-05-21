/*
  # Update Credit System for Yearly Subscription Plans

  1. Changes:
    - Update initialize_user_credits() function to handle yearly plans
    - Support new stripe price IDs for monthly and yearly plans
    - Adjust credit allocation and rollover limits for yearly plans
    - Update refresh date calculation based on subscription interval

  2. Benefits:
    - Yearly subscribers get yearly credits allocation upfront
    - Higher rollover limits for yearly subscribers
    - Different plan tiers in user_credits to distinguish monthly/yearly
*/

-- Update initialize_user_credits function to handle the new yearly plans
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
DECLARE
  basic_credits INTEGER := 0;
  premium_credits INTEGER := 0;
  max_rollover INTEGER := 0;
  plan_name TEXT := 'free';
  user_id UUID;
BEGIN
  -- Find the user_id that corresponds to this customer_id
  SELECT sc.user_id INTO user_id
  FROM stripe_customers sc
  WHERE sc.customer_id = NEW.customer_id;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'No user found for customer_id %', NEW.customer_id;
  END IF;

  -- Determine credit allocation based on subscription price_id
  -- These values should match the ones in stripe-config.ts
  IF NEW.price_id = 'price_1ROxKkCzE3rkgdDIwV7o3c6S' THEN
    -- Mystic Monthly
    basic_credits := 22;
    premium_credits := 0;
    max_rollover := 5;
    plan_name := 'mystic';
  ELSIF NEW.price_id = 'price_1RR3kzCzE3rkgdDI9AYaw6Ts' THEN
    -- Mystic Yearly
    basic_credits := 264; -- 22 * 12
    premium_credits := 0;
    max_rollover := 22;
    plan_name := 'mystic-yearly';
  ELSIF NEW.price_id = 'price_1RR3oICzE3rkgdDIAa5rt1Ds' THEN
    -- Creator Monthly
    basic_credits := 78;
    premium_credits := 0;
    max_rollover := 15;
    plan_name := 'creator';
  ELSIF NEW.price_id = 'price_1RR3oICzE3rkgdDIT9XhLhah' THEN
    -- Creator Yearly
    basic_credits := 936; -- 78 * 12
    premium_credits := 0;
    max_rollover := 78;
    plan_name := 'creator-yearly';
  ELSIF NEW.price_id = 'price_1RR3r8CzE3rkgdDIWbWO283C' THEN
    -- Visionary Monthly
    basic_credits := 0;
    premium_credits := 118;
    max_rollover := 118;
    plan_name := 'visionary';
  ELSIF NEW.price_id = 'price_1RR3sACzE3rkgdDI72SXNpqb' THEN
    -- Visionary Yearly
    basic_credits := 0;
    premium_credits := 1416; -- 118 * 12
    max_rollover := 236;
    plan_name := 'visionary-yearly';
  ELSE
    -- Free plan - 5 basic credits
    basic_credits := 5;
    premium_credits := 0;
    max_rollover := 0;
    plan_name := 'free';
  END IF;

  -- Calculate next refresh date (first day of next month for monthly, same day next year for yearly)
  DECLARE
    refresh_date TIMESTAMPTZ;
    next_refresh_date TIMESTAMPTZ;
  BEGIN
    -- Set current refresh date to now
    refresh_date := now();
    
    -- Set next refresh date based on plan
    IF plan_name LIKE '%yearly%' THEN
      -- For yearly plans, next refresh is one year from now
      next_refresh_date := refresh_date + INTERVAL '1 year';
    ELSE
      -- For monthly plans, refresh on first day of next month
      next_refresh_date := DATE_TRUNC('month', refresh_date + INTERVAL '1 month')::TIMESTAMPTZ;
    END IF;
    
    -- Check if the user already has a credit record
    IF EXISTS (SELECT 1 FROM user_credits WHERE user_id = user_id) THEN
      -- Update existing record
      UPDATE user_credits
      SET 
        basic_credits = 
          -- Start with new allocation
          basic_credits +
          -- Add rollover credits (limited by max_rollover)
          LEAST(
            (SELECT COALESCE(basic_credits, 0) FROM user_credits WHERE user_id = user_id),
            max_rollover
          ),
        premium_credits = 
          -- Start with new allocation
          premium_credits +
          -- Add rollover credits (limited by max_rollover)
          LEAST(
            (SELECT COALESCE(premium_credits, 0) FROM user_credits WHERE user_id = user_id),
            max_rollover
          ),
        last_refresh_date = refresh_date,
        next_refresh_date = next_refresh_date,
        plan_tier = plan_name,
        max_rollover_credits = max_rollover,
        updated_at = now()
      WHERE user_id = user_id;
    ELSE
      -- Insert new record
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
      ) VALUES (
        user_id,
        basic_credits,
        premium_credits,
        0,
        0,
        refresh_date,
        next_refresh_date,
        plan_name,
        max_rollover
      );
    END IF;
    
    -- Insert credit transaction record
    INSERT INTO credit_transactions (
      user_id, 
      transaction_type, 
      basic_credits_change, 
      premium_credits_change, 
      description
    ) VALUES (
      user_id,
      'allocation',
      basic_credits,
      premium_credits,
      'Subscription ' || 
        CASE 
          WHEN NEW.status = 'active' THEN 'started or renewed'
          ELSE NEW.status
        END || ' (' || plan_name || ')'
    );

    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS initialize_credits_on_subscription ON stripe_subscriptions;

CREATE TRIGGER initialize_credits_on_subscription
AFTER INSERT OR UPDATE OF status, price_id
ON stripe_subscriptions
FOR EACH ROW
WHEN (NEW.status = 'active' OR NEW.status = 'trialing')
EXECUTE FUNCTION initialize_user_credits();
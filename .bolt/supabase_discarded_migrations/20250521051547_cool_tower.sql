/*
  # Fix credit initialization issues
  
  1. New Functions
    - `initialize_subscription_credits`: Initializes credits based on subscription tier
    - `handle_subscription_change`: Trigger function that calls initialize_credits when subscription changes
  
  2. Updates
    - Updates RLS policies for user_credits table to ensure proper access
    - Adds a trigger on stripe_subscriptions table to automatically handle credit initialization
  
  3. Integration
    - Ensures proper credit allocation when a user subscribes or changes plans
    - Credits are allocated based on the subscription tier (mystic, creator, visionary)
*/

-- Function to initialize or update credits based on subscription
CREATE OR REPLACE FUNCTION initialize_subscription_credits(
  p_user_id UUID,
  p_price_id TEXT
) RETURNS BOOLEAN 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_base_credits INTEGER := 0;
  v_premium_credits INTEGER := 0;
  v_plan_tier TEXT := 'free';
  v_max_rollover_credits INTEGER := 0;
  v_next_refresh_date TIMESTAMPTZ;
  v_current_basic_credits INTEGER := 0;
  v_current_premium_credits INTEGER := 0;
  v_user_credits_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Determine credit amounts based on price_id
  CASE p_price_id
    -- Mystic Monthly
    WHEN 'price_1ROxKkCzE3rkgdDIwV7o3c6S' THEN
      v_base_credits := 22;
      v_premium_credits := 0;
      v_plan_tier := 'mystic';
      v_max_rollover_credits := 5;
    
    -- Mystic Yearly
    WHEN 'price_1RR3kzCzE3rkgdDI9AYaw6Ts' THEN
      v_base_credits := 264;
      v_premium_credits := 0;
      v_plan_tier := 'mystic';
      v_max_rollover_credits := 22;
      
    -- Creator Monthly
    WHEN 'price_1RR3oICzE3rkgdDIAa5rt1Ds' THEN
      v_base_credits := 78;
      v_premium_credits := 0;
      v_plan_tier := 'creator';
      v_max_rollover_credits := 15;
      
    -- Creator Yearly
    WHEN 'price_1RR3oICzE3rkgdDIT9XhLhah' THEN
      v_base_credits := 936;
      v_premium_credits := 0;
      v_plan_tier := 'creator';
      v_max_rollover_credits := 78;
      
    -- Visionary Monthly
    WHEN 'price_1RR3r8CzE3rkgdDIWbWO283C' THEN
      v_base_credits := 0;
      v_premium_credits := 118;
      v_plan_tier := 'visionary';
      v_max_rollover_credits := 118;
      
    -- Visionary Yearly
    WHEN 'price_1RR3sACzE3rkgdDI72SXNpqb' THEN
      v_base_credits := 0;
      v_premium_credits := 1416;
      v_plan_tier := 'visionary';
      v_max_rollover_credits := 236;
    
    ELSE
      v_base_credits := 5;
      v_premium_credits := 0;
      v_plan_tier := 'free';
      v_max_rollover_credits := 0;
  END CASE;
  
  -- Calculate next refresh date (1 month from now for simplicity)
  v_next_refresh_date := v_now + interval '1 month';
  
  -- Check if user already has credits record
  SELECT id, basic_credits, premium_credits INTO v_user_credits_id, v_current_basic_credits, v_current_premium_credits
  FROM user_credits
  WHERE user_id = p_user_id;
  
  IF v_user_credits_id IS NULL THEN
    -- Insert new credits record if none exists
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
      v_base_credits,
      v_premium_credits,
      0,
      0,
      v_plan_tier,
      v_max_rollover_credits,
      v_now,
      v_next_refresh_date,
      v_now,
      v_now
    );
    
    -- Record credit transaction
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
      v_base_credits,
      v_premium_credits,
      'Initial credit allocation for ' || v_plan_tier || ' subscription',
      v_now
    );
  ELSE
    -- Update existing credits record
    UPDATE user_credits
    SET 
      basic_credits = v_base_credits,
      premium_credits = v_premium_credits,
      plan_tier = v_plan_tier,
      max_rollover_credits = v_max_rollover_credits,
      last_refresh_date = v_now,
      next_refresh_date = v_next_refresh_date,
      updated_at = v_now
    WHERE id = v_user_credits_id;
    
    -- Record credit transaction with changes
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
      v_base_credits - v_current_basic_credits,
      v_premium_credits - v_current_premium_credits,
      'Credit update for ' || v_plan_tier || ' subscription',
      v_now
    );
  END IF;
  
  RETURN TRUE;
  
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- Make sure user_credits table has the proper RLS enabled
ALTER TABLE IF EXISTS user_credits ENABLE ROW LEVEL SECURITY;

-- Update or create proper RLS policies for user_credits
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own credit information" ON user_credits;
  DROP POLICY IF EXISTS "System can update credit information" ON user_credits;

  -- Create new policies
  CREATE POLICY "Users can view their own credit information" 
    ON user_credits FOR SELECT 
    TO authenticated
    USING (user_id = auth.uid());
    
  CREATE POLICY "System can update credit information" 
    ON user_credits FOR ALL 
    TO service_role
    USING (true) 
    WITH CHECK (true);
END
$$;

-- Create a direct trigger on stripe_subscriptions to initialize credits
CREATE OR REPLACE FUNCTION handle_subscription_change() RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'active' OR NEW.status = 'trialing') THEN
    -- Get the user_id for this customer
    DECLARE
      v_user_id UUID;
    BEGIN
      SELECT user_id INTO v_user_id FROM stripe_customers 
      WHERE customer_id = NEW.customer_id AND deleted_at IS NULL;
      
      IF v_user_id IS NOT NULL THEN
        -- Initialize credits for the user
        PERFORM initialize_subscription_credits(v_user_id, NEW.price_id);
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to subscription table
DROP TRIGGER IF EXISTS subscription_credits_trigger ON stripe_subscriptions;
CREATE TRIGGER subscription_credits_trigger
AFTER INSERT OR UPDATE OF status, price_id ON stripe_subscriptions
FOR EACH ROW
WHEN (NEW.status = 'active' OR NEW.status = 'trialing')
EXECUTE FUNCTION handle_subscription_change();
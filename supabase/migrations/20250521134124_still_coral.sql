/*
  # Credit System Schema Update

  1. New Tables
     - `user_credits` - Tracks credit balances for users
     - `credit_transactions` - Audit log for all credit operations

  2. Changes
     - Added `last_card_generation_date` to users table
     - Created view `user_subscription_credits` for easy access to combined data

  3. New Functions
     - `initialize_user_credits()` - Sets up credits when subscription changes
     - `consume_user_credits()` - Handles credit consumption for card generation
     - `reset_free_tier_credits()` - Monthly reset for free users
     - `handle_credit_rollover()` - Manages credit expiration and rollover

  4. Security
     - Added RLS policies for credit tables
     - All functions run with SECURITY DEFINER
*/

-- Create user_credits table to track credit balances and details
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  basic_credits INTEGER NOT NULL DEFAULT 0,
  premium_credits INTEGER NOT NULL DEFAULT 0,
  basic_credits_used INTEGER NOT NULL DEFAULT 0,
  premium_credits_used INTEGER NOT NULL DEFAULT 0,
  last_refresh_date TIMESTAMPTZ,
  next_refresh_date TIMESTAMPTZ,
  plan_tier TEXT,
  max_rollover_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT positive_credits CHECK (basic_credits >= 0 AND premium_credits >= 0),
  CONSTRAINT positive_credits_used CHECK (basic_credits_used >= 0 AND premium_credits_used >= 0)
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Create credit transactions table for auditing and history
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'allocation', 'consumption', 'expiration', 'rollover'
  basic_credits_change INTEGER DEFAULT 0,
  premium_credits_change INTEGER DEFAULT 0,
  description TEXT,
  reference_id UUID, -- Optional reference to a deck or card
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Add last_card_generation_date column to track recent activity
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_card_generation_date TIMESTAMPTZ;

-- Create a view to get user credit information along with subscription status
CREATE OR REPLACE VIEW user_subscription_credits AS
SELECT 
  u.id AS user_id,
  u.email,
  u.username,
  uc.basic_credits,
  uc.premium_credits,
  uc.basic_credits_used,
  uc.premium_credits_used,
  uc.last_refresh_date,
  uc.next_refresh_date,
  uc.plan_tier,
  uc.max_rollover_credits,
  s.subscription_id,
  s.subscription_status,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  s.price_id
FROM 
  users u
LEFT JOIN 
  user_credits uc ON u.id = uc.user_id
LEFT JOIN 
  stripe_user_subscriptions s ON u.id = auth.uid();

-- Security policies for user_credits - Check if they exist first
DO $$
BEGIN
  -- Check if the policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_credits' 
    AND policyname = 'Users can view their own credit information'
  ) THEN
    CREATE POLICY "Users can view their own credit information"
      ON user_credits
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  -- Check if the policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_credits' 
    AND policyname = 'System can update credit information'
  ) THEN
    CREATE POLICY "System can update credit information"
      ON user_credits
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Security policies for credit_transactions - Check if they exist first
DO $$
BEGIN
  -- Check if the policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_transactions' 
    AND policyname = 'Users can view their own credit transactions'
  ) THEN
    CREATE POLICY "Users can view their own credit transactions"
      ON credit_transactions
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  -- Check if the policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_transactions' 
    AND policyname = 'System can insert credit transactions'
  ) THEN
    CREATE POLICY "System can insert credit transactions"
      ON credit_transactions
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- Function to initialize user credits on subscription change
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
DECLARE
  basic_credits INTEGER := 0;
  premium_credits INTEGER := 0;
  max_rollover INTEGER := 0;
  plan_name TEXT := 'free';
BEGIN
  -- Determine credit allocation based on subscription price_id
  -- These values should match the ones in stripe-config.ts
  IF NEW.price_id = 'price_1ROxKkCzE3rkgdDILMeJSI4D' THEN
    -- Mystic plan
    basic_credits := 22;
    premium_credits := 0;
    max_rollover := 5;
    plan_name := 'mystic';
  ELSIF NEW.price_id = 'price_1ROxKkCzE3rkgdDIZVPaqZHm' THEN
    -- Creator plan
    basic_credits := 78;
    premium_credits := 0;
    max_rollover := 15;
    plan_name := 'creator';
  ELSIF NEW.price_id = 'price_1ROxKkCzE3rkgdDIFrJaFEtC' THEN
    -- Visionary plan
    basic_credits := 0;
    premium_credits := 118;
    max_rollover := 118;
    plan_name := 'visionary';
  ELSE
    -- Free plan - 5 basic credits
    basic_credits := 5;
    premium_credits := 0;
    max_rollover := 0;
    plan_name := 'free';
  END IF;

  -- Calculate next refresh date (first day of next month)
  DECLARE
    next_month DATE := (CURRENT_DATE + INTERVAL '1 month')::DATE;
    first_of_next_month DATE := DATE_TRUNC('month', next_month)::DATE;
  BEGIN
    -- Check if the user already has a credit record
    IF EXISTS (SELECT 1 FROM user_credits WHERE user_id = auth.uid()) THEN
      -- Update existing record
      UPDATE user_credits
      SET 
        basic_credits = 
          -- Start with new allocation
          basic_credits +
          -- Add rollover credits (limited by max_rollover)
          LEAST(
            (SELECT COALESCE(basic_credits, 0) FROM user_credits WHERE user_id = auth.uid()),
            max_rollover
          ),
        premium_credits = 
          -- Start with new allocation
          premium_credits +
          -- Add rollover credits (limited by max_rollover)
          LEAST(
            (SELECT COALESCE(premium_credits, 0) FROM user_credits WHERE user_id = auth.uid()),
            max_rollover
          ),
        last_refresh_date = now(),
        next_refresh_date = first_of_next_month,
        plan_tier = plan_name,
        max_rollover_credits = max_rollover,
        updated_at = now()
      WHERE user_id = auth.uid();
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
        auth.uid(),
        basic_credits,
        premium_credits,
        0,
        0,
        now(),
        first_of_next_month,
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
      auth.uid(),
      'allocation',
      basic_credits,
      premium_credits,
      'Subscription ' || 
        CASE 
          WHEN NEW.subscription_status = 'active' THEN 'started or renewed'
          ELSE NEW.subscription_status
        END
    );

    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if the trigger exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'initialize_credits_on_subscription'
  ) THEN
    -- Trigger to initialize credits when a subscription is activated
    CREATE TRIGGER initialize_credits_on_subscription
    AFTER INSERT OR UPDATE OF subscription_status, price_id
    ON stripe_subscriptions
    FOR EACH ROW
    WHEN (NEW.subscription_status = 'active' OR NEW.subscription_status = 'trialing')
    EXECUTE FUNCTION initialize_user_credits();
  END IF;
END $$;

-- Function to consume credits when generating cards
CREATE OR REPLACE FUNCTION consume_user_credits(
  p_user_id UUID,
  p_basic_credits_to_use INTEGER DEFAULT 0,
  p_premium_credits_to_use INTEGER DEFAULT 0,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT 'Card generation'
)
RETURNS BOOLEAN AS $$
DECLARE
  available_basic_credits INTEGER;
  available_premium_credits INTEGER;
BEGIN
  -- Get available credits
  SELECT basic_credits, premium_credits
  INTO available_basic_credits, available_premium_credits
  FROM user_credits
  WHERE user_id = p_user_id;
  
  -- Verify we have the user's credit record
  IF available_basic_credits IS NULL THEN
    -- If no record exists, create one for free tier
    INSERT INTO user_credits (
      user_id, 
      basic_credits, 
      premium_credits,
      plan_tier
    ) VALUES (
      p_user_id,
      5, -- Free tier default
      0,
      'free'
    )
    RETURNING basic_credits, premium_credits
    INTO available_basic_credits, available_premium_credits;
  END IF;
  
  -- Check if user has enough credits
  IF p_basic_credits_to_use > available_basic_credits OR 
     p_premium_credits_to_use > available_premium_credits THEN
    RETURN FALSE; -- Not enough credits
  END IF;
  
  -- Update user credits
  UPDATE user_credits
  SET 
    basic_credits = basic_credits - p_basic_credits_to_use,
    premium_credits = premium_credits - p_premium_credits_to_use,
    basic_credits_used = basic_credits_used + p_basic_credits_to_use,
    premium_credits_used = premium_credits_used + p_premium_credits_to_use,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    basic_credits_change,
    premium_credits_change,
    reference_id,
    description
  ) VALUES (
    p_user_id,
    'consumption',
    -p_basic_credits_to_use,
    -p_premium_credits_to_use,
    p_reference_id,
    p_description
  );
  
  -- Update last generation date on user profile
  UPDATE users
  SET last_card_generation_date = now()
  WHERE id = p_user_id;
  
  RETURN TRUE; -- Success
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset free tier credits monthly
CREATE OR REPLACE FUNCTION reset_free_tier_credits()
RETURNS VOID AS $$
DECLARE
  next_month DATE := (CURRENT_DATE + INTERVAL '1 month')::DATE;
  first_of_next_month DATE := DATE_TRUNC('month', next_month)::DATE;
BEGIN
  -- For free tier users (no active subscription), reset credits to 5
  UPDATE user_credits uc
  SET 
    basic_credits = 5,
    premium_credits = 0,
    last_refresh_date = now(),
    next_refresh_date = first_of_next_month,
    updated_at = now()
  FROM users u
  LEFT JOIN stripe_user_subscriptions s ON u.id = auth.uid()
  WHERE uc.user_id = u.id
    AND (s.subscription_status IS NULL OR 
         s.subscription_status NOT IN ('active', 'trialing'))
    AND uc.plan_tier = 'free';
    
  -- Record transactions for these resets
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
    5, -- Free plan always gets 5 basic credits
    0,
    'Monthly free tier credit refresh'
  FROM user_credits uc
  JOIN users u ON uc.user_id = u.id
  LEFT JOIN stripe_user_subscriptions s ON u.id = auth.uid()
  WHERE (s.subscription_status IS NULL OR 
         s.subscription_status NOT IN ('active', 'trialing'))
    AND uc.plan_tier = 'free';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to expire credits that exceed rollover limits on renewal
CREATE OR REPLACE FUNCTION handle_credit_rollover()
RETURNS TRIGGER AS $$
DECLARE
  old_basic_credits INTEGER;
  old_premium_credits INTEGER;
  rollover_basic_credits INTEGER;
  rollover_premium_credits INTEGER;
  expired_basic_credits INTEGER;
  expired_premium_credits INTEGER;
BEGIN
  -- Get previous credit amounts
  SELECT basic_credits, premium_credits 
  INTO old_basic_credits, old_premium_credits
  FROM user_credits 
  WHERE user_id = NEW.user_id;
  
  -- Calculate rollover amounts (limited by max_rollover_credits)
  rollover_basic_credits := LEAST(old_basic_credits, NEW.max_rollover_credits);
  rollover_premium_credits := LEAST(old_premium_credits, NEW.max_rollover_credits);
  
  -- Calculate expired amounts
  expired_basic_credits := old_basic_credits - rollover_basic_credits;
  expired_premium_credits := old_premium_credits - rollover_premium_credits;
  
  -- Only record transaction if credits actually expired
  IF expired_basic_credits > 0 OR expired_premium_credits > 0 THEN
    INSERT INTO credit_transactions (
      user_id,
      transaction_type,
      basic_credits_change,
      premium_credits_change,
      description
    ) VALUES (
      NEW.user_id,
      'expiration',
      -expired_basic_credits,
      -expired_premium_credits,
      'Credits expired on subscription renewal'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if the trigger exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'handle_credit_rollover_trigger'
  ) THEN
    -- Trigger to handle credit rollover on subscription renewal
    CREATE TRIGGER handle_credit_rollover_trigger
    AFTER UPDATE OF last_refresh_date
    ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION handle_credit_rollover();
  END IF;
END $$;

-- Give free credits to new users
CREATE OR REPLACE FUNCTION initialize_free_credits()
RETURNS TRIGGER AS $$
DECLARE
  next_month DATE := (CURRENT_DATE + INTERVAL '1 month')::DATE;
  first_of_next_month DATE := DATE_TRUNC('month', next_month)::DATE;
BEGIN
  -- Create initial credit record for new user
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
    NEW.id,
    5, -- Free tier starts with 5 basic credits
    0,  -- No premium credits for free tier
    0,
    0,
    now(),
    first_of_next_month,
    'free',
    0   -- No rollover for free tier
  );
  
  -- Record the initial credit allocation
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    basic_credits_change,
    premium_credits_change,
    description
  ) VALUES (
    NEW.id,
    'allocation',
    5,
    0,
    'Initial free credits for new user'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if the trigger exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'initialize_free_credits_trigger'
  ) THEN
    -- Trigger to give free credits to new users
    CREATE TRIGGER initialize_free_credits_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION initialize_free_credits();
  END IF;
END $$;
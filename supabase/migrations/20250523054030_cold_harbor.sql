/*
  # Create RPC functions for deck quota management

  1. New Functions
     - log_deck_quota_change: Records changes to deck quotas
     - consume_user_deck_quotas: Updates user's deck quotas when consumed
     - initialize_user_deck_quota: Creates or updates a user's deck quota record
     - fix_missing_deck_quota_record: Fixes missing deck quota records
  
  2. Security
     - Functions are executed with security definer permissions
*/

-- Function to log deck quota changes (replacement for credit_transactions)
CREATE OR REPLACE FUNCTION log_deck_quota_change(
  p_user_id UUID,
  p_major_arcana_change INTEGER,
  p_complete_deck_change INTEGER,
  p_description TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the change in a table or perform any other necessary actions
  -- This is a placeholder - in a real implementation, you might want to store this in a log table
  
  -- For now, just return success
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Function to consume user deck quotas
CREATE OR REPLACE FUNCTION consume_user_deck_quotas(
  p_user_id UUID,
  p_major_arcana_to_use INTEGER,
  p_complete_deck_to_use INTEGER,
  p_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT 'Deck generation'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_major_arcana INTEGER;
  v_current_complete_deck INTEGER;
BEGIN
  -- Get current quota values
  SELECT 
    major_arcana_quota - major_arcana_used,
    complete_deck_quota - complete_deck_used
  INTO 
    v_current_major_arcana,
    v_current_complete_deck
  FROM 
    user_deck_quotas
  WHERE 
    user_id = p_user_id;
    
  -- Check if user has enough quota
  IF v_current_major_arcana < p_major_arcana_to_use OR v_current_complete_deck < p_complete_deck_to_use THEN
    RETURN FALSE;
  END IF;
  
  -- Update the user's quota usage
  UPDATE user_deck_quotas
  SET 
    major_arcana_used = major_arcana_used + p_major_arcana_to_use,
    complete_deck_used = complete_deck_used + p_complete_deck_to_use,
    updated_at = NOW()
  WHERE 
    user_id = p_user_id;
    
  -- Log the quota change
  PERFORM log_deck_quota_change(
    p_user_id,
    -p_major_arcana_to_use,
    -p_complete_deck_to_use,
    p_description
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Function to initialize a user's deck quota record
CREATE OR REPLACE FUNCTION initialize_user_deck_quota(
  p_user_id UUID,
  p_plan_tier TEXT,
  p_major_arcana_quota INTEGER,
  p_complete_deck_quota INTEGER,
  p_max_rollover INTEGER,
  p_next_refresh_date TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if a record already exists
  IF EXISTS (SELECT 1 FROM user_deck_quotas WHERE user_id = p_user_id) THEN
    -- Update existing record
    UPDATE user_deck_quotas
    SET 
      major_arcana_quota = p_major_arcana_quota,
      complete_deck_quota = p_complete_deck_quota,
      plan_type = p_plan_tier,
      max_rollover_quota = p_max_rollover,
      next_refresh_date = p_next_refresh_date,
      updated_at = NOW()
    WHERE 
      user_id = p_user_id;
  ELSE
    -- Insert new record
    INSERT INTO user_deck_quotas (
      user_id,
      major_arcana_quota,
      complete_deck_quota,
      major_arcana_used,
      complete_deck_used,
      plan_type,
      max_rollover_quota,
      next_refresh_date
    ) VALUES (
      p_user_id,
      p_major_arcana_quota,
      p_complete_deck_quota,
      0,
      0,
      p_plan_tier,
      p_max_rollover,
      p_next_refresh_date
    );
  END IF;
  
  -- Log the quota change
  PERFORM log_deck_quota_change(
    p_user_id,
    p_major_arcana_quota,
    p_complete_deck_quota,
    'Deck quotas initialized for ' || p_plan_tier || ' plan'
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Function to fix missing deck quota records
CREATE OR REPLACE FUNCTION fix_missing_deck_quota_record(
  user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_type TEXT;
  v_major_arcana_quota INTEGER;
  v_complete_deck_quota INTEGER;
  v_max_rollover_quota INTEGER;
  v_next_refresh_date TIMESTAMPTZ;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user already has a deck quota record
  IF EXISTS (SELECT 1 FROM user_deck_quotas WHERE user_id = user_id) THEN
    RETURN TRUE; -- Already exists, no need to fix
  END IF;
  
  -- Determine plan type from subscription if available
  SELECT 
    COALESCE(
      (SELECT 
        CASE 
          WHEN s.price_id LIKE '%mystic%' THEN 'mystic'
          WHEN s.price_id LIKE '%creator%' THEN 'creator'
          WHEN s.price_id LIKE '%visionary%' THEN 'visionary'
          ELSE 'free'
        END
       FROM stripe_user_subscriptions s
       JOIN stripe_customers c ON s.customer_id = c.customer_id
       WHERE c.user_id = user_id
       AND (s.subscription_status = 'active' OR s.subscription_status = 'trialing')
       LIMIT 1),
      'free'
    ) INTO v_plan_type;
  
  -- Set quota values based on plan type
  CASE v_plan_type
    WHEN 'mystic' THEN
      v_major_arcana_quota := 2;
      v_complete_deck_quota := 2;
      v_max_rollover_quota := 1;
    WHEN 'creator' THEN
      v_major_arcana_quota := 4;
      v_complete_deck_quota := 4;
      v_max_rollover_quota := 2;
    WHEN 'visionary' THEN
      v_major_arcana_quota := 8;
      v_complete_deck_quota := 8;
      v_max_rollover_quota := 4;
    ELSE -- free plan
      v_major_arcana_quota := 1;
      v_complete_deck_quota := 0;
      v_max_rollover_quota := 0;
  END CASE;
  
  -- Calculate next refresh date (first day of next month)
  v_next_refresh_date := date_trunc('month', NOW()) + interval '1 month';
  
  -- Create the deck quota record
  INSERT INTO user_deck_quotas (
    user_id,
    major_arcana_quota,
    complete_deck_quota,
    major_arcana_used,
    complete_deck_used,
    plan_type,
    max_rollover_quota,
    next_refresh_date
  ) VALUES (
    user_id,
    v_major_arcana_quota,
    v_complete_deck_quota,
    0,
    0,
    v_plan_type,
    v_max_rollover_quota,
    v_next_refresh_date
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;
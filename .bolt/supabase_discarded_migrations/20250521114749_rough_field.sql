/*
  # Add credit migration function

  1. New Function
    - `initialize_user_credit_record` - Creates a credit record for users who don't have one
    
  2. Purpose
    - Provides a server-side function to handle credit initialization for users who were upgraded 
      before the credit system was fully implemented
    - Ensures data integrity by handling the transaction in a single RPC call
*/

CREATE OR REPLACE FUNCTION initialize_user_credit_record(
  p_user_id UUID,
  p_plan_tier TEXT,
  p_basic_credits INTEGER,
  p_premium_credits INTEGER,
  p_max_rollover INTEGER,
  p_next_refresh_date TIMESTAMP WITH TIME ZONE
) RETURNS VOID AS $$
DECLARE
  v_existing_record_id UUID;
BEGIN
  -- Check if a record already exists to avoid duplicates
  SELECT id INTO v_existing_record_id
  FROM user_credits
  WHERE user_id = p_user_id;
  
  IF v_existing_record_id IS NULL THEN
    -- No record exists, create one
    INSERT INTO user_credits (
      user_id,
      basic_credits,
      premium_credits,
      basic_credits_used,
      premium_credits_used,
      plan_tier,
      max_rollover_credits,
      next_refresh_date,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_basic_credits,
      p_premium_credits,
      0, -- basic_credits_used
      0, -- premium_credits_used
      p_plan_tier,
      p_max_rollover,
      p_next_refresh_date,
      NOW(),
      NOW()
    );
    
    -- Also insert a credit allocation transaction for auditing
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
      p_basic_credits,
      p_premium_credits,
      'Credit migration: Initial allocation for ' || p_plan_tier || ' plan',
      NOW()
    );
  ELSE
    -- Record exists, do nothing (or could update it if needed)
    NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION initialize_user_credit_record TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_user_credit_record TO service_role;
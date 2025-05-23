/*
  # Reset Free Users and Delete Their Decks

  1. New Functions
    - `reset_free_users_with_deck_deletion`: Resets free users' usage and deletes their decks
    - `delete_user_decks`: Deletes all decks created by a specific user

  2. Changes
    - Resets all free users (without active subscriptions) to fresh state
    - Deletes all decks created by free users
    - Resets credit allocations to default values
    - Ensures all users have proper records in tracking tables
*/

-- Create a function to delete all decks created by a user
CREATE OR REPLACE FUNCTION delete_user_decks(user_id_param uuid)
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete all decks created by the user
  WITH deleted AS (
    DELETE FROM decks
    WHERE creator_id = user_id_param
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to reset free users and delete their decks
CREATE OR REPLACE FUNCTION reset_free_users_with_deck_deletion()
RETURNS TABLE (
  user_id uuid,
  decks_deleted integer,
  usage_reset boolean,
  credits_reset boolean
) AS $$
DECLARE
  next_reset_date timestamptz;
  free_user record;
  decks_deleted integer;
  usage_updated boolean;
  credits_updated boolean;
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
    
    -- Reset user's credits
    UPDATE user_credits
    SET 
      basic_credits = 5, -- Free users get 5 basic credits
      premium_credits = 0,
      basic_credits_used = 0,
      premium_credits_used = 0,
      last_refresh_date = now(),
      next_refresh_date = next_reset_date,
      plan_tier = 'free',
      max_rollover_credits = 0,
      updated_at = now()
    WHERE user_id = free_user.id;
    
    GET DIAGNOSTICS credits_updated = ROW_COUNT;
    
    -- If no credit record exists, create one
    IF credits_updated = 0 THEN
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
        free_user.id,
        5, -- Free users get 5 basic credits
        0,
        0,
        0,
        now(),
        next_reset_date,
        'free',
        0
      )
      ON CONFLICT (user_id) DO NOTHING;
      
      GET DIAGNOSTICS credits_updated = ROW_COUNT;
    END IF;
    
    -- Record credit transaction for the reset
    INSERT INTO credit_transactions (
      user_id,
      transaction_type,
      basic_credits_change,
      premium_credits_change,
      description
    ) VALUES (
      free_user.id,
      'allocation',
      5, -- 5 basic credits
      0,
      'Credits reset to free plan default'
    );
    
    -- Return the results for this user
    user_id := free_user.id;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to reset free users and delete their decks
SELECT * FROM reset_free_users_with_deck_deletion();

-- Create a function to check if a user is on a free plan
CREATE OR REPLACE FUNCTION is_free_user(user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM stripe_subscriptions s
    JOIN stripe_customers c ON s.customer_id = c.customer_id
    WHERE c.user_id = user_id_param
      AND (s.status = 'active' OR s.status = 'trialing')
      AND c.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION reset_free_users_with_deck_deletion TO service_role;
GRANT EXECUTE ON FUNCTION delete_user_decks TO service_role;
GRANT EXECUTE ON FUNCTION is_free_user TO service_role;
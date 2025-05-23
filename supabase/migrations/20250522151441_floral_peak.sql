/*
  # Functions for deck limit system
  
  1. New Functions
     - Function to increment deck generation counters
     - Function to check if a user can generate a deck

  2. Security
     - Both functions can be called by authenticated users
*/

-- Function to increment a specific counter in user_deck_usage
CREATE OR REPLACE FUNCTION increment_deck_generation_counter(
  user_id_param UUID,
  field_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  valid_fields TEXT[] := ARRAY['major_arcana_generated', 'complete_decks_generated', 'regenerations_used'];
  field_exists BOOLEAN;
  update_query TEXT;
  result BOOLEAN;
BEGIN
  -- Validate that the field name is allowed (security measure)
  SELECT field_name = ANY(valid_fields) INTO field_exists;
  
  IF NOT field_exists THEN
    RAISE EXCEPTION 'Invalid field name: %', field_name;
  END IF;
  
  -- Build and execute dynamic query to increment the specific field
  update_query := format('
    UPDATE user_deck_usage 
    SET %I = %I + 1, 
        updated_at = now() 
    WHERE user_id = %L
    RETURNING true', 
    field_name, field_name, user_id_param);
  
  EXECUTE update_query INTO result;
  
  -- If no row was updated, user might not exist yet
  IF result IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error incrementing counter: %', SQLERRM;
  RETURN FALSE;
END;
$$;

-- Function to check if a user can generate a deck of a specific type
CREATE OR REPLACE FUNCTION can_generate_deck(
  user_id_param UUID,
  deck_type TEXT -- 'major_arcana' or 'complete'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_usage RECORD;
  plan_limits RECORD;
  valid_types TEXT[] := ARRAY['major_arcana', 'complete'];
  type_exists BOOLEAN;
  current_count INTEGER;
  max_limit INTEGER;
  needs_reset BOOLEAN;
BEGIN
  -- Validate deck type
  SELECT deck_type = ANY(valid_types) INTO type_exists;
  
  IF NOT type_exists THEN
    RAISE EXCEPTION 'Invalid deck type: %', deck_type;
  END IF;
  
  -- Get user's current usage
  SELECT * INTO user_usage
  FROM user_deck_usage
  WHERE user_id = user_id_param;
  
  -- If no usage record, create one with default free plan
  IF NOT FOUND THEN
    INSERT INTO user_deck_usage (
      user_id,
      plan_type,
      major_arcana_generated,
      complete_decks_generated,
      regenerations_used,
      last_reset_date,
      next_reset_date
    ) VALUES (
      user_id_param,
      'free',
      0,
      0,
      0,
      now(),
      date_trunc('month', now()) + interval '1 month'
    )
    RETURNING * INTO user_usage;
  END IF;
  
  -- Check if reset is needed (billing period ended)
  IF user_usage.next_reset_date IS NOT NULL AND user_usage.next_reset_date < now() THEN
    needs_reset := TRUE;
  ELSE
    needs_reset := FALSE;
  END IF;
  
  -- If reset is needed, reset counters
  IF needs_reset THEN
    UPDATE user_deck_usage
    SET 
      major_arcana_generated = 0,
      complete_decks_generated = 0,
      regenerations_used = 0,
      last_reset_date = now(),
      next_reset_date = date_trunc('month', now()) + interval '1 month',
      updated_at = now()
    WHERE user_id = user_id_param
    RETURNING * INTO user_usage;
  END IF;
  
  -- Get plan limits
  SELECT * INTO plan_limits
  FROM deck_generation_limits
  WHERE plan_type = user_usage.plan_type;
  
  -- If no plan found, use free plan limits
  IF NOT FOUND THEN
    SELECT * INTO plan_limits
    FROM deck_generation_limits
    WHERE plan_type = 'free';
  END IF;
  
  -- Check against appropriate limit based on deck type
  IF deck_type = 'major_arcana' THEN
    current_count := user_usage.major_arcana_generated;
    max_limit := plan_limits.major_arcana_limit;
  ELSE -- complete
    current_count := user_usage.complete_decks_generated;
    max_limit := plan_limits.complete_deck_limit;
  END IF;
  
  -- Can generate if count is less than limit or reset was performed
  RETURN current_count < max_limit OR needs_reset;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error checking deck generation eligibility: %', SQLERRM;
  RETURN FALSE;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_deck_generation_counter TO authenticated;
GRANT EXECUTE ON FUNCTION can_generate_deck TO authenticated;
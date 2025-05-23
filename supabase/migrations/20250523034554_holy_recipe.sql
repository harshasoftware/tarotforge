/*
  # Add Deck Generation Limit Check Function

  1. New Functions
    - `check_deck_generation_limit`: Checks if a user has reached their deck generation limit
    - `get_user_plan_limits`: Gets the limits for a user's current plan
  
  2. Security
    - Functions are accessible to authenticated users
    
  3. Changes
    - Adds helper functions to check deck generation eligibility
    - Improves error handling for anonymous users
*/

-- Function to get a user's plan limits
CREATE OR REPLACE FUNCTION get_user_plan_limits(user_id_param uuid)
RETURNS TABLE (
  plan_type text,
  major_arcana_limit integer,
  complete_deck_limit integer,
  regeneration_limit integer,
  quality_level text,
  max_storage integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.plan_type,
    l.major_arcana_limit,
    l.complete_deck_limit,
    l.regeneration_limit,
    l.quality_level,
    l.max_storage
  FROM 
    user_deck_usage u
    JOIN deck_generation_limits l ON u.plan_type = l.plan_type
  WHERE 
    u.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user has reached their deck generation limit
CREATE OR REPLACE FUNCTION check_deck_generation_limit(
  user_id_param uuid,
  deck_type text
)
RETURNS json AS $$
DECLARE
  user_plan text;
  user_major_arcana_generated integer;
  user_complete_decks_generated integer;
  plan_major_arcana_limit integer;
  plan_complete_deck_limit integer;
  can_generate boolean;
  result json;
BEGIN
  -- Handle null user_id (anonymous users)
  IF user_id_param IS NULL THEN
    RETURN json_build_object(
      'can_generate', false,
      'reason', 'anonymous_user',
      'limit_reached', true,
      'plan_type', 'anonymous'
    );
  END IF;

  -- Get user's current usage and plan limits
  SELECT 
    u.plan_type, 
    u.major_arcana_generated, 
    u.complete_decks_generated,
    l.major_arcana_limit,
    l.complete_deck_limit
  INTO 
    user_plan, 
    user_major_arcana_generated, 
    user_complete_decks_generated,
    plan_major_arcana_limit,
    plan_complete_deck_limit
  FROM 
    user_deck_usage u
    JOIN deck_generation_limits l ON u.plan_type = l.plan_type
  WHERE 
    u.user_id = user_id_param;
  
  -- If no record found, user might not be initialized yet
  IF user_plan IS NULL THEN
    RETURN json_build_object(
      'can_generate', false,
      'reason', 'no_user_record',
      'limit_reached', true,
      'plan_type', 'unknown'
    );
  END IF;
  
  -- Check if the user can generate the requested deck type
  IF deck_type = 'major_arcana' THEN
    can_generate := user_major_arcana_generated < plan_major_arcana_limit;
    
    result := json_build_object(
      'can_generate', can_generate,
      'reason', CASE WHEN can_generate THEN 'within_limit' ELSE 'limit_reached' END,
      'limit_reached', NOT can_generate,
      'plan_type', user_plan,
      'current_usage', user_major_arcana_generated,
      'limit', plan_major_arcana_limit,
      'remaining', GREATEST(0, plan_major_arcana_limit - user_major_arcana_generated)
    );
  ELSIF deck_type = 'complete' THEN
    can_generate := user_complete_decks_generated < plan_complete_deck_limit;
    
    result := json_build_object(
      'can_generate', can_generate,
      'reason', CASE WHEN can_generate THEN 'within_limit' ELSE 'limit_reached' END,
      'limit_reached', NOT can_generate,
      'plan_type', user_plan,
      'current_usage', user_complete_decks_generated,
      'limit', plan_complete_deck_limit,
      'remaining', GREATEST(0, plan_complete_deck_limit - user_complete_decks_generated)
    );
  ELSE
    -- Invalid deck type
    result := json_build_object(
      'can_generate', false,
      'reason', 'invalid_deck_type',
      'limit_reached', true,
      'plan_type', user_plan
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_deck_generation_limit TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_plan_limits TO authenticated;
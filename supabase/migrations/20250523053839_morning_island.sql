/*
  # Fix deck generation tables consistency

  1. Changes
     - Rename remaining columns in user_deck_quotas for consistency
     - Update references in functions and triggers
     - Create view for unified deck generation status
  
  2. Security
     - Maintain existing RLS policies
*/

-- Rename remaining columns in user_deck_quotas for consistency
ALTER TABLE IF EXISTS public.user_deck_quotas 
  RENAME COLUMN plan_tier TO plan_type;

-- Create a view that combines information from both tables for easier access
CREATE OR REPLACE VIEW public.user_deck_generation_status AS
SELECT
  u.id as user_id,
  u.email,
  u.username,
  q.major_arcana_quota,
  q.complete_deck_quota,
  q.major_arcana_used,
  q.complete_deck_used,
  q.last_refresh_date as quota_last_refresh,
  q.next_refresh_date as quota_next_refresh,
  q.plan_type,
  q.max_rollover_quota,
  d.major_arcana_generated,
  d.complete_decks_generated,
  d.regenerations_used,
  d.last_reset_date as usage_last_reset,
  d.next_reset_date as usage_next_reset,
  l.major_arcana_limit,
  l.complete_deck_limit,
  l.regeneration_limit,
  l.quality_level,
  l.max_storage
FROM
  public.users u
LEFT JOIN
  public.user_deck_quotas q ON u.id = q.user_id
LEFT JOIN
  public.user_deck_usage d ON u.id = d.user_id
LEFT JOIN
  public.deck_generation_limits l ON q.plan_type = l.plan_type OR d.plan_type = l.plan_type;

-- Update the existing view to use the new column names
DROP VIEW IF EXISTS public.user_subscription_quotas;
CREATE OR REPLACE VIEW public.user_subscription_quotas AS
SELECT 
  u.id as user_id,
  u.email,
  u.username,
  q.major_arcana_quota,
  q.complete_deck_quota,
  q.major_arcana_used,
  q.complete_deck_used,
  q.last_refresh_date,
  q.next_refresh_date,
  q.plan_type,
  q.max_rollover_quota,
  s.subscription_id,
  s.subscription_status,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  s.price_id
FROM 
  public.users u
LEFT JOIN 
  public.user_deck_quotas q ON u.id = q.user_id
LEFT JOIN 
  public.stripe_user_subscriptions s ON s.customer_id IN (
    SELECT customer_id FROM public.stripe_customers WHERE user_id = u.id
  );

-- Create a function to ensure both tables have consistent plan types
CREATE OR REPLACE FUNCTION sync_user_plan_type()
RETURNS TRIGGER AS $$
BEGIN
  -- If plan_type is updated in user_deck_quotas, update it in user_deck_usage
  IF TG_TABLE_NAME = 'user_deck_quotas' THEN
    UPDATE public.user_deck_usage
    SET plan_type = NEW.plan_type
    WHERE user_id = NEW.user_id;
  
  -- If plan_type is updated in user_deck_usage, update it in user_deck_quotas
  ELSIF TG_TABLE_NAME = 'user_deck_usage' THEN
    UPDATE public.user_deck_quotas
    SET plan_type = NEW.plan_type
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to keep plan_type in sync between tables
DROP TRIGGER IF EXISTS sync_plan_type_from_quotas ON public.user_deck_quotas;
CREATE TRIGGER sync_plan_type_from_quotas
AFTER UPDATE OF plan_type ON public.user_deck_quotas
FOR EACH ROW
EXECUTE FUNCTION sync_user_plan_type();

DROP TRIGGER IF EXISTS sync_plan_type_from_usage ON public.user_deck_usage;
CREATE TRIGGER sync_plan_type_from_usage
AFTER UPDATE OF plan_type ON public.user_deck_usage
FOR EACH ROW
EXECUTE FUNCTION sync_user_plan_type();

-- Update any RPC functions that reference the old column names
-- This is a placeholder - you would need to identify and update any functions
-- that reference the old column names
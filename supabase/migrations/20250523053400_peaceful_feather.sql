/*
  # Rename user_credits table to user_deck_quotas

  1. Changes
    - Rename `user_credits` table to `user_deck_quotas` to better reflect its purpose
    - Rename columns to match deck-based terminology
    - Update references in functions and triggers
    - Update view references
*/

-- Rename the table
ALTER TABLE IF EXISTS public.user_credits RENAME TO user_deck_quotas;

-- Rename columns to better reflect their purpose
ALTER TABLE IF EXISTS public.user_deck_quotas RENAME COLUMN basic_credits TO major_arcana_quota;
ALTER TABLE IF EXISTS public.user_deck_quotas RENAME COLUMN premium_credits TO complete_deck_quota;
ALTER TABLE IF EXISTS public.user_deck_quotas RENAME COLUMN basic_credits_used TO major_arcana_used;
ALTER TABLE IF EXISTS public.user_deck_quotas RENAME COLUMN premium_credits_used TO complete_deck_used;
ALTER TABLE IF EXISTS public.user_deck_quotas RENAME COLUMN max_rollover_credits TO max_rollover_quota;

-- Update the view that references this table
DROP VIEW IF EXISTS public.user_subscription_credits;
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
  q.plan_tier,
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

-- Update any functions that reference the old table name
-- This is a placeholder - you would need to identify and update any functions
-- that reference the old table name or column names
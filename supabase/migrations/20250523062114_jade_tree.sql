/*
# Comprehensive Database Documentation

This migration adds detailed documentation to the database schema, focusing on the deck quota system, regeneration packs, and related functionality.

1. Overview
   - The database schema supports a tarot card deck creation and marketplace application
   - Users can create, purchase, and use tarot decks for readings
   - A quota system manages how many decks users can generate based on their subscription plan
   - Regeneration packs allow users to purchase additional card regenerations

2. Key Tables
   - user_deck_quotas: Tracks user's deck generation quotas
   - user_deck_usage: Tracks actual deck generation usage
   - deck_generation_limits: Defines limits for each plan type
   - regeneration_packs: Available packs for purchasing additional regenerations
   - deck_quota_logs: Logs all quota-related transactions

3. Views
   - user_deck_generation_status: Combines quota and usage information
   - user_subscription_quotas: Links subscription data with quota information

4. Functions
   - log_deck_quota_change: Records quota changes
   - consume_user_deck_quotas: Deducts quotas when generating decks
   - purchase_regeneration_pack: Processes regeneration pack purchases
*/

-- Add comments to tables
COMMENT ON TABLE public.user_deck_quotas IS 
'Stores user deck generation quotas based on their subscription plan. Tracks both allocated quotas and usage for Major Arcana and Complete Decks.';

COMMENT ON TABLE public.user_deck_usage IS 
'Tracks actual deck generation usage statistics, including regenerations used. This complements the quota system by providing historical usage data.';

COMMENT ON TABLE public.deck_generation_limits IS 
'Defines the generation limits for each plan type, including Major Arcana, Complete Deck, and regeneration limits.';

COMMENT ON TABLE public.regeneration_packs IS 
'Available regeneration packs that users can purchase to get additional card regenerations.';

COMMENT ON TABLE public.deck_quota_logs IS 
'Logs all quota-related transactions, including allocations, consumption, expirations, and rollovers.';

-- Add comments to views
COMMENT ON VIEW public.user_deck_generation_status IS 
'Combines information from user_deck_quotas, user_deck_usage, and deck_generation_limits to provide a complete view of a user''s generation status.';

COMMENT ON VIEW public.user_subscription_quotas IS 
'Links subscription data with deck quota information to provide a complete view of a user''s subscription and quota status.';

-- Add comments to columns in user_deck_quotas
COMMENT ON COLUMN public.user_deck_quotas.major_arcana_quota IS 'Number of Major Arcana decks (22 cards) the user is allowed to generate in the current billing period.';
COMMENT ON COLUMN public.user_deck_quotas.complete_deck_quota IS 'Number of complete decks (78 cards) the user is allowed to generate in the current billing period.';
COMMENT ON COLUMN public.user_deck_quotas.major_arcana_used IS 'Number of Major Arcana decks the user has already generated in the current billing period.';
COMMENT ON COLUMN public.user_deck_quotas.complete_deck_used IS 'Number of complete decks the user has already generated in the current billing period.';
COMMENT ON COLUMN public.user_deck_quotas.plan_type IS 'The user''s subscription plan type (free, mystic, creator, visionary, explorer-plus).';
COMMENT ON COLUMN public.user_deck_quotas.last_refresh_date IS 'Date when the quotas were last refreshed.';
COMMENT ON COLUMN public.user_deck_quotas.next_refresh_date IS 'Date when the quotas will next refresh (typically at the start of the next billing period).';
COMMENT ON COLUMN public.user_deck_quotas.max_rollover_quota IS 'Maximum number of unused quotas that can roll over to the next billing period.';

-- Add comments to columns in user_deck_usage
COMMENT ON COLUMN public.user_deck_usage.major_arcana_generated IS 'Total number of Major Arcana decks generated in the current period.';
COMMENT ON COLUMN public.user_deck_usage.complete_decks_generated IS 'Total number of complete decks generated in the current period.';
COMMENT ON COLUMN public.user_deck_usage.regenerations_used IS 'Number of card regenerations used in the current period.';
COMMENT ON COLUMN public.user_deck_usage.plan_type IS 'The user''s subscription plan type, should match user_deck_quotas.plan_type.';
COMMENT ON COLUMN public.user_deck_usage.last_reset_date IS 'Date when the usage counters were last reset.';
COMMENT ON COLUMN public.user_deck_usage.next_reset_date IS 'Date when the usage counters will next reset.';

-- Add comments to columns in deck_generation_limits
COMMENT ON COLUMN public.deck_generation_limits.major_arcana_limit IS 'Maximum number of Major Arcana decks allowed for this plan type per period.';
COMMENT ON COLUMN public.deck_generation_limits.complete_deck_limit IS 'Maximum number of complete decks allowed for this plan type per period.';
COMMENT ON COLUMN public.deck_generation_limits.regeneration_limit IS 'Maximum number of card regenerations allowed for this plan type per period.';
COMMENT ON COLUMN public.deck_generation_limits.quality_level IS 'Image quality level available for this plan type (medium, high).';
COMMENT ON COLUMN public.deck_generation_limits.max_storage IS 'Maximum number of decks the user can store with this plan type.';

-- Add comments to columns in regeneration_packs
COMMENT ON COLUMN public.regeneration_packs.name IS 'Name of the regeneration pack.';
COMMENT ON COLUMN public.regeneration_packs.description IS 'Description of what the pack offers.';
COMMENT ON COLUMN public.regeneration_packs.price_id IS 'Stripe price ID for purchasing this pack.';
COMMENT ON COLUMN public.regeneration_packs.card_count IS 'Number of card regenerations included in this pack.';
COMMENT ON COLUMN public.regeneration_packs.price IS 'Price of the pack in USD.';

-- Add comments to columns in deck_quota_logs
COMMENT ON COLUMN public.deck_quota_logs.transaction_type IS 'Type of transaction: allocation (new quotas), consumption (using quotas), expiration, or rollover.';
COMMENT ON COLUMN public.deck_quota_logs.major_arcana_change IS 'Change in Major Arcana quotas (positive for additions, negative for consumption).';
COMMENT ON COLUMN public.deck_quota_logs.complete_deck_change IS 'Change in complete deck quotas (positive for additions, negative for consumption).';
COMMENT ON COLUMN public.deck_quota_logs.description IS 'Human-readable description of the transaction.';
COMMENT ON COLUMN public.deck_quota_logs.reference_id IS 'Optional reference ID for linking to related entities (e.g., deck ID, order ID).';

-- Add comments to functions
COMMENT ON FUNCTION public.log_deck_quota_change IS 
'Records changes to a user''s deck quotas in the deck_quota_logs table. Used for tracking allocations, consumption, expirations, and rollovers.';

COMMENT ON FUNCTION public.consume_user_deck_quotas IS 
'Deducts quotas from a user''s account when generating decks. Checks if the user has sufficient quotas before allowing the operation.';

COMMENT ON FUNCTION public.initialize_user_deck_quota IS 
'Initializes or updates a user''s deck quotas based on their subscription plan. Called when a user subscribes or changes plans.';

COMMENT ON FUNCTION public.fix_missing_deck_quota_record IS 
'Creates a deck quota record for a user if one doesn''t exist. Used for fixing data inconsistencies or for new users.';

COMMENT ON FUNCTION public.purchase_regeneration_pack IS 
'Processes a regeneration pack purchase, adding the pack''s regenerations to the user''s available count.';

COMMENT ON FUNCTION public.sync_user_plan_type IS 
'Keeps the plan_type field in sync between user_deck_quotas and user_deck_usage tables.';

-- Add comments to triggers
COMMENT ON TRIGGER sync_plan_type_from_quotas ON public.user_deck_quotas IS 
'Syncs plan_type changes from user_deck_quotas to user_deck_usage.';

COMMENT ON TRIGGER sync_plan_type_from_usage ON public.user_deck_usage IS 
'Syncs plan_type changes from user_deck_usage to user_deck_quotas.';

-- Add documentation for the deck-based pricing model
COMMENT ON SCHEMA public IS 
'The Tarot Forge application uses a deck-based pricing model where users are allocated quotas for generating Major Arcana decks (22 cards) and complete decks (78 cards) based on their subscription plan. 

Free users get 1 Major Arcana deck per month.
Explorer Plus users can upgrade a Major Arcana deck to a complete deck for a one-time fee.
Mystic subscribers get 2 complete decks per month.
Creator subscribers get 4 complete decks per month.
Visionary subscribers get 8 complete decks per month.

Users can also purchase regeneration packs to get additional card regenerations if they want to improve specific cards.

The quota system is implemented through the user_deck_quotas and user_deck_usage tables, with limits defined in deck_generation_limits.';
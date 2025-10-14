-- Identity resolution helper functions for Privy integration
-- These functions enable fast conversion between Privy DIDs and Supabase UUIDs

-- Function to resolve Supabase UUID from Privy DID
CREATE OR REPLACE FUNCTION public.resolve_uuid_from_privy_did(did TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT supabase_user_id
  FROM public.user_identity_mapping
  WHERE privy_did = did
  LIMIT 1;
$$;

-- Function to resolve Privy DID from Supabase UUID
CREATE OR REPLACE FUNCTION public.resolve_privy_did_from_uuid(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT privy_did
  FROM public.user_identity_mapping
  WHERE supabase_user_id = user_uuid
  LIMIT 1;
$$;

-- Function to resolve Supabase UUID from wallet address (any chain)
CREATE OR REPLACE FUNCTION public.resolve_uuid_from_wallet(wallet_address TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT supabase_user_id
  FROM public.user_identity_mapping
  WHERE wallet_solana = wallet_address
     OR wallet_base = wallet_address
  LIMIT 1;
$$;

-- Function to get user's wallet addresses
CREATE OR REPLACE FUNCTION public.get_user_wallets(user_uuid UUID)
RETURNS TABLE (
  solana_address TEXT,
  base_address TEXT,
  privy_did TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wallet_solana, wallet_base, privy_did
  FROM public.user_identity_mapping
  WHERE supabase_user_id = user_uuid
  LIMIT 1;
$$;

-- Function to check if user has embedded wallet
CREATE OR REPLACE FUNCTION public.user_has_embedded_wallet(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_identity_mapping
    WHERE supabase_user_id = user_uuid
      AND (wallet_solana IS NOT NULL OR wallet_base IS NOT NULL)
  );
$$;

-- Function to check if user's wallet is visible (Web3-aware)
CREATE OR REPLACE FUNCTION public.is_user_web3_aware(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_wallets
    WHERE user_id = user_uuid
      AND is_visible_to_user = true
    LIMIT 1
  );
$$;

-- Add function comments for documentation
COMMENT ON FUNCTION public.resolve_uuid_from_privy_did(TEXT) IS
  'Resolves Supabase UUID from Privy DID. Returns NULL if not found.';

COMMENT ON FUNCTION public.resolve_privy_did_from_uuid(UUID) IS
  'Resolves Privy DID from Supabase UUID. Returns NULL if user does not have Privy wallet.';

COMMENT ON FUNCTION public.resolve_uuid_from_wallet(TEXT) IS
  'Resolves Supabase UUID from wallet address (Solana or Base). Returns NULL if not found.';

COMMENT ON FUNCTION public.get_user_wallets(UUID) IS
  'Returns all wallet addresses for a user (Solana, Base, and Privy DID).';

COMMENT ON FUNCTION public.user_has_embedded_wallet(UUID) IS
  'Returns true if user has at least one embedded wallet (Solana or Base).';

COMMENT ON FUNCTION public.is_user_web3_aware(UUID) IS
  'Returns true if user has been shown their wallet in UI (progressive revelation).';

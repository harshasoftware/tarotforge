-- Extend user_wallets table to support Privy embedded wallets
-- These columns enable silent wallet creation and progressive Web3 revelation

-- Add Privy-related columns
ALTER TABLE public.user_wallets
  ADD COLUMN IF NOT EXISTS privy_did TEXT,
  ADD COLUMN IF NOT EXISTS is_embedded BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_visible_to_user BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'external';

-- Add check constraint for provider types
ALTER TABLE public.user_wallets
  ADD CONSTRAINT check_wallet_provider
  CHECK (provider IN ('external', 'privy_embedded', 'privy_linked'));

-- Create index for Privy DID lookups
CREATE INDEX IF NOT EXISTS idx_user_wallets_privy_did
  ON public.user_wallets(privy_did)
  WHERE privy_did IS NOT NULL;

-- Create index for embedded wallets
CREATE INDEX IF NOT EXISTS idx_user_wallets_embedded
  ON public.user_wallets(user_id, is_embedded)
  WHERE is_embedded = true;

-- Create index for visible wallets (for UI display)
CREATE INDEX IF NOT EXISTS idx_user_wallets_visible
  ON public.user_wallets(user_id, is_visible_to_user)
  WHERE is_visible_to_user = true;

-- Add comments for documentation
COMMENT ON COLUMN public.user_wallets.privy_did IS
  'Privy DID associated with this wallet. Links to user_identity_mapping.privy_did';

COMMENT ON COLUMN public.user_wallets.is_embedded IS
  'True if this is a Privy embedded wallet (keys managed by Privy). False for external wallets.';

COMMENT ON COLUMN public.user_wallets.is_visible_to_user IS
  'True if user has been shown this wallet in UI. False for silent/background wallets. Enables progressive Web3 revelation.';

COMMENT ON COLUMN public.user_wallets.auto_created_at IS
  'Timestamp when wallet was automatically created during signup. NULL for manually connected wallets.';

COMMENT ON COLUMN public.user_wallets.provider IS
  'Wallet provider type: external (Phantom, MetaMask), privy_embedded (auto-created), privy_linked (user-connected Privy wallet)';

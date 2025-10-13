-- Create user_wallets table for linking Base wallets to user accounts
-- This enables Web3 authentication and features via Sign-In with Ethereum (EIP-4361)

CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  wallet_type TEXT NOT NULL DEFAULT 'base',
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure wallet addresses are unique (one wallet per account)
  CONSTRAINT unique_wallet_address UNIQUE (wallet_address),

  -- Ensure wallet addresses are lowercase for consistency
  CONSTRAINT wallet_address_lowercase CHECK (wallet_address = LOWER(wallet_address))
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON public.user_wallets(user_id);

-- Create index for faster lookups by wallet_address
CREATE INDEX IF NOT EXISTS idx_user_wallets_wallet_address ON public.user_wallets(wallet_address);

-- Enable Row Level Security
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own linked wallets
CREATE POLICY "Users can view their own wallets"
  ON public.user_wallets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can link wallets to their own account
CREATE POLICY "Users can link wallets to their account"
  ON public.user_wallets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can unlink their own wallets
CREATE POLICY "Users can unlink their own wallets"
  ON public.user_wallets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Users can update their own wallet settings
CREATE POLICY "Users can update their own wallet settings"
  ON public.user_wallets
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER trigger_update_user_wallets_updated_at
  BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_wallets_updated_at();

-- Add helpful comments
COMMENT ON TABLE public.user_wallets IS 'Stores Base wallet addresses linked to user accounts for Web3 authentication';
COMMENT ON COLUMN public.user_wallets.wallet_address IS 'Ethereum wallet address (lowercase)';
COMMENT ON COLUMN public.user_wallets.wallet_type IS 'Type of wallet (e.g., base, ethereum)';
COMMENT ON COLUMN public.user_wallets.is_primary IS 'Whether this is the primary wallet for the user';

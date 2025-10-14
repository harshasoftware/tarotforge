-- Create user_identity_mapping table for Privy DID to Supabase UUID mapping
-- This enables fast bidirectional lookups without scanning JSONB fields

CREATE TABLE IF NOT EXISTS public.user_identity_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  privy_did TEXT NOT NULL UNIQUE,
  wallet_solana TEXT,
  wallet_base TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique indexes for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_supabase_user
  ON public.user_identity_mapping(supabase_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_privy_did
  ON public.user_identity_mapping(privy_did);

-- Create regular indexes for wallet address lookups
CREATE INDEX IF NOT EXISTS idx_identity_wallet_solana
  ON public.user_identity_mapping(wallet_solana)
  WHERE wallet_solana IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_identity_wallet_base
  ON public.user_identity_mapping(wallet_base)
  WHERE wallet_base IS NOT NULL;

-- Add RLS policies
ALTER TABLE public.user_identity_mapping ENABLE ROW LEVEL SECURITY;

-- Users can only view their own identity mapping
CREATE POLICY "Users can view their own identity mapping"
  ON public.user_identity_mapping
  FOR SELECT
  USING (supabase_user_id = auth.uid());

-- Only service role can insert/update/delete (backend only)
CREATE POLICY "Service role can manage all identity mappings"
  ON public.user_identity_mapping
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_identity_mapping_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_identity_mapping_timestamp
  BEFORE UPDATE ON public.user_identity_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_identity_mapping_timestamp();

-- Add comment for documentation
COMMENT ON TABLE public.user_identity_mapping IS
  'Maps Privy DIDs to Supabase UUIDs for silent Web3 wallet integration. Enables fast bidirectional identity resolution without JSONB scanning.';

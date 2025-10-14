-- Add Web3 wallet fields to users table
-- This migration adds support for hybrid Web2/Web3 authentication

-- Add wallet_addresses column (JSONB to store multiple wallet addresses)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS wallet_addresses JSONB DEFAULT '{}';

-- Add privy_user_id column to link with Privy authentication
ALTER TABLE users
ADD COLUMN IF NOT EXISTS privy_user_id TEXT;

-- Add nft_features_enabled flag
ALTER TABLE users
ADD COLUMN IF NOT EXISTS nft_features_enabled BOOLEAN DEFAULT FALSE;

-- Create index on privy_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_privy_user_id ON users(privy_user_id);

-- Create index on wallet_addresses for JSONB queries
CREATE INDEX IF NOT EXISTS idx_users_wallet_addresses ON users USING GIN (wallet_addresses);

-- Add comment to describe the wallet_addresses structure
COMMENT ON COLUMN users.wallet_addresses IS 'Stores wallet addresses in format: { "ethereum": "0x...", "solana": "...", "base": "0x..." }';

-- Optional: Add a function to get user by any wallet address
CREATE OR REPLACE FUNCTION get_user_by_wallet_address(wallet_addr TEXT)
RETURNS SETOF users AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM users
  WHERE wallet_addresses::text LIKE '%' || wallet_addr || '%';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a view for users with NFT features
CREATE OR REPLACE VIEW users_with_nft_features AS
SELECT
  id,
  username,
  email,
  wallet_addresses,
  privy_user_id,
  nft_features_enabled,
  created_at
FROM users
WHERE nft_features_enabled = TRUE
  AND wallet_addresses IS NOT NULL
  AND wallet_addresses != '{}'::jsonb;

-- Add RLS policies if needed (adjust based on your security requirements)
-- Allow users to read their own wallet information
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'users'
    AND policyname = 'Users can read own wallet info'
  ) THEN
    CREATE POLICY "Users can read own wallet info" ON users
      FOR SELECT
      USING (auth.uid() = id);
  END IF;
END
$$;

-- Allow users to update their own wallet information
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'users'
    AND policyname = 'Users can update own wallet info'
  ) THEN
    CREATE POLICY "Users can update own wallet info" ON users
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END
$$;

-- Grant necessary permissions
GRANT SELECT, UPDATE ON users TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_wallet_address(TEXT) TO authenticated;

COMMENT ON TABLE users IS 'User accounts with support for both Web2 (Supabase) and Web3 (Privy/wallet) authentication';

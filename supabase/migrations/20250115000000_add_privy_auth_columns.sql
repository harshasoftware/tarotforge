/*
  # Add Privy Authentication Columns

  This migration adds columns to support Privy authentication and Web3 wallets.

  ## Changes to `users` table:

  - `privy_id` (text, unique) - Privy user ID from authentication
  - `embedded_eth_wallet` (text) - Privy embedded Ethereum wallet address
  - `embedded_solana_wallet` (text) - Privy embedded Solana wallet address
  - `external_wallets` (jsonb) - Array of linked external wallets (MetaMask, Phantom, etc.)
  - `auth_method` (text) - How the user authenticated (email, google, wallet, twitter)
  - `full_name` (text) - Full name from OAuth providers

  ## Changes to `anonymous_users` table:

  - `name` (text) - Display name for guest users

  ## Indexes:

  - Index on `privy_id` for fast lookups
*/

-- Add Privy-related columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS privy_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS embedded_eth_wallet TEXT,
ADD COLUMN IF NOT EXISTS embedded_solana_wallet TEXT,
ADD COLUMN IF NOT EXISTS external_wallets JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS auth_method TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Create index on privy_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_privy_id ON users(privy_id);

-- Add name column to anonymous_users for guest display names
ALTER TABLE anonymous_users
ADD COLUMN IF NOT EXISTS name TEXT;

-- Comment on columns
COMMENT ON COLUMN users.privy_id IS 'Unique Privy user ID from authentication';
COMMENT ON COLUMN users.embedded_eth_wallet IS 'Privy embedded Ethereum/Base wallet address';
COMMENT ON COLUMN users.embedded_solana_wallet IS 'Privy embedded Solana wallet address';
COMMENT ON COLUMN users.external_wallets IS 'Array of linked external wallet addresses and types';
COMMENT ON COLUMN users.auth_method IS 'Primary authentication method: email, google, wallet, twitter';
COMMENT ON COLUMN users.full_name IS 'Full name from OAuth providers or user input';
COMMENT ON COLUMN anonymous_users.name IS 'Display name for guest users';

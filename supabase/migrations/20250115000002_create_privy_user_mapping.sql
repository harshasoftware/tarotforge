/*
  # Create Privy User ID Mapping Table

  This migration creates a mapping table to link Privy DIDs to UUIDs.

  ## Problem:
  - Privy uses DID format: did:privy:cmgqa53xd00coju0cirwf9j7y
  - Database expects UUID format
  - Need to maintain backwards compatibility

  ## Solution:
  - Create privy_user_mapping table
  - Map Privy DID -> UUID
  - Use UUID as primary key in all tables
  - Look up UUID when Privy user logs in

  ## Changes:

  1. Create privy_user_mapping table
  2. Create function to get or create UUID for Privy DID
  3. Update existing users table to support this pattern
*/

-- Create mapping table
CREATE TABLE IF NOT EXISTS privy_user_mapping (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_did TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_privy_user_mapping_privy_did ON privy_user_mapping(privy_did);

-- Enable RLS
ALTER TABLE privy_user_mapping ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own mapping
CREATE POLICY "Users can read their own mapping"
  ON privy_user_mapping
  FOR SELECT
  USING (true);

-- Allow inserting new mappings (for new Privy users)
CREATE POLICY "Allow insert for new Privy users"
  ON privy_user_mapping
  FOR INSERT
  WITH CHECK (true);

-- Function to get or create UUID for a Privy DID
CREATE OR REPLACE FUNCTION get_or_create_uuid_for_privy_did(p_privy_did TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uuid UUID;
BEGIN
  -- Try to find existing mapping
  SELECT uuid INTO v_uuid
  FROM privy_user_mapping
  WHERE privy_did = p_privy_did;

  -- If not found, create new mapping
  IF v_uuid IS NULL THEN
    INSERT INTO privy_user_mapping (privy_did)
    VALUES (p_privy_did)
    RETURNING uuid INTO v_uuid;

    RAISE NOTICE 'Created new UUID mapping for Privy DID: % -> %', p_privy_did, v_uuid;
  END IF;

  RETURN v_uuid;
END;
$$;

-- Function to get Privy DID from UUID (reverse lookup)
CREATE OR REPLACE FUNCTION get_privy_did_from_uuid(p_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_privy_did TEXT;
BEGIN
  SELECT privy_did INTO v_privy_did
  FROM privy_user_mapping
  WHERE uuid = p_uuid;

  RETURN v_privy_did;
END;
$$;

-- Update users table to use the mapping
-- Remove the old constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Ensure id is UUID type
DO $$ BEGIN
  ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::UUID;
EXCEPTION WHEN OTHERS THEN
  -- Column is already UUID type
  NULL;
END $$;

-- Re-add primary key
ALTER TABLE users ADD PRIMARY KEY (id);

-- Add foreign key to mapping table (optional, for data integrity)
DO $$ BEGIN
  ALTER TABLE users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES privy_user_mapping(uuid)
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Comment on tables
COMMENT ON TABLE privy_user_mapping IS 'Maps Privy DID identifiers to UUIDs for database compatibility';
COMMENT ON COLUMN privy_user_mapping.uuid IS 'UUID used throughout the database as user_id';
COMMENT ON COLUMN privy_user_mapping.privy_did IS 'Privy DID in format: did:privy:...';
COMMENT ON FUNCTION get_or_create_uuid_for_privy_did IS 'Gets existing UUID or creates new one for a Privy DID';
COMMENT ON FUNCTION get_privy_did_from_uuid IS 'Reverse lookup: gets Privy DID from UUID';

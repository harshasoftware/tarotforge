/*
  # Create decks table with anonymous user support
  
  1. New Tables
    - `decks` 
      - `id` (uuid, primary key)
      - `creator_id` (uuid)
      - `title` (text)
      - `description` (text)
      - `theme` (text)
      - `style` (text)
      - `card_count` (integer)
      - `price` (numeric)
      - `is_free` (boolean)
      - `is_nft` (boolean)
      - `cover_image` (text)
      - `sample_images` (text[])
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `is_public` (boolean)
      - `purchase_count` (integer)
      - `rating` (numeric)
      - `nft_address` (text)
  
  2. Security
    - Enable RLS on `decks` table
    - Add policies for authenticated and anonymous users
    - Create trigger for updated_at timestamp
*/

-- Create the decks table
CREATE TABLE IF NOT EXISTS decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  theme text NOT NULL,
  style text NOT NULL,
  card_count integer NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  is_nft boolean NOT NULL DEFAULT false,
  cover_image text NOT NULL,
  sample_images text[] DEFAULT array[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_public boolean DEFAULT true,
  purchase_count integer DEFAULT 0,
  rating numeric,
  nft_address text
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS decks_creator_id_idx ON decks(creator_id);
CREATE INDEX IF NOT EXISTS decks_is_public_idx ON decks(is_public);
CREATE INDEX IF NOT EXISTS decks_is_free_idx ON decks(is_free);

-- Create trigger function to validate creator_id
CREATE OR REPLACE FUNCTION validate_deck_creator()
RETURNS TRIGGER AS $$
DECLARE
  user_exists BOOLEAN;
  anon_exists BOOLEAN;
BEGIN
  -- Check if creator exists in users table
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = NEW.creator_id
  ) INTO user_exists;
  
  -- Check if creator exists in anonymous_users table
  SELECT EXISTS (
    SELECT 1 FROM anonymous_users WHERE id = NEW.creator_id
  ) INTO anon_exists;

  -- If creator doesn't exist in either table, raise an error
  IF NOT (user_exists OR anon_exists) THEN
    RAISE EXCEPTION 'Creator ID must exist in users or anonymous_users table';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate creator_id on insert and update
CREATE TRIGGER validate_deck_creator
  BEFORE INSERT OR UPDATE ON decks
  FOR EACH ROW
  EXECUTE FUNCTION validate_deck_creator();

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update the updated_at column
CREATE TRIGGER update_decks_updated_at
  BEFORE UPDATE ON decks
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

-- Policy for anyone to read public decks
CREATE POLICY "Anyone can read public decks"
  ON decks
  FOR SELECT
  USING (is_public = true);

-- Policy for users to read their own decks even if not public
CREATE POLICY "Users can read owned decks"
  ON decks
  FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

-- Policy for anonymous users to read decks they created
CREATE POLICY "Anonymous users can read decks they created"
  ON decks
  FOR SELECT
  TO anon
  USING (creator_id IN (SELECT id FROM anonymous_users));

-- Policy for users to create decks
CREATE POLICY "Users can create decks"
  ON decks
  FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Policy for anonymous users to create decks
CREATE POLICY "Anonymous users can create decks"
  ON decks
  FOR INSERT
  TO anon
  WITH CHECK (creator_id IN (SELECT id FROM anonymous_users));

-- Policy for users to update their own decks
CREATE POLICY "Users can update own decks"
  ON decks
  FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid());

-- Policy for anonymous users to update decks they created
CREATE POLICY "Anonymous users can update decks they created"
  ON decks
  FOR UPDATE
  TO anon
  USING (creator_id IN (SELECT id FROM anonymous_users));

-- Policy for users to delete their own decks
CREATE POLICY "Users can delete own decks"
  ON decks
  FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- Policy for anonymous users to delete decks they created
CREATE POLICY "Anonymous users can delete decks they created"
  ON decks
  FOR DELETE
  TO anon
  USING (creator_id IN (SELECT id FROM anonymous_users));
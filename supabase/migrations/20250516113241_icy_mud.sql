/*
  # Cards and Readings Tables

  1. New Tables
    - `cards`: Stores all card data for tarot decks
      - `id` (uuid, primary key)
      - `deck_id` (uuid, references decks)
      - `name` (text)
      - `description` (text)
      - `image_url` (text)
      - `card_type` (text)
      - `suit` (text, nullable)
      - `keywords` (text array)
      - `order` (integer)
      - `created_at` (timestamp)
    
    - `readings`: Stores saved tarot readings
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `deck_id` (uuid, references decks)
      - `reader_id` (uuid, nullable)
      - `layout` (text)
      - `question` (text, nullable)
      - `cards` (jsonb)
      - `interpretation` (text, nullable)
      - `created_at` (timestamp)
      - `is_public` (boolean)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated and anonymous users
    - Create validation function for user_id in readings table
*/

-- Create cards table
CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text NOT NULL,
  card_type text NOT NULL CHECK (card_type IN ('major', 'minor')),
  suit text CHECK (suit IN ('wands', 'cups', 'swords', 'pentacles') OR suit IS NULL),
  keywords text[] DEFAULT array[]::text[],
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS cards_deck_id_idx ON cards(deck_id);
CREATE INDEX IF NOT EXISTS cards_order_idx ON cards("order");

-- Enable Row Level Security
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Policy for anyone to read cards from public decks
CREATE POLICY "Anyone can read cards from public decks"
  ON cards
  FOR SELECT
  USING (deck_id IN (
    SELECT id FROM decks WHERE is_public = true
  ));

-- Policy for authenticated users to read their own cards
CREATE POLICY "Users can read their own cards"
  ON cards
  FOR SELECT
  TO authenticated
  USING (deck_id IN (
    SELECT id FROM decks WHERE creator_id = auth.uid()
  ));

-- Policy for anonymous users to read their own cards
CREATE POLICY "Anonymous users can read their own cards"
  ON cards
  FOR SELECT
  TO anon
  USING (deck_id IN (
    SELECT id FROM decks WHERE creator_id IN (
      SELECT id FROM anonymous_users
    )
  ));

-- Policy for authenticated users to create cards in their decks
CREATE POLICY "Users can create cards for their decks"
  ON cards
  FOR INSERT
  TO authenticated
  WITH CHECK (deck_id IN (
    SELECT id FROM decks WHERE creator_id = auth.uid()
  ));

-- Policy for anonymous users to create cards in their decks
CREATE POLICY "Anonymous users can create cards for their decks"
  ON cards
  FOR INSERT
  TO anon
  WITH CHECK (deck_id IN (
    SELECT id FROM decks WHERE creator_id IN (
      SELECT id FROM anonymous_users
    )
  ));

-- Policy for authenticated users to update their cards
CREATE POLICY "Users can update their cards"
  ON cards
  FOR UPDATE
  TO authenticated
  USING (deck_id IN (
    SELECT id FROM decks WHERE creator_id = auth.uid()
  ));

-- Policy for anonymous users to update their cards
CREATE POLICY "Anonymous users can update their cards"
  ON cards
  FOR UPDATE
  TO anon
  USING (deck_id IN (
    SELECT id FROM decks WHERE creator_id IN (
      SELECT id FROM anonymous_users
    )
  ));

-- Policy for authenticated users to delete their cards
CREATE POLICY "Users can delete their cards"
  ON cards
  FOR DELETE
  TO authenticated
  USING (deck_id IN (
    SELECT id FROM decks WHERE creator_id = auth.uid()
  ));

-- Policy for anonymous users to delete their cards
CREATE POLICY "Anonymous users can delete their cards"
  ON cards
  FOR DELETE
  TO anon
  USING (deck_id IN (
    SELECT id FROM decks WHERE creator_id IN (
      SELECT id FROM anonymous_users
    )
  ));

-- Create readings table for saved readings
CREATE TABLE IF NOT EXISTS readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  reader_id uuid,
  layout text NOT NULL,
  question text,
  cards jsonb NOT NULL,
  interpretation text,
  created_at timestamptz DEFAULT now(),
  is_public boolean DEFAULT false
);

-- Create a function to validate reading user_id
CREATE OR REPLACE FUNCTION validate_reading_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user_id exists in either users or anonymous_users table
  IF EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id) OR 
     EXISTS (SELECT 1 FROM anonymous_users WHERE id = NEW.user_id) THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid user_id: % - must exist in users or anonymous_users', NEW.user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate user_id before insert/update
CREATE TRIGGER check_reading_user_id
  BEFORE INSERT OR UPDATE ON readings
  FOR EACH ROW
  EXECUTE FUNCTION validate_reading_user_id();

-- Enable Row Level Security
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own readings
CREATE POLICY "Users can read their own readings"
  ON readings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy for anonymous users to read their own readings
CREATE POLICY "Anonymous users can read their own readings"
  ON readings
  FOR SELECT
  TO anon
  USING (user_id IN (SELECT id FROM anonymous_users));

-- Policy for users to create readings
CREATE POLICY "Users can create readings"
  ON readings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy for anonymous users to create readings
CREATE POLICY "Anonymous users can create readings"
  ON readings
  FOR INSERT
  TO anon
  WITH CHECK (user_id IN (SELECT id FROM anonymous_users));

-- Policy for users to update their own readings
CREATE POLICY "Users can update their own readings"
  ON readings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Policy for anonymous users to update their own readings
CREATE POLICY "Anonymous users can update their own readings"
  ON readings
  FOR UPDATE
  TO anon
  USING (user_id IN (SELECT id FROM anonymous_users));

-- Policy for users to delete their own readings
CREATE POLICY "Users can delete their own readings"
  ON readings
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policy for anonymous users to delete their own readings
CREATE POLICY "Anonymous users can delete their own readings"
  ON readings
  FOR DELETE
  TO anon
  USING (user_id IN (SELECT id FROM anonymous_users));
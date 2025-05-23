/*
  # Regeneration Packs Implementation

  1. New Tables
    - `regeneration_packs` - Stores available regeneration pack options
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `price_id` (text)
      - `card_count` (integer)
      - `price` (numeric)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `regeneration_packs` table
    - Add policy for public read access

  3. Functions
    - `purchase_regeneration_pack` - Processes a regeneration pack purchase
*/

-- Create regeneration packs table
CREATE TABLE IF NOT EXISTS public.regeneration_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price_id text NOT NULL,
  card_count integer NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Insert the regeneration packs
INSERT INTO public.regeneration_packs (name, description, price_id, card_count, price)
VALUES 
  ('Regeneration Pack', '5 card regenerations', 'price_1RRnXYCzE3rkgdDI7mTrvBNx', 5, 0.99),
  ('Regeneration Super Pack', '12 card regenerations', 'price_1RRnYfCzE3rkgdDIsi9OK25B', 12, 1.99),
  ('Regeneration Mega Pack', '30 card regenerations', 'price_1RRnZkCzE3rkgdDI8h3vRURO', 30, 2.99);

-- Enable RLS
ALTER TABLE public.regeneration_packs ENABLE ROW LEVEL SECURITY;

-- Create policy for public to read regeneration packs
CREATE POLICY "Anyone can read regeneration packs" 
  ON public.regeneration_packs 
  FOR SELECT 
  TO public 
  USING (true);

-- Create function to purchase regeneration pack
CREATE OR REPLACE FUNCTION purchase_regeneration_pack(
  p_user_id UUID,
  p_pack_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pack_card_count INTEGER;
  v_current_regenerations INTEGER;
  v_regeneration_limit INTEGER;
BEGIN
  -- Get the pack card count
  SELECT card_count INTO v_pack_card_count
  FROM regeneration_packs
  WHERE id = p_pack_id;
  
  IF v_pack_card_count IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get current regeneration count and limit
  SELECT 
    u.regenerations_used,
    l.regeneration_limit
  INTO 
    v_current_regenerations,
    v_regeneration_limit
  FROM 
    user_deck_usage u
  JOIN 
    deck_generation_limits l ON u.plan_type = l.plan_type
  WHERE 
    u.user_id = p_user_id;
  
  -- Update the regeneration count
  UPDATE user_deck_usage
  SET regenerations_used = GREATEST(0, regenerations_used - v_pack_card_count)
  WHERE user_id = p_user_id;
  
  -- Log the regeneration pack purchase
  PERFORM log_deck_quota_change(
    p_user_id,
    0, -- No change to major arcana
    0, -- No change to complete decks
    'Purchased regeneration pack with ' || v_pack_card_count || ' regenerations',
    p_pack_id::text,
    'allocation'
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;
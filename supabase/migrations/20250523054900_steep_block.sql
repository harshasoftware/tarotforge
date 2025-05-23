/*
  # Create deck quota log table

  1. New Tables
    - `deck_quota_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `transaction_type` (text)
      - `major_arcana_change` (integer)
      - `complete_deck_change` (integer)
      - `description` (text)
      - `reference_id` (text, optional)
      - `created_at` (timestamp with time zone)
  2. Security
    - Enable RLS on `deck_quota_logs` table
    - Add policy for users to view their own logs
*/

-- Create the deck_quota_logs table to replace credit_transactions
CREATE TABLE IF NOT EXISTS public.deck_quota_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('allocation', 'consumption', 'expiration', 'rollover')),
  major_arcana_change integer NOT NULL,
  complete_deck_change integer NOT NULL,
  description text NOT NULL,
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.deck_quota_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own logs
CREATE POLICY "Users can view their own deck quota logs"
  ON public.deck_quota_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for system to manage logs
CREATE POLICY "System can manage all deck quota logs"
  ON public.deck_quota_logs
  USING (true)
  WITH CHECK (true);

-- Create function to log deck quota changes
CREATE OR REPLACE FUNCTION log_deck_quota_change(
  p_user_id UUID,
  p_major_arcana_change INTEGER,
  p_complete_deck_change INTEGER,
  p_description TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_transaction_type TEXT DEFAULT 'allocation'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert the log entry
  INSERT INTO public.deck_quota_logs (
    user_id,
    transaction_type,
    major_arcana_change,
    complete_deck_change,
    description,
    reference_id
  ) VALUES (
    p_user_id,
    p_transaction_type,
    p_major_arcana_change,
    p_complete_deck_change,
    p_description,
    p_reference_id
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Create function to get recent deck quota logs
CREATE OR REPLACE FUNCTION get_deck_quota_logs(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS SETOF deck_quota_logs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.deck_quota_logs
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$;
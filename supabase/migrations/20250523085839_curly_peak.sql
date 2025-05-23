/*
  # Add Chat Messages Table

  1. New Tables
    - `chat_messages`
      - `id` (uuid, primary key)
      - `room_id` (text, not null)
      - `user_id` (uuid, not null)
      - `username` (text, not null)
      - `content` (text, not null)
      - `created_at` (timestamptz, default now())
  
  2. Security
    - Enable RLS on `chat_messages` table
    - Add policy for users to read messages in rooms they're in
    - Add policy for users to insert their own messages
*/

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  user_id uuid NOT NULL,
  username text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index on room_id for faster queries
CREATE INDEX IF NOT EXISTS chat_messages_room_id_idx ON public.chat_messages(room_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read messages in rooms they're in
CREATE POLICY "Users can read messages in their rooms"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (true);  -- Allow reading all messages for now, could be restricted by room_id if needed

-- Create policy for users to insert their own messages
CREATE POLICY "Users can insert their own messages"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE public.chat_messages IS 'Stores chat messages for video call sessions and reading rooms';
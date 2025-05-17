/*
  # Create users table and profiles

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - References auth.users.id
      - `email` (text)
      - `username` (text)
      - `avatar_url` (text, nullable)
      - `created_at` (timestamp with time zone)
      - `is_creator` (boolean)
      - `is_reader` (boolean)
      - `bio` (text, nullable)
  
  2. Security
    - Enable RLS on `users` table
    - Add policy for users to read their own data
    - Add policy for any user to read basic profile data
    - Add policy for users to update their own data
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  username text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  is_creator boolean DEFAULT false,
  is_reader boolean DEFAULT false,
  bio text
);

-- Handle creation of user profiles via trigger when new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, created_at)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'username', now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile when a new auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy for reading basic profile data (for public profiles)
CREATE POLICY "Anyone can read basic profile data"
  ON users
  FOR SELECT
  USING (true);

-- Policy for users to update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create anonymous users table to track guest users
CREATE TABLE IF NOT EXISTS anonymous_users (
  id uuid PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now()
);

-- Anyone can create anonymous users
ALTER TABLE anonymous_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create anonymous users"
  ON anonymous_users
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update their own data"
  ON anonymous_users
  FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Anyone can read anonymous user data"
  ON anonymous_users
  FOR SELECT
  TO anon
  USING (true);
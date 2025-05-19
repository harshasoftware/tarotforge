/*
  # Add Reader Certificates Table

  1. New Tables
    - `reader_certificates` - Stores shareable tarot reader certification information
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `certificate_url` (text)
      - `level_name` (text)
      - `certification_id` (text)
      - `score` (numeric)
      - `username` (text)
      - `certification_date` (timestamp with time zone)
      - `metadata` (jsonb)
      - `created_at` (timestamp with time zone)

  2. Security 
    - Enable RLS on the new table
    - Add policies for reading and creating certificates
*/

-- Create the reader certificates table
CREATE TABLE IF NOT EXISTS reader_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_url text NOT NULL,
  level_name text NOT NULL,
  certification_id text NOT NULL,
  score numeric NOT NULL CHECK (score >= 0 AND score <= 100),
  username text NOT NULL,
  certification_date timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS reader_certificates_user_id_idx ON reader_certificates(user_id);

-- Enable Row Level Security
ALTER TABLE reader_certificates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own certificates
CREATE POLICY "Users can read their own certificates"
  ON reader_certificates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow anyone to read certificates when viewing the certificate page
CREATE POLICY "Public can read certificates" 
  ON reader_certificates
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to create their own certificates
CREATE POLICY "Users can create their own certificates"
  ON reader_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
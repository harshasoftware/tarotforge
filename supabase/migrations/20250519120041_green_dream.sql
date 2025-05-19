/*
  # Create avatars storage bucket

  1. Create avatars bucket
    - Ensure bucket exists for storing user profile images
  
  2. Security
    - Add bucket policy for authenticated and anonymous users
    - Set up RLS policy to allow users to manage their own avatars
*/

-- Create the bucket if it doesn't exist
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Security for authenticated users
CREATE POLICY "Allow authenticated users to upload their own avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow authenticated users to update their own avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow authenticated users to delete their own avatars" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow authenticated users to read their own avatars" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Public read access for avatars
CREATE POLICY "Allow public to read all avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Ensure bio field exists on users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.users ADD COLUMN bio text;
  END IF;
END $$;
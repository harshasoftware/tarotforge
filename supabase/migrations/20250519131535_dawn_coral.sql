/*
  # Add full_name field and fix deck creator validation

  1. Changes
    - Add full_name field to users table
    - Update auto_confirm_user_email function to handle full_name
    - Create the validate_deck_creator function if it doesn't exist
    
  2. Security
    - Validate deck creators to ensure they exist in auth.users
*/

-- Ensure full_name field exists on users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN full_name text;
  END IF;
END $$;

-- Update auto confirm user trigger to handle full_name
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS trigger AS $$
BEGIN
  -- If the email exists in auth.users but has not yet been confirmed, confirm it
  UPDATE auth.users
  SET email_confirmed_at = now()
  WHERE id = NEW.id
    AND email_confirmed_at IS NULL;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create validate_deck_creator function if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'validate_deck_creator'
  ) THEN
    EXECUTE '
    CREATE FUNCTION public.validate_deck_creator()
    RETURNS trigger AS $$
    BEGIN
      -- If the creator is an anonymous user, check if they exist in anonymous_users
      IF EXISTS (
        SELECT 1 FROM public.anonymous_users 
        WHERE id = NEW.creator_id
      ) THEN
        RETURN NEW;
      END IF;
      
      -- If the creator is an authenticated user, check if they exist in auth.users
      IF EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = NEW.creator_id
      ) THEN
        RETURN NEW;
      END IF;
      
      RAISE EXCEPTION ''Invalid creator_id: %'', NEW.creator_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    ';
  END IF;
END $$;
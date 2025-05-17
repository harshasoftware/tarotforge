/*
  # Auto-confirm user emails for testing

  1. New Function
    - Creates a server-side function that can be called to automatically confirm emails
    - Uses the supabase_auth schema which has the proper permissions

  Note: This is intended for development/testing. In production, you would typically
  want users to actually verify their email addresses for security reasons.
*/

-- Create a function in the public schema that can be called to confirm a user's email
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be triggered after a new user is inserted into public.users
  
  UPDATE auth.users
  SET email_confirmed_at = NOW(), 
      updated_at = NOW()
  WHERE id = NEW.id
  AND email_confirmed_at IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-confirm emails when a new user is added to public.users
DROP TRIGGER IF EXISTS trigger_auto_confirm_user_email ON public.users;
CREATE TRIGGER trigger_auto_confirm_user_email
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user_email();

-- Create a function that can be manually called to confirm emails for existing users
CREATE OR REPLACE FUNCTION public.confirm_user_email(user_id uuid)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN;
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = user_id
  AND email_confirmed_at IS NULL;
  
  GET DIAGNOSTICS success = ROW_COUNT;
  RETURN success > 0;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
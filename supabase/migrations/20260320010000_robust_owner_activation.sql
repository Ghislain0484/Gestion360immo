-- =============================================================================
-- ROBUST OWNER ACTIVATION & USER SYNC
-- fixes "Database error saving new user" by making triggers more resilient
-- =============================================================================

-- 1. Function to handle owner registration (REFINED)
CREATE OR REPLACE FUNCTION public.handle_owner_registration()
RETURNS TRIGGER AS $$
BEGIN
  -- We wrap this in a sub-transaction block to prevent failures from rolling back the Auth insert
  BEGIN
    UPDATE public.owners
    SET user_id = NEW.id
    WHERE email = NEW.email;
  EXCEPTION WHEN OTHERS THEN
    -- Log error to a custom table or just ignore to allow Auth signup to proceed
    RAISE WARNING 'Error linking owner for %: %', NEW.email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to sync auth.users to public.users (NEW)
-- This ensures that every signed-up user has a profile in the public schema
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, is_active)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Setup Triggers on auth.users
-- Ensure owner registration trigger is robust
DROP TRIGGER IF EXISTS on_auth_user_created_for_owner ON auth.users;
CREATE TRIGGER on_auth_user_created_for_owner
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_owner_registration();

-- Ensure public.users sync trigger is present
DROP TRIGGER IF EXISTS on_auth_user_created_sync_public_users ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_public_users
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

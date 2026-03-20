-- Create a function to handle owner registration auto-matching
CREATE OR REPLACE FUNCTION public.handle_owner_registration()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the matching email exists in the owners table
  UPDATE public.owners
  SET user_id = NEW.id
  WHERE email = NEW.email;
  
  -- Supabase triggers usually need to return the NEW record
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it already exists
DROP TRIGGER IF EXISTS on_auth_user_created_for_owner ON auth.users;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created_for_owner
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_owner_registration();

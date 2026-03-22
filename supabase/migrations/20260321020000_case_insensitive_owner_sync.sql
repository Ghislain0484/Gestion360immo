-- ========================================================
-- DEFINITIVE FIX: CASE-INSENSITIVE OWNER MATCHING
-- ========================================================

-- Update the handle_owner_registration function to be case-insensitive
CREATE OR REPLACE FUNCTION public.handle_owner_registration()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    -- Use LOWER() on both sides to ensure matching regardless of case
    UPDATE public.owners
    SET user_id = NEW.id
    WHERE LOWER(email) = LOWER(NEW.email);
    
    RAISE LOG 'Linked owner for email % (new ID %)', NEW.email, NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error linking owner for %: %', NEW.email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- No need to recreate the trigger, it already calls this function.
-- But for good measure:
DROP TRIGGER IF EXISTS on_auth_user_created_for_owner ON auth.users;
CREATE TRIGGER on_auth_user_created_for_owner
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_owner_registration();

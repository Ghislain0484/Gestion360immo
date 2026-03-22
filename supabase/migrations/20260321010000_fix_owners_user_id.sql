-- ==========================================
-- FIX: ADD user_id COLUMN TO owners TABLE
-- ==========================================

-- 1. Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owners' AND column_name = 'user_id') THEN
        ALTER TABLE public.owners ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Add index for performance
CREATE INDEX IF NOT EXISTS idx_owners_user_id ON public.owners(user_id);

-- 3. Ensure the trigger function from previous migration is definitely correct
-- (Re-applying the refined version to be sure)
CREATE OR REPLACE FUNCTION public.handle_owner_registration()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    UPDATE public.owners
    SET user_id = NEW.id
    WHERE email = NEW.email;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error linking owner for %: %', NEW.email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

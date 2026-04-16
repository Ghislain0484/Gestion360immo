-- Migration to handle automated user record creation in public.users when a new auth user is created
-- This replaces the manual client-side upsert that violates RLS policies.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    is_active,
    permissions,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    TRUE,
    COALESCE(NEW.raw_user_meta_data->'permissions', '{"dashboard":true,"properties":true,"owners":true,"tenants":true,"contracts":true,"collaboration":true,"caisse":true,"reports":true,"notifications":true,"settings":true,"userManagement":true}'::jsonb),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    first_name = CASE WHEN EXCLUDED.first_name <> '' THEN EXCLUDED.first_name ELSE public.users.first_name END,
    last_name = CASE WHEN EXCLUDED.last_name <> '' THEN EXCLUDED.last_name ELSE public.users.last_name END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Policy for agency_registration_requests
-- Allows newly created users (authenticated) to insert their registration request
ALTER TABLE public.agency_registration_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated insert registration requests" ON public.agency_registration_requests;
CREATE POLICY "Allow authenticated insert registration requests" 
ON public.agency_registration_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = director_auth_user_id);

-- Also allow users to view their own requests
DROP POLICY IF EXISTS "Allow users to view their own requests" ON public.agency_registration_requests;
CREATE POLICY "Allow users to view their own requests" 
ON public.agency_registration_requests 
FOR SELECT 
TO authenticated 
USING (auth.uid() = director_auth_user_id);

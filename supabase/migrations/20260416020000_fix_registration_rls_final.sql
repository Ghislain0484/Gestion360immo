-- Final fix for RLS policy on agency_registration_requests
-- Allowing 'anon' to insert ensures registration works even if session is not yet active

-- 1. Ensure RLS is enabled
ALTER TABLE public.agency_registration_requests ENABLE ROW LEVEL SECURITY;

-- 2. Update INSERT policy to be more permissive for registration
DROP POLICY IF EXISTS "Allow authenticated insert registration requests" ON public.agency_registration_requests;
DROP POLICY IF EXISTS "Allow public insert registration requests" ON public.agency_registration_requests;

CREATE POLICY "Allow public insert registration requests" 
ON public.agency_registration_requests 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- 3. Keep SELECT restricted to the user themselves (if they eventually log in) or admins
DROP POLICY IF EXISTS "Allow users to view their own requests" ON public.agency_registration_requests;
CREATE POLICY "Allow users to view their own requests" 
ON public.agency_registration_requests 
FOR SELECT 
TO authenticated 
USING (auth.uid() = director_auth_user_id);

-- Note: Admins can view all requests usually via a separate policy or by being superusers.
-- Adding a platform admin policy just in case.
DROP POLICY IF EXISTS "Allow platform admins to view all requests" ON public.agency_registration_requests;
CREATE POLICY "Allow platform admins to view all requests" 
ON public.agency_registration_requests 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.platform_admins 
    WHERE public.platform_admins.user_id = auth.uid()
  )
);

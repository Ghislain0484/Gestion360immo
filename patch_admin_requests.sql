-- ==============================================================================
-- PATCH DE SÉCURITÉ GESTION360 : ACCÈS ADMIN AUX DEMANDES D'AGENCE
-- Exécutez ce code dans le SQL Editor de Supabase pour restaurer l'affichage
-- des demandes d'agence dans le tableau de bord Admin.
-- ==============================================================================

-- 1. On s'assure que les administrateurs peuvent lire la table platform_admins
DROP POLICY IF EXISTS "Admins can read platform_admins" ON public.platform_admins;
CREATE POLICY "Admins can read platform_admins"
ON public.platform_admins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. On corrige la politique d'accès aux demandes d'inscription pour utiliser la vérification directe
DROP POLICY IF EXISTS "Allow platform admins to view all requests" ON public.agency_registration_requests;
CREATE POLICY "Allow platform admins to view all requests" 
ON public.agency_registration_requests 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.platform_admins 
    WHERE user_id = auth.uid()
  )
);

-- 3. On s'assure que les demandes sont bien consultables par l'Admin même si le rôle n'a pas été actualisé
DROP POLICY IF EXISTS "Fallback admin view" ON public.agency_registration_requests;
CREATE POLICY "Fallback admin view" 
ON public.agency_registration_requests 
FOR SELECT 
TO authenticated 
USING (
  auth.email() IN (
    SELECT email FROM public.users u JOIN public.platform_admins pa ON pa.user_id = u.id
  )
  OR
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);

SELECT '✅ Patch appliqué avec succès' as statut;

-- Vérification et correction des permissions RLS pour la table agencies
-- Date: 2026-02-07

-- 1. Vérifier les politiques RLS existantes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'agencies';

-- 2. Désactiver temporairement RLS pour tester (ATTENTION: à réactiver après)
-- ALTER TABLE agencies DISABLE ROW LEVEL SECURITY;

-- 3. Ou créer une politique permissive pour les admins
DO $$ 
BEGIN
    -- Supprimer les anciennes politiques si elles existent
    DROP POLICY IF EXISTS "Allow admin full access to agencies" ON agencies;
    DROP POLICY IF EXISTS "Allow authenticated users to read agencies" ON agencies;
    DROP POLICY IF EXISTS "Allow agency directors to update their agency" ON agencies;
    
    -- Politique pour lecture (tous les utilisateurs authentifiés)
    CREATE POLICY "Allow authenticated users to read agencies"
        ON agencies
        FOR SELECT
        TO authenticated
        USING (true);
    
    -- Politique pour mise à jour (admins de plateforme)
    CREATE POLICY "Allow platform admins to update agencies"
        ON agencies
        FOR UPDATE
        TO authenticated
        USING (
            -- Vérifier si l'utilisateur est un admin de plateforme
            EXISTS (
                SELECT 1 FROM platform_admins
                WHERE user_id = auth.uid()
                AND is_active = true
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM platform_admins
                WHERE user_id = auth.uid()
                AND is_active = true
            )
        );
    
    -- Politique pour insertion (admins de plateforme)
    CREATE POLICY "Allow platform admins to insert agencies"
        ON agencies
        FOR INSERT
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM platform_admins
                WHERE user_id = auth.uid()
                AND is_active = true
            )
        );
    
    -- Politique pour suppression (admins de plateforme)
    CREATE POLICY "Allow platform admins to delete agencies"
        ON agencies
        FOR DELETE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM platform_admins
                WHERE user_id = auth.uid()
                AND is_active = true
            )
        );
END $$;

-- 4. Activer RLS si ce n'est pas déjà fait
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- 5. Vérifier que l'utilisateur actuel est bien un admin
SELECT 
    pa.user_id,
    pa.role,
    pa.is_active,
    u.email
FROM platform_admins pa
JOIN auth.users u ON u.id = pa.user_id
WHERE pa.is_active = true;

-- 6. Test de mise à jour
-- Remplacez 'AGENCY_ID_HERE' par un vrai ID d'agence
-- UPDATE agencies 
-- SET subscription_status = 'suspended'
-- WHERE id = 'AGENCY_ID_HERE'
-- RETURNING *;

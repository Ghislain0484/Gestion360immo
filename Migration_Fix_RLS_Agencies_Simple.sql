-- Script simplifié pour corriger les permissions RLS sur agencies
-- À exécuter dans l'éditeur SQL de Supabase
-- Date: 2026-02-07

-- Étape 1: Supprimer toutes les politiques existantes sur agencies
DROP POLICY IF EXISTS "Allow admin full access to agencies" ON agencies;
DROP POLICY IF EXISTS "Allow authenticated users to read agencies" ON agencies;
DROP POLICY IF EXISTS "Allow agency directors to update their agency" ON agencies;
DROP POLICY IF EXISTS "Allow platform admins to update agencies" ON agencies;
DROP POLICY IF EXISTS "Allow platform admins to insert agencies" ON agencies;
DROP POLICY IF EXISTS "Allow platform admins to delete agencies" ON agencies;

-- Étape 2: Créer des politiques permissives pour les admins de plateforme

-- Lecture (tous les utilisateurs authentifiés)
CREATE POLICY "agencies_select_policy"
    ON agencies
    FOR SELECT
    TO authenticated
    USING (true);

-- Mise à jour (admins de plateforme uniquement)
CREATE POLICY "agencies_update_policy"
    ON agencies
    FOR UPDATE
    TO authenticated
    USING (
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

-- Insertion (admins de plateforme uniquement)
CREATE POLICY "agencies_insert_policy"
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

-- Suppression (admins de plateforme uniquement)
CREATE POLICY "agencies_delete_policy"
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

-- Étape 3: S'assurer que RLS est activé
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Étape 4: Vérification
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename = 'agencies'
ORDER BY policyname;

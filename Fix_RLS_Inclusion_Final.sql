-- ==============================================================================
-- FIX RLS INCLUSION - LE DÉBLOCAGE TOTAL
-- ==============================================================================
-- Ce script met à jour les politiques RLS pour inclure la vérification 
-- dans la table 'users' en plus de 'agency_users'.
-- Cela permet aux DIRECTEURS (souvent absents de agency_users) d'accéder à leurs données.

DO $$ 
DECLARE
    t_name text;
    has_agency_id boolean;
BEGIN
    FOR t_name IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        -- Vérifier si la table a une colonne agency_id
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'agency_id'
        ) INTO has_agency_id;

        IF has_agency_id THEN
            -- Ignorer les tables coeurs/système
            IF t_name NOT IN ('agencies', 'agency_users', 'users', 'agency_registration_requests', 'collaboration_requests', 'platform_admins') THEN
                
                -- Supprimer l'ancienne politique si elle existe
                EXECUTE format('DROP POLICY IF EXISTS "%I_master_agency_all" ON public.%I;', t_name, t_name);
                
                -- Créer la nouvelle politique avec fallback sur la table users
                EXECUTE format('
                    CREATE POLICY "%I_master_agency_all" ON public.%I FOR ALL TO authenticated USING (
                        agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) 
                        OR agency_id IN (SELECT agency_id FROM public.users WHERE id = auth.uid())
                        OR public.is_platform_admin()
                    ) WITH CHECK (
                        agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) 
                        OR agency_id IN (SELECT agency_id FROM public.users WHERE id = auth.uid())
                        OR public.is_platform_admin()
                    );
                ', t_name, t_name);
                
            END IF;
        END IF;
    END LOOP;
END $$;

SELECT '✅ RLS débloqué pour tous les utilisateurs (Agency Users + Users).' as status;

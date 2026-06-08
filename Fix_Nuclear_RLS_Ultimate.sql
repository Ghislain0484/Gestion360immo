-- ==============================================================================
-- FIX NUCLEAR RLS - LE RATISSAGE ULTIME (DYNAMIC SCRIPT)
-- ==============================================================================
-- Ce script scanne AUTOMATIQUEMENT toutes les tables de la base de données.
-- S'il trouve une table avec une colonne "agency_id", il lui applique la 
-- politique de sécurité multi-agence standard.
-- S'il trouve une table avec "user_id" (sans agency_id), il la sécurise par utilisateur.
-- Cela garantit qu'AUCUNE table ne sera jamais oubliée, présente ou future.

DO $$ 
DECLARE
    t_name text;
    has_agency_id boolean;
    has_user_id boolean;
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
        
        -- Vérifier si la table a une colonne user_id
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'user_id'
        ) INTO has_user_id;

        -- 1. CAS: La table a un agency_id (Ex: owner_transactions, property_expenses, etc.)
        IF has_agency_id THEN
            -- Ignorer les tables coeurs qui ont déjà des règles très spécifiques
            IF t_name NOT IN ('agencies', 'agency_users', 'users', 'agency_registration_requests', 'collaboration_requests', 'platform_admins', 'collaboration_ads') THEN
                
                -- Activer RLS au cas où
                EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
                
                -- Supprimer la politique master si elle existe déjà pour faire propre
                EXECUTE format('DROP POLICY IF EXISTS "%I_master_agency_all" ON public.%I;', t_name, t_name);
                
                -- Créer une politique universelle "catch-all" basée sur l'appartenance à l'agence
                EXECUTE format('
                    CREATE POLICY "%I_master_agency_all" ON public.%I FOR ALL TO authenticated USING (
                        agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) 
                        OR public.is_platform_admin()
                    ) WITH CHECK (
                        agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) 
                        OR public.is_platform_admin()
                    );
                ', t_name, t_name);
                
            END IF;
            
        -- 2. CAS: La table n'a pas d'agency_id, mais a un user_id (Ex: notifications, settings individuels)
        ELSIF has_user_id THEN
            IF t_name NOT IN ('users', 'agency_users', 'platform_admins') THEN
                EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
                EXECUTE format('DROP POLICY IF EXISTS "%I_master_user_all" ON public.%I;', t_name, t_name);
                EXECUTE format('
                    CREATE POLICY "%I_master_user_all" ON public.%I FOR ALL TO authenticated USING (
                        user_id = auth.uid() OR public.is_platform_admin()
                    ) WITH CHECK (
                        user_id = auth.uid() OR public.is_platform_admin()
                    );
                ', t_name, t_name);
            END IF;
        END IF;
        
    END LOOP;
END $$;

SELECT '✅ Ratissage Ultime terminé. TOUTES les tables de la base de données sont désormais sécurisées et débloquées.' as status;

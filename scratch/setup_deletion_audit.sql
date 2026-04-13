-- ==========================================================
-- POLITIQUES DE SUPPRESSION SÉCURISÉE ET AUDIT (GICO V4)
-- ==========================================================

-- 1. Préparation de la table audit_logs
-- On s'assure qu'elle peut enregistrer les snapshots et l'agency_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='agency_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN agency_id UUID REFERENCES public.agencies(id);
    END IF;
END $$;

-- 2. Activation de la suppression pour les responsables
-- Tables concernées : properties, owners, tenants, contracts, rent_receipts, modular_transactions

DO $$ 
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['properties', 'owners', 'tenants', 'contracts', 'rent_receipts', 'modular_transactions', 'owner_transactions'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Suppression de l'ancienne politique si elle existe
        EXECUTE format('DROP POLICY IF EXISTS "Managers can delete %I" ON public.%I', t, t);
        
        -- Création de la politique de suppression restrictive
        -- Seuls les directeurs et managers de l'agence concernée peuvent supprimer
        EXECUTE format('
            CREATE POLICY "Managers can delete %I" ON public.%I
            FOR DELETE
            USING (
                agency_id = (
                    SELECT au.agency_id 
                    FROM public.agency_users au 
                    WHERE au.user_id = auth.uid() 
                    AND au.role IN (''director'', ''manager'')
                )
            )
        ', t, t);
        
        RAISE NOTICE 'Politique de suppression appliquée pour la table %', t;
    END LOOP;
END $$;

-- 3. Autoriser l'insertion dans audit_logs pour tout le monde (pour que les actions soient tracées)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
    CREATE POLICY "Users can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);
    
    -- Mais seuls les managers peuvent voir les logs de leur agence
    DROP POLICY IF EXISTS "Managers can view agency audit logs" ON public.audit_logs;
    CREATE POLICY "Managers can view agency audit logs" ON public.audit_logs
    FOR SELECT USING (
        agency_id = (
            SELECT au.agency_id 
            FROM public.agency_users au 
            WHERE au.user_id = auth.uid() 
            AND au.role IN ('director', 'manager')
        )
    );
END $$;

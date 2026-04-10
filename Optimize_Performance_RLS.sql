-- =============================================================================
-- GESTION360 - OPTIMISATION DES PERFORMANCES RLS (V23.3 - ROBUSTE)
-- Ce script ajoute les index de sécurité de manière sécurisée (vérifie l'existence des tables).
-- =============================================================================

DO $$ 
DECLARE 
    t_name TEXT;
BEGIN
    -- 1. Indexation massive sur agency_id pour les tables existantes
    FOR t_name IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
            'owners', 'tenants', 'properties', 'contracts', 'financial_statements', 
            'financial_transactions', 'cash_transactions', 'announcements', 
            'agency_subscriptions', 'agency_rankings', 'agency_service_modules',
            'agency_users', 'messages', 'notifications', 'audit_logs', 'rent_receipts'
        )
    ) LOOP
        -- Indexation sur agency_id si la colonne existe
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'agency_id') THEN
            EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_agency_id ON public.%I(agency_id)', t_name, t_name);
        END IF;

        -- Indexation sur d'autres colonnes clés
        IF t_name = 'agency_users' THEN
            CREATE INDEX IF NOT EXISTS idx_agency_users_user_id ON public.agency_users(user_id);
        ELSIF t_name = 'rent_receipts' THEN
            CREATE INDEX IF NOT EXISTS idx_rent_receipts_contract_id ON public.rent_receipts(contract_id);
        ELSIF t_name = 'messages' THEN
            CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
            CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
        ELSIF t_name = 'notifications' THEN
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
        END IF;
    END LOOP;

    -- 2. Analyse pour le planificateur de requêtes
    ANALYZE public.agency_users;
END $$;

-- 3. Optimisation de la fonction RLS (toujours valide si le schéma est là)
CREATE OR REPLACE FUNCTION public.is_agency_member(p_agency_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = p_agency_id
  );
$$;

DO $$ BEGIN RAISE NOTICE '✅ Optimisations de performance appliquées de manière sécurisée.'; END $$;

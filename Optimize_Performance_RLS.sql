-- =============================================================================
-- GESTION360 - OPTIMISATION DES PERFORMANCES RLS (V23.2)
-- Ce script ajoute les index manquants pour accélérer les vérifications RLS.
-- =============================================================================

-- 1. Indexation massive sur agency_id (Le socle du RLS)
CREATE INDEX IF NOT EXISTS idx_agency_users_agency_id ON public.agency_users(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_user_id ON public.agency_users(user_id);

CREATE INDEX IF NOT EXISTS idx_owners_agency_id ON public.owners(agency_id);
CREATE INDEX IF NOT EXISTS idx_tenants_agency_id ON public.tenants(agency_id);
CREATE INDEX IF NOT EXISTS idx_properties_agency_id ON public.properties(agency_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agency_id ON public.contracts(agency_id);
CREATE INDEX IF NOT EXISTS idx_financial_statements_agency_id ON public.financial_statements(agency_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_agency_id ON public.financial_transactions(agency_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_agency_id ON public.cash_transactions(agency_id);
CREATE INDEX IF NOT EXISTS idx_announcements_agency_id ON public.announcements(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_subscriptions_agency_id ON public.agency_subscriptions(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_rankings_agency_id ON public.agency_rankings(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_service_modules_agency_id ON public.agency_service_modules(agency_id);

-- 2. Indexation des clés étrangères utilisées dans les jointures RLS
-- Crucial pour rent_receipts qui lie via contracts
CREATE INDEX IF NOT EXISTS idx_rent_receipts_contract_id ON public.rent_receipts(contract_id);
CREATE INDEX IF NOT EXISTS idx_contracts_owner_id ON public.contracts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON public.contracts(tenant_id);

-- 3. Indexation pour la communication
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 4. Audit & Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 5. Optimisation de la fonction RLS is_agency_member
-- On s'assure qu'elle est STABLE et utilise au mieux les index.
CREATE OR REPLACE FUNCTION public.is_agency_member(p_agency_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Utilisation d'une sous-requête simple indexée
  SELECT EXISTS (
    SELECT 1 FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = p_agency_id
  );
$$;

-- 6. Analyse de la base pour mettre à jour les statistiques du planificateur
ANALYZE public.agency_users;
ANALYZE public.owners;
ANALYZE public.tenants;
ANALYZE public.properties;
ANALYZE public.contracts;
ANALYZE public.rent_receipts;
ANALYZE public.financial_transactions;

DO Apply_Schema_Updates.sql BEGIN RAISE NOTICE ''; END Apply_Schema_Updates.sql;

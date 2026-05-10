-- ==============================================================================
-- FIX NUCLEAR RLS - ADDENDUM POUR LES TABLES OUBLIÉES
-- ==============================================================================

-- 1. OWNER TRANSACTIONS
ALTER TABLE public.owner_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_transactions_read" ON public.owner_transactions;
DROP POLICY IF EXISTS "owner_transactions_insert" ON public.owner_transactions;
DROP POLICY IF EXISTS "owner_transactions_update" ON public.owner_transactions;
DROP POLICY IF EXISTS "owner_transactions_delete" ON public.owner_transactions;

CREATE POLICY "owner_transactions_read" ON public.owner_transactions FOR SELECT TO authenticated USING (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
);
CREATE POLICY "owner_transactions_insert" ON public.owner_transactions FOR INSERT TO authenticated WITH CHECK (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
);
CREATE POLICY "owner_transactions_update" ON public.owner_transactions FOR UPDATE TO authenticated USING (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
);
CREATE POLICY "owner_transactions_delete" ON public.owner_transactions FOR DELETE TO authenticated USING (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
);

-- 2. PROPERTY EXPENSES (Travaux, dépenses)
ALTER TABLE public.property_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "property_expenses_read" ON public.property_expenses;
DROP POLICY IF EXISTS "property_expenses_insert" ON public.property_expenses;
DROP POLICY IF EXISTS "property_expenses_update" ON public.property_expenses;
DROP POLICY IF EXISTS "property_expenses_delete" ON public.property_expenses;

CREATE POLICY "property_expenses_read" ON public.property_expenses FOR SELECT TO authenticated USING (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
);
CREATE POLICY "property_expenses_insert" ON public.property_expenses FOR INSERT TO authenticated WITH CHECK (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
);
CREATE POLICY "property_expenses_update" ON public.property_expenses FOR UPDATE TO authenticated USING (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
);
CREATE POLICY "property_expenses_delete" ON public.property_expenses FOR DELETE TO authenticated USING (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
);

-- 3. AUDIT LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_read" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

CREATE POLICY "audit_logs_read" ON public.audit_logs FOR SELECT TO authenticated USING (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
);
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
);

-- 4. TICKETS (États des lieux, maintenance)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_read" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
DROP POLICY IF EXISTS "tickets_delete" ON public.tickets;

CREATE POLICY "tickets_read" ON public.tickets FOR SELECT TO authenticated USING (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
);
CREATE POLICY "tickets_insert" ON public.tickets FOR INSERT TO authenticated WITH CHECK (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
);
CREATE POLICY "tickets_update" ON public.tickets FOR UPDATE TO authenticated USING (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
);
CREATE POLICY "tickets_delete" ON public.tickets FOR DELETE TO authenticated USING (
    agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
);

-- 5. COLLABORATION REQUESTS
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collab_requests_read" ON public.collaboration_requests;
DROP POLICY IF EXISTS "collab_requests_insert" ON public.collaboration_requests;
DROP POLICY IF EXISTS "collab_requests_update" ON public.collaboration_requests;
DROP POLICY IF EXISTS "collab_requests_delete" ON public.collaboration_requests;

CREATE POLICY "collab_requests_read" ON public.collaboration_requests FOR SELECT TO authenticated USING (
    requester_agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) 
    OR target_agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) 
    OR public.is_platform_admin()
);
CREATE POLICY "collab_requests_insert" ON public.collaboration_requests FOR INSERT TO authenticated WITH CHECK (
    requester_agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
);
CREATE POLICY "collab_requests_update" ON public.collaboration_requests FOR UPDATE TO authenticated USING (
    target_agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) 
    OR requester_agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) 
    OR public.is_platform_admin()
);
CREATE POLICY "collab_requests_delete" ON public.collaboration_requests FOR DELETE TO authenticated USING (
    requester_agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) 
    OR public.is_platform_admin()
);

-- Note: Modular (Hotel/Residences) utilise "modular_transactions", "modular_bookings", "residence_sites", etc.
-- C'est un schéma complexe, mais on ajoute des règles de base s'ils ont un agency_id.
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'modular_transactions') THEN
        ALTER TABLE public.modular_transactions ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "modular_tx_all" ON public.modular_transactions;
        CREATE POLICY "modular_tx_all" ON public.modular_transactions FOR ALL TO authenticated USING (
            agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()) OR public.is_platform_admin()
        );
    END IF;
END $$;

SELECT '✅ Addendum RLS appliqué avec succès pour les reversements et dépenses.' as status;

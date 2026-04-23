-- SCRIPT DE CRÉATION DES TABLES MANQUANTES POUR GESTION360
-- Ce script installe les tables tickets, audit_logs et property_documents

-- 1. TABLE TICKETS (MAINTENANCE ET ÉTATS DES LIEUX)
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    cost NUMERIC DEFAULT 0,
    charge_to TEXT DEFAULT 'owner' CHECK (charge_to IN ('owner', 'agency', 'tenant')),
    is_billable BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLE AUDIT_LOGS (TRAÇABILITÉ MULTI-AGENCES)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login'
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT
);

-- 3. TABLE PROPERTY_DOCUMENTS (GESTION DES DOCUMENTS)
CREATE TABLE IF NOT EXISTS public.property_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    document_type TEXT, -- 'title_deed', 'insurance', 'tax', 'other'
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER
);

-- 4. ACTIVATION RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

-- 5. POLITIQUES RLS (ISOLATION PAR AGENCE)
DO $$ 
BEGIN
    -- Tickets
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Agencies can only see their own tickets') THEN
        CREATE POLICY "Agencies can only see their own tickets" ON public.tickets
        FOR ALL USING (agency_id = (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid() LIMIT 1));
    END IF;

    -- Audit Logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Agencies can only see their own audit logs') THEN
        CREATE POLICY "Agencies can only see their own audit logs" ON public.audit_logs
        FOR ALL USING (agency_id = (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid() LIMIT 1));
    END IF;

    -- Documents
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Agencies can only see their own documents') THEN
        CREATE POLICY "Agencies can only see their own documents" ON public.property_documents
        FOR ALL USING (agency_id = (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid() LIMIT 1));
    END IF;
END $$;

-- 6. INDEX DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tickets_agency_id ON public.tickets(agency_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_agency_id ON public.audit_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_agency_id ON public.property_documents(agency_id);
CREATE INDEX IF NOT EXISTS idx_tickets_property_id ON public.tickets(property_id);
CREATE INDEX IF NOT EXISTS idx_tickets_owner_id ON public.tickets(owner_id);

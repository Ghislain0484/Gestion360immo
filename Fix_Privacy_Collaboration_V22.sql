-- =============================================================
-- FIX V22 : COLLABORATION "PRIVACY-FIRST" ET VÉRIFICATION AVEUGLE
-- =============================================================
-- Ce script permet de vérifier si un locataire/propriétaire est déjà 
-- connu sur la plateforme sans dévoiler ses informations immédiatement.

-- 1. RPC DE RECHERCHE AVEUGLE (BLIND CHECK)
CREATE OR REPLACE FUNCTION public.check_tier_reputation_v22(p_search TEXT, p_type TEXT)
RETURNS TABLE (
    id UUID,
    redacted_name TEXT,
    agency_name TEXT,
    agency_id UUID,
    payment_status TEXT,
    contract_count BIGINT,
    reputation_score TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- p_type doit être 'tenant' ou 'owner'
    IF p_type = 'tenant' THEN
        RETURN QUERY
        SELECT 
            t.id,
            -- Masking : "J*** D***" pour Jean Paul DAGO
            overlay(t.first_name placing '***' from 2 for 3) || ' ' || overlay(t.last_name placing '***' from 2 for 3) as redacted_name,
            a.name as agency_name,
            t.agency_id,
            t.payment_status::TEXT,
            (SELECT count(*) FROM public.contracts c WHERE c.tenant_id = t.id) as contract_count,
            CASE 
                WHEN t.payment_status = 'bon' THEN 'Excellent'
                WHEN t.payment_status = 'irregulier' THEN 'Attention'
                ELSE 'Risqué'
            END as reputation_score
        FROM public.tenants t
        JOIN public.agencies a ON t.agency_id = a.id
        WHERE (LOWER(t.email) = LOWER(p_search) OR t.phone = p_search)
        AND t.agency_id != (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid() LIMIT 1);
        
    ELSIF p_type = 'owner' THEN
        RETURN QUERY
        SELECT 
            o.id,
            overlay(o.first_name placing '***' from 2 for 3) || ' ' || overlay(o.last_name placing '***' from 2 for 3) as redacted_name,
            a.name as agency_name,
            o.agency_id,
            'N/A' as payment_status,
            (SELECT count(*) FROM public.properties p WHERE p.owner_id = o.id) as contract_count,
            'Propriétaire' as reputation_score
        FROM public.owners o
        JOIN public.agencies a ON o.agency_id = a.id
        WHERE (LOWER(o.email) = LOWER(p_search) OR o.phone = p_search)
        AND o.agency_id != (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid() LIMIT 1);
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_tier_reputation_v22(TEXT, TEXT) TO authenticated;

-- 2. TABLE DES DEMANDES D'ACCÈS (Optionnel si on utilise messages, mais mieux pour le suivi)
CREATE TABLE IF NOT EXISTS public.collaboration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_agency_id UUID REFERENCES public.agencies(id),
    target_agency_id UUID REFERENCES public.agencies(id),
    tier_id UUID,
    tier_type TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS pour collaboration_requests
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencies can see their own requests"
    ON public.collaboration_requests FOR SELECT
    USING (requester_agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid())
       OR target_agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()));

CREATE POLICY "Agencies can create requests"
    ON public.collaboration_requests FOR INSERT
    WITH CHECK (requester_agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()));

CREATE POLICY "Target agency can update status"
    ON public.collaboration_requests FOR UPDATE
    USING (target_agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()));

SELECT 'Correction V22 (Privacy Collaboration) installée' AS status;

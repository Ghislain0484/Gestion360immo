-- =============================================================
-- FIX V23 : COLLABORATION - RECHERCHE PRECISE DE CANDIDATURE
-- =============================================================

CREATE OR REPLACE FUNCTION public.check_tier_reputation_v23(
    p_nom TEXT,
    p_prenoms TEXT,
    p_phone TEXT,
    p_id_number TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    redacted_name TEXT,
    agency_name TEXT,
    agency_id UUID,
    payment_status TEXT,
    contract_count BIGINT,
    reputation_score TEXT,
    contract_period TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        overlay(t.first_name placing '***' from 2 for 3) || ' ' || overlay(t.last_name placing '***' from 2 for 3) as redacted_name,
        a.name as agency_name,
        t.agency_id,
        t.payment_status::TEXT,
        (SELECT count(*) FROM public.contracts c WHERE c.tenant_id = t.id) as contract_count,
        CASE 
            WHEN t.payment_status = 'bon' THEN 'Excellent'
            WHEN t.payment_status = 'irregulier' THEN 'Attention'
            ELSE 'Risqué'
        END as reputation_score,
        (
            SELECT COALESCE(
                to_char(c.start_date, 'DD/MM/YYYY') || ' - ' || COALESCE(to_char(c.end_date, 'DD/MM/YYYY'), 'En cours'),
                'Aucun contrat'
            )
            FROM public.contracts c 
            WHERE c.tenant_id = t.id 
            ORDER BY c.start_date DESC 
            LIMIT 1
        ) as contract_period
    FROM public.tenants t
    JOIN public.agencies a ON t.agency_id = a.id
    WHERE (
        (p_phone IS NOT NULL AND p_phone != '' AND t.phone = p_phone) OR
        (p_nom IS NOT NULL AND p_nom != '' AND (LOWER(t.last_name) ILIKE '%' || LOWER(p_nom) || '%' OR LOWER(t.first_name) ILIKE '%' || LOWER(p_nom) || '%')) OR
        (p_prenoms IS NOT NULL AND p_prenoms != '' AND (LOWER(t.first_name) ILIKE '%' || LOWER(p_prenoms) || '%' OR LOWER(t.last_name) ILIKE '%' || LOWER(p_prenoms) || '%'))
    )
    AND t.agency_id != (SELECT au.agency_id FROM public.agency_users au WHERE au.user_id = auth.uid() LIMIT 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_tier_reputation_v23(TEXT, TEXT, TEXT, TEXT) TO authenticated;

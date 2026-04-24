-- =============================================================================
-- GESTION360 - OPTIMISATION EGRESS : AGRÉGATS POUR RAPPORTS
-- Évite le téléchargement de listes entières pour les statistiques
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_reports_aggregates(p_agency_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'property_types', (
            SELECT jsonb_object_agg(type, count)
            FROM (
                SELECT (details->>'type') as type, count(*) as count
                FROM public.properties
                WHERE agency_id = p_agency_id
                GROUP BY (details->>'type')
            ) t
        ),
        'property_status', (
            SELECT jsonb_build_object(
                'vacant', count(*) FILTER (WHERE is_available = true),
                'occupied', count(*) FILTER (WHERE is_available = false)
            )
            FROM public.properties
            WHERE agency_id = p_agency_id
        ),
        'client_counts', (
            SELECT jsonb_build_object(
                'owners', (SELECT count(*) FROM public.owners WHERE agency_id = p_agency_id),
                'tenants', (SELECT count(*) FROM public.tenants WHERE agency_id = p_agency_id)
            )
        ),
        'contract_types', (
            SELECT jsonb_object_agg(type, count)
            FROM (
                SELECT type, count(*) as count
                FROM public.contracts
                WHERE agency_id = p_agency_id
                GROUP BY type
            ) c
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reports_aggregates(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reports_aggregates(UUID) TO service_role;

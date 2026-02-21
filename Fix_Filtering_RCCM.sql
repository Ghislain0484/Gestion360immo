-- =============================================================
-- GESTION360 : Filtrage Intelligent par RCCM
-- Met à jour la fonction de récupération des agences pour le choix initial
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_approved_agencies(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    name TEXT,
    city TEXT,
    commercial_register TEXT,
    status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Si un ID utilisateur est fourni, on filtre par son RCCM existant
    IF p_user_id IS NOT NULL THEN
        RETURN QUERY
        SELECT a.id, a.name, a.city, a.commercial_register, a.status
        FROM public.agencies a
        WHERE a.status = 'approved'
          AND a.commercial_register IN (
              -- RCCM des agences auxquelles l'utilisateur est déjà lié
              SELECT DISTINCT sub_a.commercial_register 
              FROM public.agency_users au
              JOIN public.agencies sub_a ON sub_a.id = au.agency_id
              WHERE au.user_id = p_user_id
          )
        ORDER BY a.name ASC;
    ELSE
        -- Fallback : toutes les agences approuvées (comportement précédent)
        RETURN QUERY
        SELECT a.id, a.name, a.city, a.commercial_register, a.status
        FROM public.agencies a
        WHERE a.status = 'approved'
        ORDER BY a.name ASC;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_approved_agencies(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_approved_agencies(UUID) TO anon;

-- Test rapide (à adapter avec votre propre ID si besoin pour vérification manuelle)
-- SELECT * FROM public.get_approved_agencies('7e1bb674-66ee-46f2-aec2-550231b660b0');

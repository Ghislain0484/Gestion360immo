-- ==============================================================================
-- DEBUG & FORÇAGE D'APPROBATION D'AGENCE
-- ==============================================================================

DO $$
DECLARE
    req record;
    res json;
    v_error_msg TEXT;
BEGIN
    FOR req IN SELECT id, agency_name FROM public.agency_registration_requests WHERE status = 'pending'
    LOOP
        -- Exécuter la fonction d'approbation
        res := public.approve_agency_request(req.id);
        
        -- Si la fonction retourne une erreur cachée, on la FORCE à s'afficher à l'écran !
        IF (res->>'success')::boolean = false THEN
            v_error_msg := res->>'error';
            RAISE EXCEPTION 'ERREUR LORS DE L''APPROBATION DE % : %', req.agency_name, v_error_msg;
        END IF;
        
    END LOOP;
END $$;

SELECT '✅ Approbation réussie sans aucune erreur.' as status;

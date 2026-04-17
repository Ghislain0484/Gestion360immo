
-- Migration for mass approval of agency requests
CREATE OR REPLACE FUNCTION public.mass_approve_agencies()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req RECORD;
    v_count integer := 0;
    v_res json;
BEGIN
    FOR v_req IN 
        SELECT id FROM public.agency_registration_requests 
        WHERE status = 'pending' 
    LOOP
        SELECT public.approve_agency_request(v_req.id) INTO v_res;
        IF (v_res->>'success')::boolean THEN
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'success', true, 
        'count', v_count,
        'message', v_count || ' agences approuvées massivement.'
    );
END;
$$;

-- ========================================================
-- SECURE OWNER ACTIVATION CHECK (RPC)
-- Allows unauthenticated users to check their email status
-- without exposing the entire owners table via RLS.
-- ========================================================

CREATE OR REPLACE FUNCTION public.check_owner_activation(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to bypass RLS
SET search_path = public
AS $$
DECLARE
    v_record RECORD;
    v_result JSONB;
BEGIN
    -- Search for the owner (case-insensitive and trimmed)
    SELECT first_name, last_name, user_id 
    INTO v_record
    FROM public.owners
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
    LIMIT 1;

    IF v_record IS NOT NULL THEN
        v_result := jsonb_build_object(
            'exists', true,
            'activated', (v_record.user_id IS NOT NULL),
            'owner_name', v_record.first_name || ' ' || v_record.last_name
        );
    ELSE
        v_result := jsonb_build_object(
            'exists', false,
            'activated', false
        );
    END IF;

    RETURN v_result;
END;
$$;

-- Grant access to anonymous users
GRANT EXECUTE ON FUNCTION public.check_owner_activation(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_owner_activation(TEXT) TO authenticated;

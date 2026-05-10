-- Fix approve_agency_request RPC
ALTER FUNCTION public.approve_agency_request(uuid) OWNER TO postgres;
ALTER FUNCTION public.approve_agency_request(uuid) SET search_path = public, auth, extensions;

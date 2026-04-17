-- Final stabilization for agency approval workflow
-- Adds missing processed_at column used by the approval RPC

ALTER TABLE public.agency_registration_requests
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Safety check: Ensure the status column in agencies supports 'active'
-- (Assuming it's a text column or has valid check constraints)
-- If it's an enum, we'd need to add the value, but standard schema is text.

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';

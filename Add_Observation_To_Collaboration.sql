ALTER TABLE public.collaboration_requests
ADD COLUMN IF NOT EXISTS observation text;

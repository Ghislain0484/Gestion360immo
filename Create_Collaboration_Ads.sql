-- Create table for inter-agency announcements
CREATE TABLE IF NOT EXISTS public.collaboration_ads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL CHECK (type IN ('sale', 'rent')),
    category text NOT NULL DEFAULT 'residential', -- residential, commercial, land
    title text NOT NULL,
    description text,
    price numeric,
    currency text DEFAULT 'XOF',
    location_text text,
    property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL, -- optional link to internal property
    contact_phone text,
    status text DEFAULT 'active', -- active, archived
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collaboration_ads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone authenticated can read active ads"
    ON public.collaboration_ads FOR SELECT
    TO authenticated
    USING (status = 'active');

CREATE POLICY "Agencies can manage their own ads"
    ON public.collaboration_ads FOR ALL
    TO authenticated
    USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_collaboration_ads_agency ON public.collaboration_ads(agency_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_ads_status ON public.collaboration_ads(status);

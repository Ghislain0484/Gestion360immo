-- Migration: Create dedicated modular_clients table for Residences/Hotel modules
-- This keeps short-term guests separate from long-term tenants.

CREATE TABLE IF NOT EXISTS public.modular_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    client_type TEXT DEFAULT 'regular' CHECK (client_type IN ('regular', 'vip', 'corporate')),
    loyalty_points INTEGER DEFAULT 0,
    preferences JSONB DEFAULT '[]'::jsonb,
    nationality TEXT,
    id_card_number TEXT,
    id_card_url TEXT,
    total_stays INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    last_stay_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agency_id, phone)
);

-- Enable RLS
ALTER TABLE public.modular_clients ENABLE ROW LEVEL SECURITY;

-- Reuse our security function for consistent RLS
CREATE POLICY "Access for agency users" ON public.modular_clients
FOR ALL USING (public.check_agency_access(agency_id));

-- Add client_id to modular_bookings if not already there or to supplement guest_name
ALTER TABLE public.modular_bookings ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.modular_clients(id);

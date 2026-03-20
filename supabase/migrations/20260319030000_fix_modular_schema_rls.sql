-- =============================================================
-- FIX SCHEMA ET RLS POUR MODULES RÉSIDENCES & HÔTELS (VERSION CORRIGÉE)
-- =============================================================

-- 1. Ajout des colonnes manquantes pour le filtrage par module
ALTER TABLE IF EXISTS public.modular_clients ADD COLUMN IF NOT EXISTS module_type TEXT;
ALTER TABLE IF EXISTS public.modular_transactions ADD COLUMN IF NOT EXISTS module_type TEXT;
ALTER TABLE IF EXISTS public.modular_bookings ADD COLUMN IF NOT EXISTS module_type TEXT;

-- 2. Activation de la RLS sur toutes les tables modulaires
ALTER TABLE IF EXISTS public.residence_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.residence_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.modular_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.modular_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.modular_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.residence_expenses ENABLE ROW LEVEL SECURITY;

-- 3. Nettoyage et Ré-application des politiques RLS
-- Nous utilisons la fonction SECURITY DEFINER public.check_agency_access(agency_id)
-- qui est plus robuste pour le multi-agences.

DO $$ 
DECLARE
    tname TEXT;
BEGIN
    FOR tname IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
            'residence_sites', 'residence_units', 'hotel_rooms', 
            'modular_bookings', 'modular_transactions', 'modular_clients', 
            'residence_expenses'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Access for agency users" ON public.%I', tname);
        EXECUTE format('DROP POLICY IF EXISTS "agency_crud_clients" ON public.%I', tname);
        EXECUTE format('CREATE POLICY "Access for agency users" ON public.%I FOR ALL TO authenticated USING (public.check_agency_access(agency_id)) WITH CHECK (public.check_agency_access(agency_id))', tname);
    END LOOP;
END $$;

-- 4. Fix : Marquer rétroactivement les données existantes pour les Résidences
UPDATE public.modular_clients SET module_type = 'residences' WHERE module_type IS NULL;
UPDATE public.modular_transactions SET module_type = 'residences' WHERE module_type IS NULL AND site_id IS NOT NULL;
UPDATE public.modular_bookings SET module_type = 'residences' WHERE module_type IS NULL AND residence_id IS NOT NULL;
UPDATE public.modular_bookings SET module_type = 'hotel' WHERE module_type IS NULL AND room_id IS NOT NULL;

SELECT 'Correction Schema et RLS (V2) terminée avec succès' AS status;

-- Ajout du support pour l'activation modulaire des agences
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS enabled_modules TEXT[] DEFAULT ARRAY['base'];

-- Initialisation pour les agences existantes qui n'auraient pas le champ
UPDATE public.agencies SET enabled_modules = ARRAY['base'] WHERE enabled_modules IS NULL;

-- S'assurer que la table des abonnements existe et est correcte
CREATE TABLE IF NOT EXISTS public.agency_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
    plan_type TEXT DEFAULT 'basic',
    status TEXT DEFAULT 'trial',
    monthly_fee INTEGER DEFAULT 25000,
    start_date DATE DEFAULT CURRENT_DATE,
    next_payment_date DATE DEFAULT (CURRENT_DATE + INTERVAL '60 days'),
    trial_days_remaining INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agency_id)
);

-- Créer des entrées d'abonnement pour les agences existantes qui n'en ont pas
INSERT INTO public.agency_subscriptions (agency_id, plan_type, status, monthly_fee)
SELECT id, 'basic', 'trial', 25000
FROM public.agencies a
WHERE NOT EXISTS (SELECT 1 FROM public.agency_subscriptions s WHERE s.agency_id = a.id)
ON CONFLICT (agency_id) DO NOTHING;

-- =========================================================
-- SECURITE RLS : Autoriser les directeurs à gérer leur propre abonnement
-- =========================================================
ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "directors_manage_own_subscription" ON public.agency_subscriptions;
CREATE POLICY "directors_manage_own_subscription" ON public.agency_subscriptions
FOR ALL TO authenticated
USING (
  agency_id IN (
    SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid() AND role = 'director'
  )
)
WITH CHECK (
  agency_id IN (
    SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid() AND role = 'director'
  )
);

-- Permettre aussi aux directeurs d'updater leur propre agence (pour les modules)
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "directors_update_own_agency" ON public.agencies;
CREATE POLICY "directors_update_own_agency" ON public.agencies
FOR UPDATE TO authenticated
USING (
  id IN (
    SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid() AND role = 'director'
  )
)
WITH CHECK (
  id IN (
    SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid() AND role = 'director'
  )
);

-- Correction/Amélioration de la période d'essai (Grace Period)
CREATE OR REPLACE FUNCTION public.calculate_trial_end_v22(p_days integer DEFAULT 60)
RETURNS date AS $$
BEGIN
    RETURN (CURRENT_DATE + (p_days || ' days')::interval)::date;
END;
$$ LANGUAGE plpgsql;

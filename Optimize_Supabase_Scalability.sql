-- SCRIPT D'OPTIMISATION SUPABASE POUR GESTION360 (MULTI-AGENCES) - VERSION CORRIGÉE
-- Ce script ajoute des index pour la performance et définit les meilleures pratiques RLS

-- 1. INDEXATION DES COLONNES AGENCY_ID (CRITIQUE POUR LA PERFORMANCE)
-- Assure une isolation rapide des données par agence.

CREATE INDEX IF NOT EXISTS idx_owners_agency_id ON public.owners(agency_id);
CREATE INDEX IF NOT EXISTS idx_properties_agency_id ON public.properties(agency_id);
CREATE INDEX IF NOT EXISTS idx_tenants_agency_id ON public.tenants(agency_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agency_id ON public.contracts(agency_id);
CREATE INDEX IF NOT EXISTS idx_rent_receipts_agency_id ON public.rent_receipts(agency_id);
CREATE INDEX IF NOT EXISTS idx_modular_transactions_agency_id ON public.modular_transactions(agency_id);
CREATE INDEX IF NOT EXISTS idx_tickets_agency_id ON public.tickets(agency_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_agency_id ON public.audit_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_agency_id ON public.property_documents(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_agency_id ON public.agency_users(agency_id);

-- TABLES MODULES (RÉSIDENCES / HÔTELS)
CREATE INDEX IF NOT EXISTS idx_modular_bookings_agency_id ON public.modular_bookings(agency_id);
CREATE INDEX IF NOT EXISTS idx_modular_clients_agency_id ON public.modular_clients(agency_id);
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_agency_id ON public.hotel_rooms(agency_id);
CREATE INDEX IF NOT EXISTS idx_residence_units_agency_id ON public.residence_units(agency_id);
CREATE INDEX IF NOT EXISTS idx_residence_sites_agency_id ON public.residence_sites(agency_id);

-- 2. INDEXATION DES CLÉS ÉTRANGÈRES FRÉQUEMMENT UTILISÉES
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_contracts_property_id ON public.contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON public.contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_receipts_contract_id ON public.rent_receipts(contract_id);

-- 3. OPTIMISATION RLS : FONCTION DE VÉRIFICATION D'AGENCE
-- Utilise une fonction stable pour éviter les jointures répétitives.

CREATE OR REPLACE FUNCTION public.get_my_agency_id()
RETURNS uuid AS $$
  SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. OPTIMISATION AVANCÉE : UTILISATION DES METADATA JWT (RECOMMANDÉ)
-- Si vous configurez Supabase pour inclure l'agency_id dans le JWT, utilisez cette politique :
-- USING (agency_id = (auth.jwt() -> 'user_metadata' ->> 'agency_id')::uuid);

-- 5. CONFIGURATION DU CONNECTION POOLING
-- Utilisez toujours le port 6543 (Supavisor) pour les connexions volumineuses.

COMMENT ON FUNCTION public.get_my_agency_id IS 'Récupère l agency_id de l utilisateur actuel pour optimiser les politiques RLS.';

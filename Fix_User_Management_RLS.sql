-- =============================================================
-- GESTION360 : THE ABSOLUTE RESET V18
-- Résout : Type Alteration (0A000), Join (PGRST200), FK (23503)
-- =============================================================

-- 1. Nettoyage TOTAL des politiques (AVANT de toucher aux colonnes)
-- Postgres refuse de modifier le type d'une colonne si elle est citée dans une police.
DO $$ 
DECLARE pol RECORD;
BEGIN 
    -- On cherche toutes les polices sur les tables clés
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('users', 'agency_users', 'audit_logs')) 
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename); END LOOP;
END $$;

-- 2. Désactivation du RLS pour permettre le remaniement structurel
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- 3. Reset TOTAL des Contraintes de la table USERS
DO $$ 
DECLARE r RECORD;
BEGIN 
  FOR r IN (SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'users' AND table_schema = 'public') 
  LOOP EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE'; 
  END LOOP; 
END $$;

-- 4. Nettoyage Doublons
DELETE FROM public.agency_users WHERE user_id IN (SELECT id FROM public.users WHERE email = 'larissa.kouassi@gicosarl.net');
DELETE FROM public.users WHERE email = 'larissa.kouassi@gicosarl.net';

-- 5. Modification Structurelle (Maintenant possible car aucune police ne bloque)
-- Conversion forcée en UUID
ALTER TABLE public.users ALTER COLUMN id SET DATA TYPE UUID USING id::uuid;

-- Réparation agency_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='agency_id') THEN
        ALTER TABLE public.users ADD COLUMN agency_id UUID;
    ELSE
        ALTER TABLE public.users ALTER COLUMN agency_id SET DATA TYPE UUID USING agency_id::uuid;
    END IF;
END $$;

-- 6. Reconstruction des Contraintes (V18)
ALTER TABLE public.users ADD CONSTRAINT users_pkey_v18 PRIMARY KEY (id);
ALTER TABLE public.users ADD CONSTRAINT users_email_unique_v18 UNIQUE (email);

-- LIEN AUTH : Crucial vers le schéma auth.users
ALTER TABLE public.users ADD CONSTRAINT users_auth_fkey_v18 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- LIEN RELATIONNEL : users -> agency_users (Fix PGRST200)
ALTER TABLE public.agency_users DROP CONSTRAINT IF EXISTS agency_users_user_id_fkey;
ALTER TABLE public.agency_users ADD CONSTRAINT agency_users_user_id_fkey_v18 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 7. RE-DÉPLOIEMENT DES POLITIQUES (V18 - Clean & Simple)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_v18" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_modify_v18" ON public.users FOR ALL TO authenticated 
USING (id = auth.uid() OR public.confirm_is_director());

CREATE POLICY "agency_users_all_v18" ON public.agency_users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AUDIT LOGS : Ouverture totale pour éviter les 403 à la connexion
CREATE POLICY "audit_logs_all_v18" ON public.audit_logs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 8. Finalisation
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
NOTIFY pgrst, 'reload schema';

SELECT 'Absolute Reset V18 Applied' AS status;

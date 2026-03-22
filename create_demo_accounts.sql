-- ==========================================
-- SCRIPT DE MIGRATION DES COMPTES DÉMO
-- ==========================================
-- INSTRUCTIONS GÉNÉRALES :
-- 1. Allez dans Auth -> Users dans votre dashboard Supabase.
-- 2. Créez deux utilisateurs avec ces emails :
--    - demo.agence@gestion360immo.com
--    - demo.proprio@gestion360immo.com
-- 3. UNE FOIS CRÉÉS, exécutez ce script SQL pour configurer leurs profils.

DO $$
DECLARE
  v_agency_id UUID;
  v_auth_agence_id UUID;
  v_auth_proprio_id UUID;
BEGIN
  -- 1. RÉCUPÉRATION DE L'AGENCE
  SELECT id INTO v_agency_id FROM public.agencies LIMIT 1;
  
  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Aucune agence trouvée. Veuillez créer une agence d''abord.';
  END IF;

  -- 2. RÉCUPÉRATION DES IDS AUTH (S'ils existent)
  SELECT id INTO v_auth_agence_id FROM auth.users WHERE email = 'demo.agence@gestion360immo.com';
  SELECT id INTO v_auth_proprio_id FROM auth.users WHERE email = 'demo.proprio@gestion360immo.com';

  -- 3. CONFIGURATION COMPTE AGENCE
  IF v_auth_agence_id IS NOT NULL THEN
    -- Création/Mise à jour du profil public
    INSERT INTO public.users (id, email, first_name, last_name, is_active, permissions)
    VALUES (
      v_auth_agence_id, 
      'demo.agence@gestion360immo.com', 
      'Admin', 
      'Démo', 
      true, 
      '{"dashboard":true,"properties":true,"owners":true,"tenants":true,"contracts":true,"collaboration":true,"caisse":true,"reports":true,"notifications":true,"settings":true,"userManagement":true}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET 
      is_active = true, 
      permissions = '{"dashboard":true,"properties":true,"owners":true,"tenants":true,"contracts":true,"collaboration":true,"caisse":true,"reports":true,"notifications":true,"settings":true,"userManagement":true}'::jsonb;

    -- Liaison Agence
    INSERT INTO public.agency_users (agency_id, user_id, role)
    VALUES (v_agency_id, v_auth_agence_id, 'director')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Compte Agence configuré.';
  ELSE
    RAISE WARNING 'L''utilisateur auth demo.agence@gestion360immo.com n''existe pas encore.';
  END IF;

  -- 4. CONFIGURATION COMPTE PROPRIÉTAIRE
  IF v_auth_proprio_id IS NOT NULL THEN
    -- Création/Mise à jour du profil propriétaire avec TOUS les champs obligatoires
    INSERT INTO public.owners (
      id, email, first_name, last_name, agency_id, phone, address, city, property_title, marital_status, children_count
    )
    VALUES (
      v_auth_proprio_id, 
      'demo.proprio@gestion360immo.com', 
      'Propriétaire', 
      'Démo', 
      v_agency_id, 
      '+224 000 000 000', 
      'Quartier Démo', 
      'Conakry', 
      'acd', 
      'marie', 
      0
    )
    ON CONFLICT (id) DO UPDATE SET 
      agency_id = v_agency_id, 
      phone = '+224 000 000 000', 
      address = 'Quartier Démo', 
      city = 'Conakry', 
      property_title = 'acd', 
      marital_status = 'marie', 
      children_count = 0;
    
    RAISE NOTICE 'Compte Propriétaire configuré.';
  ELSE
    RAISE WARNING 'L''utilisateur auth demo.proprio@gestion360immo.com n''existe pas encore.';
  END IF;

END $$;

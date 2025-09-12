1. DB Supabase
    1.1. Créer le projet sur Supabe
        - Organization : Gestion360Immo's Org
        - Project name : Gestion360Immo's Project
        - Database password : Business@gestion360immo.com

    1.2. Charger le schéma de données SQL pour la création de la base de données
        - Schema_de_donnees_New.sql

    1.3. Charger les script des Stat dans la console SQL
        - create_get_rent_receipts_by_agency.
    
    1.4. First User (Admin)
        1.4.1. Etape 1
            - Créer un utilisateur dans le menu Authentification de Supabase
            - Add user
            - Create new user
            - Email : business@gestion360immo.com
            - Mot de passe : Business@Gest360Immo
            - Cocher "Auto Confirm User?"
            - Create User
        
        1.4.2. Etape 2 : copier/coller dans la console SQL de Supabase.
            
        -- 2️⃣ Récupérer l'id de l'utilisateur créé dans l'étape 1 à partir de son mail
        WITH au AS (
            SELECT id, email FROM auth.users WHERE email = 'business@gestion360immo.com'
        )
        -- 3️⃣ Créer le profil public.users
        INSERT INTO public.users (id, email, first_name, last_name, avatar, is_active, permissions, created_at, updated_at)
        SELECT
            id,
            email,
            'Admin',
            'Gestion360',
            NULL,
            true,
            '{}'::jsonb,
            now(),
            now()
        FROM au
        WHERE NOT EXISTS (
            SELECT 1 FROM public.users WHERE email = 'business@gestion360immo.com'
        );

        -- 4️⃣ Créer l'identité auth.identities
        WITH au AS (
            SELECT id, email FROM auth.users WHERE email = 'business@gestion360immo.com'
        )
        INSERT INTO auth.identities (provider, provider_id, user_id, identity_data, last_sign_in_at, created_at, updated_at)
        SELECT
            'email',
            email,
            id,
            jsonb_build_object('sub', id::text, 'email', email),
            now(),
            now(),
            now()
        FROM au
        WHERE NOT EXISTS (
            SELECT 1 FROM auth.identities WHERE provider = 'email' AND user_id = au.id
        );

        -- 5️⃣ Créer le super admin
        WITH u AS (
            SELECT id FROM public.users WHERE email = 'business@gestion360immo.com'
        )
        INSERT INTO platform_admins (user_id, role, permissions, created_at, updated_at)
        SELECT
            id,
            'super_admin',
            '{
                "agencyManagement": true,
                "subscriptionManagement": true,
                "platformSettings": true,
                "reports": true,
                "userSupport": true,
                "systemMaintenance": true,
                "dataExport": true,
                "auditAccess": true
            }'::jsonb,
            now(),
            now()
        FROM u
        WHERE NOT EXISTS (
            SELECT 1 FROM platform_admins WHERE user_id = u.id
        );

2. Create agency-logos Bucket in Supabase
The StorageApiError: Bucket not found indicates that the agency-logos bucket does not exist. Follow these steps to create it:

    2.1. Go to Supabase Dashboard:
        - Navigate to Storage > Buckets in your Supabase project.
        - Click New Bucket and name it agency-logos.
        - Set the bucket as public (or configure RLS for restricted access if needed).

    2.2. Set Storage Permissions:

    -- Upload: Allow anon and authenticated uploads
    CREATE POLICY "Allow anon and authenticated uploads to agency-logos" ON storage.objects
        FOR INSERT
        WITH CHECK (
            bucket_id = 'agency-logos'
            AND (
                (auth.role() = 'anon' AND name LIKE 'temp-registration/%')
                OR (auth.role() = 'authenticated')
            )
        );

    -- Read: Allow public read for temp-registration
    CREATE POLICY "Allow public read for temp-registration" ON storage.objects
        FOR SELECT
        USING (
            bucket_id = 'agency-logos'
            AND name LIKE 'temp-registration/%'
        );

    -- Read: Allow authenticated read for all agency-logos
    CREATE POLICY "Allow authenticated read on agency-logos" ON storage.objects
        FOR SELECT
        USING (
            bucket_id = 'agency-logos'
            AND auth.role() = 'authenticated'
        );

    -- Update: Allow authenticated users to move/delete files
    CREATE POLICY "Allow authenticated update on agency-logos" ON storage.objects
        FOR UPDATE
        USING (
            bucket_id = 'agency-logos'
            AND auth.role() = 'authenticated'
        );

    -- Delete: Allow authenticated users to delete files
    CREATE POLICY "Allow authenticated delete on agency-logos" ON storage.objects
        FOR DELETE
        USING (
            bucket_id = 'agency-logos'
            AND auth.role() = 'authenticated'
        );


3. Créer le bucket avatars dans Supabase

    3.1. Dans le Dashboard Supabase → Storage → Buckets
        - + New bucket
        - Nom : avatars
        - Cocher Public bucket
        - Créer

    3.2. Set Storage Permissions:

    -- Autorise les utilisateurs connectés à insérer (upload) des fichiers dans le bucket "avatars"
    create policy "allow authenticated uploads"
    on storage.objects
    for insert
    to authenticated
    with check (
    bucket_id = 'avatars'
    );

    -- Autorise les utilisateurs connectés à lire les fichiers du bucket "avatars"
    create policy "allow authenticated read"
    on storage.objects
    for select
    to authenticated
    using (
    bucket_id = 'avatars'
    );

4. Récupérer les variables pour le fichier .env
    4.1. Aller dans Project Settings (Menu de gauche, tout à fait en bas)
        - Dans API Keys, copier "anon public" (VITE_SUPABASE_ANON_KEY)
        - Dans API Settings, copier l'URL du projet (VITE_SUPABASE_URL)

    4.2. Renseigner le fichier .env avec ces variables
        - VITE_SUPABASE_URL=
        - VITE_SUPABASE_ANON_KEY=

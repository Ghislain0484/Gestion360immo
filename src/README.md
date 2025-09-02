Project name : Gest360Immo
Database Password : I%qAsW4@#$!Mo36U

VITE_SUPABASE_URL=https://jrqlhhmujfkktnzgftbu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpycWxoaG11amZra3RuemdmdGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTE0NjgsImV4cCI6MjA3MjM4NzQ2OH0.qOq91XkcI5iKWNiW69E4T-nNA9Y7cVpArxBfKxHghLQ




User : cadouko@gest360immo.com
Pwd : Admin123!

// Script de création de compte. Remplacer l'étape 1 par une création manuelle de l'utilisateur sur Supabase.

-- 1️⃣ Créer l'utilisateur dans auth.users s'il n'existe pas
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
SELECT
    gen_random_uuid(),
    'admin@gestion360.com',
    crypt('Admin123!', gen_salt('bf')),
    now(),
    now(),
    now()
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@gestion360.com'
);

-- 2️⃣ Récupérer son id
WITH au AS (
    SELECT id, email FROM auth.users WHERE email = 'admin@gestion360.com'
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
    SELECT 1 FROM public.users WHERE email = 'admin@gestion360.com'
);

-- 4️⃣ Créer l'identité auth.identities
WITH au AS (
    SELECT id, email FROM auth.users WHERE email = 'admin@gestion360.com'
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
    SELECT id FROM public.users WHERE email = 'admin@gestion360.com'
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



// Mise à jour du script précédent à voir
-- ⚠️ Supprime d’abord les entrées invalides
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@gestion360.com');
DELETE FROM platform_admins WHERE user_id IN (SELECT id FROM public.users WHERE email = 'admin@gestion360.com');
DELETE FROM public.users WHERE email = 'admin@gestion360.com';
DELETE FROM auth.users WHERE email = 'admin@gestion360.com';

-- 1️⃣ Créer ou mettre à jour l’utilisateur Supabase Auth
WITH new_auth_user AS (
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'admin@gestion360.com',
        crypt('Admin123!', gen_salt('bf')),
        now(),
        now(),
        now()
    )
    ON CONFLICT (email) DO UPDATE SET
        encrypted_password = EXCLUDED.encrypted_password,
        email_confirmed_at = EXCLUDED.email_confirmed_at,
        updated_at = EXCLUDED.updated_at
    RETURNING id, email
),
-- 2️⃣ Créer le profil utilisateur dans public.users
new_user AS (
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
    FROM new_auth_user
    ON CONFLICT (email) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        avatar = EXCLUDED.avatar,
        is_active = EXCLUDED.is_active,
        permissions = EXCLUDED.permissions,
        updated_at = EXCLUDED.updated_at
    RETURNING id, email
),
-- 3️⃣ Créer l’identité correspondante dans auth.identities
insert_identity AS (
    INSERT INTO auth.identities (provider_id, user_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    SELECT
        'email',
        id,
        'email',
        jsonb_build_object('sub', id::text, 'email', email),
        now(),
        now(),
        now()
    FROM new_auth_user
    ON CONFLICT (provider, provider_id) DO NOTHING
)
-- 4️⃣ Créer ou mettre à jour le record platform_admins
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
FROM new_user
ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    updated_at = now();




cadouko@gest360immo.com
Admin123!
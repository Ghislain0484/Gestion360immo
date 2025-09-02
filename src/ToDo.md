```sql
-- Enable RLS
ALTER TABLE public.agency_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Allow admins to read platform_admins
CREATE POLICY "Allow admins to read platform_admins"
ON public.platform_admins
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  AND role IN ('admin', 'super_admin')
);


-- Update Supabase RLS and RPC To ensure the 401 Unauthorized and 42501 RLS errors are resolved, verify that the approve_agency_request RPC function is set up correctly:approve_agency_request.sql

-- Allow admins to update agency_registration_requests
CREATE POLICY "Allow admins to update agency registration requests"
ON public.agency_registration_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.platform_admins
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Allow admins to read agency_registration_requests
CREATE POLICY "Allow admins to read agency registration requests"
ON public.agency_registration_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.platform_admins
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Step 3: Update RLS Policies, Ensure the `agencies` table RLS allows admins to read subscription data:
CREATE POLICY "Allow admins to read agencies"
ON public.agencies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.platform_admins
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Allow admins to insert agencies"
ON public.agencies
FOR INSERT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.platform_admins
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);



-- **Schema Update**:
-- Add the `suspension_reason` column to `agencies`:
ALTER TABLE public.agencies
ADD COLUMN IF NOT EXISTS suspension_reason text;

-- **RLS Update**:
-- Add an `UPDATE` policy for `agencies` to allow admins to modify subscriptions:
CREATE POLICY "Allow admins to update agencies"
ON public.agencies
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);



-- Enable RLS on tables
ALTER TABLE public.agency_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Policy for reading agency registration requests
CREATE POLICY "Allow admins to read agency requests"
ON public.agency_registration_requests
FOR SELECT
TO authenticated
USING (true);

-- Policy for updating agency registration requests
CREATE POLICY "Allow admins to update agency requests"
ON public.agency_registration_requests
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

-- Policy for reading agencies
CREATE POLICY "Allow admins to read agencies"
ON public.agencies
FOR SELECT
TO authenticated
USING (true);

-- Policy for inserting agencies
CREATE POLICY "Allow admins to insert agencies"
ON public.agencies
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

-- Policy for updating agencies
CREATE POLICY "Allow admins to update agencies"
ON public.agencies
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));



INSERT INTO auth.users (email, encrypted_password, confirmed_at)
VALUES ('gagohi06@gmail.com', crypt('Jesus2025$', gen_salt('bf')), NOW())
ON CONFLICT (email) DO UPDATE SET 
  encrypted_password = EXCLUDED.encrypted_password,
  confirmed_at = EXCLUDED.confirmed_at;


  -- ********************************************************************************* --
  Additional Steps to Ensure Functionality
1. Update approve_agency_request RPC Function
The approveAgencyRequest function calls the approve_agency_request RPC, which must match the schema and handle logo_url to logo mapping. Run this SQL in the Supabase SQL Editor to redefine the function:
sqlDROP FUNCTION IF EXISTS public.approve_agency_request(text, jsonb);

CREATE OR REPLACE FUNCTION public.approve_agency_request(request_id text, agency_data jsonb)
RETURNS text AS $$
DECLARE
  new_agency_id text;
BEGIN
  -- Update request status
  UPDATE public.agency_registration_requests
  SET status = 'approved', processed_at = NOW(), processed_by = auth.uid()
  WHERE id = request_id;

  -- Insert new agency
  INSERT INTO public.agencies (
    name, city, phone, email, commercial_register,
    logo, is_accredited, accreditation_number, address,
    created_at, status
  )
  VALUES (
    agency_data->>'name',
    agency_data->>'city',
    agency_data->>'phone',
    agency_data->>'email',
    agency_data->>'commercial_register',
    agency_data->>'logo_url', -- Map logo_url to logo
    (agency_data->>'is_accredited')::boolean,
    agency_data->>'accreditation_number',
    agency_data->>'address',
    NOW(),
    'approved'
  )
  RETURNING id INTO new_agency_id;

  -- Insert subscription
  INSERT INTO public.agency_subscriptions (
    agency_id, plan_type, status, monthly_fee, start_date,
    next_payment_date, trial_days_remaining, created_at
  )
  VALUES (
    new_agency_id,
    'basic',
    'trial',
    25000,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    30,
    NOW()
  );

  -- Insert director as user if director_auth_user_id exists
  IF EXISTS (
    SELECT 1 FROM public.agency_registration_requests
    WHERE id = request_id AND director_auth_user_id IS NOT NULL
  ) THEN
    INSERT INTO public.users (
      id, email, first_name, last_name, role, agency_id, created_at
    )
    SELECT
      director_auth_user_id,
      director_email,
      director_first_name,
      director_last_name,
      'director',
      new_agency_id,
      NOW()
    FROM public.agency_registration_requests
    WHERE id = request_id;

    INSERT INTO public.agency_users (
      user_id, agency_id, role, created_at
    )
    SELECT
      director_auth_user_id,
      new_agency_id,
      'director',
      NOW()
    FROM public.agency_registration_requests
    WHERE id = request_id;
  END IF;

  RETURN new_agency_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.approve_agency_request(text, jsonb) TO authenticated;
Explanation:

Matches the request_id, agency_data signature expected by supabase.ts.
Maps agency_data->>'logo_url' to logo in agencies.
Uses agency_data->>'address' for the address column.
Adds agency_subscriptions record.
Inserts users and agency_users records if director_auth_user_id exists in the request.
Sets processed_by to auth.uid() for auditability.
Uses SECURITY DEFINER to bypass RLS for inserts/updates.

2. Ensure RLS Policies
Update RLS policies to allow admins to perform operations:
sql-- Enable RLS
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;

-- Policies for agencies
CREATE POLICY "Allow admins to read agencies"
ON public.agencies
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins to insert agencies"
ON public.agencies
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

CREATE POLICY "Allow admins to update agencies"
ON public.agencies
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

-- Policies for agency_registration_requests
CREATE POLICY "Allow admins to read agency requests"
ON public.agency_registration_requests
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins to insert agency requests"
ON public.agency_registration_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow admins to update agency requests"
ON public.agency_registration_requests
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

-- Policies for agency_subscriptions
CREATE POLICY "Allow admins to read subscriptions"
ON public.agency_subscriptions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins to insert subscriptions"
ON public.agency_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

CREATE POLICY "Allow admins to update subscriptions"
ON public.agency_subscriptions
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

-- Policies for users
CREATE POLICY "Allow admins to insert users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

-- Policies for agency_users
CREATE POLICY "Allow admins to insert agency_users"
ON public.agency_users
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));
Explanation:

Enables RLS on relevant tables.
Allows authenticated users to read data.
Restricts insert/update to platform_admins with admin or super_admin roles.
Allows anyone authenticated to insert agency_registration_requests (for public submissions).

3. Fix Authentication for gagohi06@gmail.com
The previous authentication failure (AuthApiError: Invalid login credentials) suggests the user is not set up correctly. Run these SQL commands:

Create/Update User:
sql
INSERT INTO auth.users (email, encrypted_password)
VALUES ('gagohi06@gmail.com', crypt('Jesus2025$', gen_salt('bf')))
ON CONFLICT (email) DO UPDATE SET 
  encrypted_password = EXCLUDED.encrypted_password
RETURNING id;

Confirm Email:
sql
INSERT INTO auth.identities (
  user_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT 
  id,
  'email',
  jsonb_build_object('sub', id::text, 'email', 'gagohi06@gmail.com'),
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'gagohi06@gmail.com'
ON CONFLICT (provider, user_id) DO NOTHING;

Add to platform_admins:
sql
INSERT INTO public.platform_admins (
  id, email, first_name, last_name, role, permissions, created_at
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'gagohi06@gmail.com'),
  'gagohi06@gmail.com',
  'Maurel',
  'Agohi',
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
  }',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions;


4. Test the Application

Apply Changes:

Replace supabase.ts with the updated code.
Run the SQL to redefine the approve_agency_request function and set RLS policies.
Set up the user gagohi06@gmail.com.


Create Test Agency Request:
sql
INSERT INTO public.agency_registration_requests (
  agency_name, city, phone, director_email, commercial_register,
  logo_url, is_accredited, accreditation_number, address, status, created_at
) VALUES (
  'Test Agency', 'Abidjan', '1234567890', 'test@example.com', '123456',
  'https://example.com/logo.png', true, 'ACC123', '123 Main St', 'pending', NOW()
);

Test Login and Approval:

Start the Vite dev server (npm run dev).
Log in with gagohi06@gmail.com and Jesus2025$.
Verify console logs show ✅ Connexion admin Supabase réussie in AuthContext.tsx.
Navigate to Agency Management, go to “Demandes d``Inscription”, and click “Approuver” on the test request.
Verify:

Toast notification: ✅ Agence approuvée avec succès ! (in AgencyManagement.tsx).
Database updates:
sql
SELECT * FROM public.agency_registration_requests WHERE commercial_register = '123456'; -- Should show status='approved'
SELECT * FROM public.agencies WHERE commercial_register = '123456'; -- Should show new agency with logo
SELECT * FROM public.agency_subscriptions WHERE agency_id = (SELECT id FROM public.agencies WHERE commercial_register = '123456'); -- Should show subscription
SELECT * FROM public.users WHERE email = 'test@example.com'; -- If director_auth_user_id was set
SELECT * FROM public.agency_users WHERE agency_id = (SELECT id FROM public.agencies WHERE commercial_register = '123456'); -- If director_auth_user_id was set






5. Fix getAllSubscriptions
The previous getAllSubscriptions in dbService queried agencies instead of agency_subscriptions and included invalid fields (total_paid, agency_name). The updated version queries agency_subscriptions and joins with agencies for the agency name:
sql
SELECT 
  s.id,
  s.agency_id,
  a.name as agency_name,
  s.plan_type,
  s.status,
  s.monthly_fee,
  s.start_date,
  s.next_payment_date,
  s.trial_days_remaining,
  s.payment_history
FROM public.agency_subscriptions s
JOIN public.agencies a ON s.agency_id = a.id
ORDER BY s.created_at DESC;
This is reflected in the updated getAllSubscriptions function in supabase.ts.
6. Handle director_auth_user_id
If agency_registration_requests.director_auth_user_id is populated, ensure the corresponding user exists in auth.users. For example, for the test request:
sql

INSERT INTO auth.users (id, email, encrypted_password)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  crypt('Test123$', gen_salt('bf'))
)
ON CONFLICT (email) DO UPDATE SET 
  encrypted_password = EXCLUDED.encrypted_password
RETURNING id;

-- Then update the request:

UPDATE public.agency_registration_requests
SET director_auth_user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com')
WHERE commercial_register = '123456';
-- This ensures the users and agency_users inserts work in approveAgencyRequestDirect and the RPC function.





-- 0. Assurer que l'email est unique côté platform_admins
ALTER TABLE platform_admins
  ADD CONSTRAINT unique_admin_email UNIQUE(email);

-- 1. Créer / mettre à jour l’utilisateur dans Supabase Auth
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'sadmin@gestion360.com',
  crypt('Admin123!', gen_salt('bf')),
  now(),
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET 
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = now(),
  updated_at = now()
RETURNING id;

-- 2. Créer / mettre à jour l’identité associée (provider=email)
INSERT INTO auth.identities (
  user_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT 
  u.id,
  'email',
  jsonb_build_object('sub', u.id::text, 'email', 'clems@aoc.net'),
  now(),
  now(),
  now()
FROM auth.users u
WHERE u.email = 'clems@aoc.net'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = u.id AND i.provider = 'email'
  );

-- 3. Ajouter / mettre à jour l’admin dans la table applicative
INSERT INTO public.platform_admins (
  id, email, first_name, last_name, role, permissions, created_at
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'sadmin@gestion360.com'),
  'sadmin@gestion360.com',
  'Super',
  'Admin',
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
  }',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions;

---/*******************\---
    --- A TESTER ---

-- ================================================
-- 1. Créer ou mettre à jour un utilisateur Supabase
-- ================================================
WITH new_user AS (
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
    updated_at = now()
  RETURNING id, email
)
-- ================================================
-- 2. Créer / mettre à jour l’identité associée
-- ================================================
, new_identity AS (
  INSERT INTO auth.identities (
    user_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  )
  SELECT 
    id,
    'email',
    jsonb_build_object('sub', id::text, 'email', email),
    now(),
    now(),
    now()
  FROM new_user
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities i 
    WHERE i.user_id = (SELECT id FROM new_user) 
      AND i.provider = 'email'
  )
  RETURNING user_id
)
-- ================================================
-- 3. Créer / mettre à jour dans platform_admins
-- ================================================
INSERT INTO public.platform_admins (
  id, email, first_name, last_name, role, permissions, created_at, updated_at
)
SELECT
  u.id,
  u.email,
  'Super',
  'Admin',
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
FROM new_user u
ON CONFLICT (id) DO UPDATE SET
  email        = EXCLUDED.email,
  first_name   = EXCLUDED.first_name,
  last_name    = EXCLUDED.last_name,
  role         = EXCLUDED.role,
  permissions  = EXCLUDED.permissions,
  updated_at   = now()
RETURNING *;


-- Ou ça :

CREATE OR REPLACE PROCEDURE public.create_or_update_platform_admin(
    p_email TEXT,
    p_password TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- 1. Créer ou mettre à jour l’utilisateur dans auth.users
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        p_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        now(),
        now()
    )
    ON CONFLICT (email) DO UPDATE SET
        encrypted_password = EXCLUDED.encrypted_password,
        updated_at = now()
    RETURNING id INTO v_user_id;

    -- 2. Créer l’identité s’il n’existe pas
    IF NOT EXISTS (
        SELECT 1 FROM auth.identities WHERE user_id = v_user_id AND provider = 'email'
    ) THEN
        INSERT INTO auth.identities (
            user_id,
            provider,
            identity_data,
            last_sign_in_at,
            created_at,
            updated_at
        )
        VALUES (
            v_user_id,
            'email',
            jsonb_build_object('sub', v_user_id::text, 'email', p_email),
            now(),
            now(),
            now()
        );
    END IF;

    -- 3. Créer ou mettre à jour l’admin dans platform_admins
    INSERT INTO public.platform_admins (
        id, email, first_name, last_name, role, permissions, created_at, updated_at
    )
    VALUES (
        v_user_id,
        p_email,
        'Super',
        'Admin',
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
    )
    ON CONFLICT (id) DO UPDATE SET
        email        = EXCLUDED.email,
        first_name   = EXCLUDED.first_name,
        last_name    = EXCLUDED.last_name,
        role         = EXCLUDED.role,
        permissions  = EXCLUDED.permissions,
        updated_at   = now();
END;
$$;


CALL public.create_or_update_platform_admin('admin@gestion360.com', 'Admin123!');






-- Ou ça
-- Fonctionnel

-- ⚠️ Supprime d’abord les entrées invalides
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email='clems@gestion360.com');
DELETE FROM auth.users WHERE email='clems@gestion360.com';
DELETE FROM platform_admins WHERE email='clems@gestion360.com';

-- 1️⃣ Créer ou mettre à jour l’utilisateur Supabase Auth
WITH new_user AS (
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'clems@gestion360.com',
        crypt('Admin123!', gen_salt('bf')),
        now(),
        now(),
        now()
    )
    RETURNING id, email
)
-- 2️⃣ Créer l’identité correspondante
INSERT INTO auth.identities (provider_id, user_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
SELECT
    'email',        -- provider_id obligatoire
    id,
    'email',
    jsonb_build_object('sub', id::text, 'email', email),
    now(),
    now(),
    now()
FROM new_user;

-- 3️⃣ Créer ou mettre à jour le record platform_admins
INSERT INTO platform_admins (id, email, first_name, last_name, role, permissions, created_at, updated_at)
SELECT
    id,
    email,
    'Super',
    'Admin',
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
    }',
    now(),
    now()
FROM auth.users
WHERE email='clems@gestion360.com'
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    updated_at = now();

------------------------------------------------------
------------------------------------------------------




-- 1️⃣ Activer RLS sur toutes les tables pertinentes
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Policies pour agencies
CREATE POLICY "Allow admins to read agencies"
ON public.agencies
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

CREATE POLICY "Allow admins to insert agencies"
ON public.agencies
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

CREATE POLICY "Allow admins to update agencies"
ON public.agencies
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

-- 3️⃣ Policies pour agency_registration_requests
-- Insertion libre pour tous (même non authentifié)
DROP POLICY IF EXISTS "Allow admins to insert agency requests" ON public.agency_registration_requests;

CREATE POLICY "Allow anyone to insert agency registration requests"
ON public.agency_registration_requests
FOR INSERT
TO public
WITH CHECK (true);

-- Lecture réservée aux admins
CREATE POLICY "Allow admins to read agency requests"
ON public.agency_registration_requests
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

-- Update réservé aux admins
CREATE POLICY "Allow admins to update agency requests"
ON public.agency_registration_requests
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

-- 4️⃣ Policies pour agency_subscriptions
CREATE POLICY "Allow admins to read subscriptions"
ON public.agency_subscriptions
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

CREATE POLICY "Allow admins to insert subscriptions"
ON public.agency_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

CREATE POLICY "Allow admins to update subscriptions"
ON public.agency_subscriptions
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

-- 5️⃣ Policies pour users
CREATE POLICY "Allow admins to insert users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

-- 6️⃣ Policies pour agency_users
CREATE POLICY "Allow admins to insert agency_users"
ON public.agency_users
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.platform_admins
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
));

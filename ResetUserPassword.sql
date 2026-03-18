-- Reset password for gagohi06@gmail.com
-- New temporary password: Gestion360!2024

DO $$
DECLARE
    v_user_id UUID;
    v_new_password TEXT := 'Gestion360!2024';
BEGIN
    -- 1. Get the user ID from auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'gagohi06@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        -- 2. Update the password using pgcrypto (bcrypt)
        -- Note: We use extensions.crypt and extensions.gen_salt if available
        UPDATE auth.users
        SET 
            encrypted_password = extensions.crypt(v_new_password, extensions.gen_salt('bf')),
            updated_at = NOW(),
            last_sign_in_at = NULL -- Force fresh session logic if needed
        WHERE id = v_user_id;
        
        RAISE NOTICE 'Password for gagohi06@gmail.com has been reset to: %', v_new_password;
    ELSE
        RAISE NOTICE 'User gagohi06@gmail.com not found in auth.users.';
    END IF;
END $$;

-- Migration: Add 'cashier' role to agency_user_role enum
-- IMPORTANT: Run this script in the Supabase SQL Editor.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'agency_user_role' 
        AND e.enumlabel = 'cashier'
    ) THEN
        ALTER TYPE agency_user_role ADD VALUE 'cashier';
    END IF;
END
$$;

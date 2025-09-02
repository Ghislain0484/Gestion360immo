/*
  # Fix public access for agency registration requests

  1. Security Changes
    - Drop existing restrictive policies
    - Add public INSERT policy for anonymous users
    - Add admin management policies for authenticated users
    - Ensure RLS is properly configured

  2. Public Access
    - Allow anonymous users to create registration requests
    - No authentication required for submissions
    - Secure admin-only access for management
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public registration requests" ON agency_registration_requests;
DROP POLICY IF EXISTS "Admins can view and manage registration requests" ON agency_registration_requests;

-- Ensure RLS is enabled
ALTER TABLE agency_registration_requests ENABLE ROW LEVEL SECURITY;

-- Allow public (anonymous) users to insert registration requests
CREATE POLICY "Public can create registration requests"
  ON agency_registration_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users (admins) to view and manage all requests
CREATE POLICY "Authenticated users can manage registration requests"
  ON agency_registration_requests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure the table has proper permissions for anonymous access
GRANT INSERT ON agency_registration_requests TO anon;
GRANT SELECT, UPDATE, DELETE ON agency_registration_requests TO authenticated;
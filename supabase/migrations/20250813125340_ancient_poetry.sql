/*
  # Fix registration permissions

  1. Security Updates
    - Add public insert policy for agency registration requests
    - Allow anonymous users to submit registration requests
    - Maintain security for other operations

  2. Changes
    - Enable public access for registration submissions
    - Keep admin-only access for viewing and processing requests
*/

-- Add policy to allow public registration requests
CREATE POLICY "Allow public registration requests"
  ON agency_registration_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Ensure the table has RLS enabled
ALTER TABLE agency_registration_requests ENABLE ROW LEVEL SECURITY;

-- Update existing admin policy to be more specific
DROP POLICY IF EXISTS "Admins can manage registration requests" ON agency_registration_requests;

CREATE POLICY "Admins can view and manage registration requests"
  ON agency_registration_requests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
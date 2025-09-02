/*
  # Ajout table demandes d'inscription agences

  1. Nouvelle Table
    - `agency_registration_requests`
      - `id` (uuid, primary key)
      - `agency_name` (text)
      - `commercial_register` (text)
      - `director_first_name` (text)
      - `director_last_name` (text)
      - `director_email` (text)
      - `phone` (text)
      - `city` (text)
      - `address` (text)
      - `logo_url` (text, optional)
      - `is_accredited` (boolean)
      - `accreditation_number` (text, optional)
      - `status` (text) - pending, approved, rejected
      - `admin_notes` (text, optional)
      - `processed_by` (uuid, optional)
      - `processed_at` (timestamp, optional)
      - `created_at` (timestamp)

  2. Sécurité
    - Enable RLS
    - Politique pour les admins
*/

CREATE TABLE IF NOT EXISTS agency_registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name text NOT NULL,
  commercial_register text NOT NULL,
  director_first_name text NOT NULL,
  director_last_name text NOT NULL,
  director_email text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  logo_url text,
  is_accredited boolean DEFAULT false,
  accreditation_number text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  processed_by uuid REFERENCES platform_admins(id),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agency_registration_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage registration requests"
  ON agency_registration_requests
  FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX idx_registration_requests_status ON agency_registration_requests(status);
CREATE INDEX idx_registration_requests_created_at ON agency_registration_requests(created_at);
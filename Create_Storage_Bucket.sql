-- Enable storage extension if not enabled (usually enabled by default in Supabase)
-- insert into storage.buckets (id, name, public) values ('bucket-name', 'bucket-name', true);

-- ============================================================================
-- 1. Tenant Documents Bucket
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-documents', 'tenant-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for tenant-documents
CREATE POLICY "Public Access Tenant Docs"
ON storage.objects FOR SELECT
USING ( bucket_id = 'tenant-documents' );

CREATE POLICY "Authenticated Users Upload Tenant Docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tenant-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated Users Update Tenant Docs"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'tenant-documents' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Users Delete Tenant Docs"
ON storage.objects FOR DELETE
USING ( bucket_id = 'tenant-documents' AND auth.role() = 'authenticated' );

-- ============================================================================
-- 2. Property Images Bucket
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for property-images
CREATE POLICY "Public Access Property Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'property-images' );

CREATE POLICY "Authenticated Users Upload Property Images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated Users Update Property Images"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'property-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Users Delete Property Images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'property-images' AND auth.role() = 'authenticated' );

-- ============================================================================
-- 3. Agency Logos Bucket
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-logos', 'agency-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for agency-logos
-- Allow public read access to all logos
CREATE POLICY "Public Access Agency Logos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'agency-logos' );

-- Allow authenticated users (Agencies/Admins) to upload logos
CREATE POLICY "Authenticated Users Upload Agency Logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agency-logos' 
  AND auth.role() = 'authenticated'
);

-- SPECIAL: Allow Anonymous (unauthenticated) users to upload ONLY significantly restricted files
-- This is for the registration form 'temp-registration/' path
CREATE POLICY "Anonymous Upload Agency Logos Temp"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agency-logos' 
  AND auth.role() = 'anon'
  AND (storage.foldername(name))[1] = 'temp-registration'
);

-- Allow authenticated users to manage files (update/delete)
CREATE POLICY "Authenticated Users Update Agency Logos"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'agency-logos' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Users Delete Agency Logos"
ON storage.objects FOR DELETE
USING ( bucket_id = 'agency-logos' AND auth.role() = 'authenticated' );

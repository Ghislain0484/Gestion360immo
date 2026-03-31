-- Add photo_url column to owners table
ALTER TABLE IF EXISTS public.owners 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Update RLS if necessary (usually public columns are fine)
COMMENT ON COLUMN public.owners.photo_url IS 'URL of the owner profile photo stored in storage bucket';

-- Create Storage Bucket for Owner Photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('owner-photos', 'owner-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'owner-photos');

CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'owner-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Owner Edit" ON storage.objects
FOR UPDATE WITH CHECK (bucket_id = 'owner-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Owner Delete" ON storage.objects
FOR DELETE WITH CHECK (bucket_id = 'owner-photos' AND auth.role() = 'authenticated');

-- Migration v3: Add monthly_rent and sale_price to properties table

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS monthly_rent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sale_price numeric DEFAULT 0;

-- Optional: Update description to include business meaning
COMMENT ON COLUMN public.properties.monthly_rent IS 'Loyer mensuel indicatif pour la location';
COMMENT ON COLUMN public.properties.sale_price IS 'Prix de vente indicatif';

-- Professional Accounting: Deposits & Fees Enhancement
-- Run this in your Supabase SQL Editor

-- 1. Add new columns to rent_receipts
ALTER TABLE public.rent_receipts 
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS agency_fees NUMERIC DEFAULT 0;

-- 2. Update comments for clarity
COMMENT ON COLUMN public.rent_receipts.deposit_amount IS 'Montant du dépôt de garantie (Caution) encaissé';
COMMENT ON COLUMN public.rent_receipts.agency_fees IS 'Frais de dossier ou honoraires fixes encaissés par l''agence lors de l''entrée';

-- 3. Note on Logic
-- total_amount in rent_receipts should ideally store the SUM of:
-- rent_amount + charges + deposit_amount + agency_fees
-- commission_amount should store the SUM of:
-- (rent_amount * rate) + agency_fees

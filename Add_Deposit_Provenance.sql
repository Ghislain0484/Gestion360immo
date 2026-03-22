-- Add deposit provenance and status to contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deposit_provenance TEXT CHECK (deposit_provenance IN ('new_payment', 'transferred')) DEFAULT 'new_payment';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deposit_status TEXT CHECK (deposit_status IN ('pending', 'paid', 'absorbed', 'refunded')) DEFAULT 'pending';

-- Update existing contracts to have a default value
-- LOGIC: If deposit was not recorded (NULL or 0), consider it a 'transferred' lease (Reprise de bail)
UPDATE contracts SET deposit_provenance = 'transferred', deposit_status = 'paid' WHERE deposit IS NULL OR deposit = 0;
UPDATE contracts SET deposit_provenance = 'new_payment', deposit_status = 'paid' WHERE deposit > 0;

-- Ensure these columns are visible in RLS
-- (Usually automatic since they are on the table already covered by agency_id)

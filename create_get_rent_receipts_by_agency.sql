-- 1. Supprime la fonction existante (ignore si pas trouvée)
DROP FUNCTION IF EXISTS get_rent_receipts_by_agency(uuid, timestamptz, timestamptz);

-- 2. Recrée la fonction avec la nouvelle structure (inclut contract_id pour flexibilité)
CREATE OR REPLACE FUNCTION get_rent_receipts_by_agency(
  p_agency_id uuid,
  p_start_date timestamptz DEFAULT null,
  p_end_date timestamptz DEFAULT null
)
RETURNS TABLE (
  total_amount numeric,
  period_month int,
  period_year int,
  contract_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT rr.total_amount, rr.period_month, rr.period_year, rr.contract_id
  FROM rent_receipts rr
  INNER JOIN contracts c ON rr.contract_id = c.id
  WHERE c.agency_id = p_agency_id
    AND (p_start_date IS NULL OR rr.payment_date >= p_start_date)
    AND (p_end_date IS NULL OR rr.payment_date <= p_end_date);
END;
$$ LANGUAGE plpgsql;

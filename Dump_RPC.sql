CREATE OR REPLACE FUNCTION public.dump_policies()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(p))
    FROM (
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'public'
    ) p
  );
END;
$$;

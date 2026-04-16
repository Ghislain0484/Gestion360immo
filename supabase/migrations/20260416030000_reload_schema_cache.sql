-- Force PostgREST to reload the schema cache
-- This is a non-destructive operation
NOTIFY pgrst, 'reload schema';

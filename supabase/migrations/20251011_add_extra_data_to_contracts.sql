-- Add extra_data column to contracts table if not exists
alter table public.contracts 
add column if not exists extra_data jsonb default '{}'::jsonb;

comment on column public.contracts.extra_data is 'Stocke les métadonnées de transition (caution détenue par, date début facturation, etc.)';

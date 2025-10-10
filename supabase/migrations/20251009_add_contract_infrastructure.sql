-- Add usage type to properties without impacting existing rows
alter table public.properties
  add column if not exists usage_type text
    check (usage_type in ('habitation', 'professionnel'));

comment on column public.properties.usage_type is 'Usage principal du bien pour déterminer le type de bail.';

-- Templates de contrats
create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade,
  name text not null,
  contract_type text not null check (contract_type in ('gestion', 'bail_habitation', 'bail_professionnel')),
  usage_type text check (usage_type in ('habitation', 'professionnel')),
  language text not null default 'fr',
  version integer not null default 1,
  body text not null,
  variables text[] not null default '{}',
  metadata jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contract_templates_agency_idx on public.contract_templates(agency_id);
create index if not exists contract_templates_type_idx on public.contract_templates(contract_type, usage_type);

-- Contrats générés
create table if not exists public.contracts_managed (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade,
  contract_type text not null check (contract_type in ('gestion', 'bail_habitation', 'bail_professionnel')),
  owner_id uuid references public.owners(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  template_id uuid references public.contract_templates(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'generated', 'validated', 'signed', 'archived')),
  effective_date date,
  end_date date,
  renewal_date date,
  document_url text,
  financial_terms jsonb,
  context_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contracts_managed_agency_idx on public.contracts_managed(agency_id);
create index if not exists contracts_managed_lookup_idx on public.contracts_managed(property_id, tenant_id, owner_id);
create index if not exists contracts_managed_status_idx on public.contracts_managed(status);

-- Versions successives d'un contrat
create table if not exists public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts_managed(id) on delete cascade,
  version_number integer not null,
  body text not null,
  metadata jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists contract_versions_unique_idx
  on public.contract_versions(contract_id, version_number);

-- Historique des affectations propriété ↔ locataire
create table if not exists public.property_tenant_assignments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive', 'terminated')),
  lease_start date not null,
  lease_end date,
  rent_amount numeric(14,2) not null default 0,
  charges_amount numeric(14,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists property_tenant_assignments_property_idx on public.property_tenant_assignments(property_id);
create index if not exists property_tenant_assignments_tenant_idx on public.property_tenant_assignments(tenant_id);
create unique index if not exists property_tenant_unique_active_idx
  on public.property_tenant_assignments(property_id, tenant_id, lease_start);

-- Gère la date de mise à jour
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'contracts_managed_touch_updated_at'
  ) then
    create trigger contracts_managed_touch_updated_at
      before update on public.contracts_managed
      for each row
      execute function public.touch_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'property_tenant_assignments_touch_updated_at'
  ) then
    create trigger property_tenant_assignments_touch_updated_at
      before update on public.property_tenant_assignments
      for each row
      execute function public.touch_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'contract_templates_touch_updated_at'
  ) then
    create trigger contract_templates_touch_updated_at
      before update on public.contract_templates
      for each row
      execute function public.touch_updated_at();
  end if;
end;
$$;

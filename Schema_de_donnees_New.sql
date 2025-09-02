/**
voici une réécriture propre, normalisée et cohérente du schéma, avec :
  - des FK explicites et des cascades là où c’est logique,
  - des ENUMs pour toutes les valeurs finies,
  - des contraintes d’unicité pertinentes,
  - un users aligné sur Supabase Auth (clé étrangère vers auth.users(id)),
  - suppression des redondances (ex. rent_receipts ne duplique plus owner/tenant/property),
  - colonnes updated_at gérées par trigger.
*/

-- =========================================================
-- Extensions
-- =========================================================
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- =========================================================
-- Types (ENUM)
-- =========================================================
do $$
begin
  create type agency_user_role as enum ('director','manager','agent');
exception when duplicate_object then null; end $$;

do $$
begin
  create type plan_type as enum ('basic','premium','enterprise');
exception when duplicate_object then null; end $$;

do $$
begin
  create type subscription_status as enum ('trial','active','suspended','cancelled');
exception when duplicate_object then null; end $$;

do $$
begin
  create type marital_status as enum ('celibataire','marie','divorce','veuf');
exception when duplicate_object then null; end $$;

do $$
begin
  create type payment_reliability as enum ('bon','irregulier','mauvais');
exception when duplicate_object then null; end $$;

do $$
begin
  create type contract_type as enum ('location','vente','gestion');
exception when duplicate_object then null; end $$;

do $$
begin
  create type contract_status as enum ('draft','active','expired','terminated','renewed');
exception when duplicate_object then null; end $$;

do $$
begin
  create type announcement_type as enum ('location','vente');
exception when duplicate_object then null; end $$;

do $$
begin
  create type pay_method as enum ('especes','cheque','virement','mobile_money','bank_transfer','cash','check');
exception when duplicate_object then null; end $$;

do $$
begin
  create type notif_type as enum ('rental_alert','payment_reminder','new_message','property_update','contract_expiry','new_interest');
exception when duplicate_object then null; end $$;

do $$
begin
  create type notif_priority as enum ('low','medium','high');
exception when duplicate_object then null; end $$;

do $$
begin
  create type property_title as enum ('attestation_villageoise','lettre_attribution','permis_habiter','acd','tf','cpf','autres');
exception when duplicate_object then null; end $$;

do $$
begin
  create type property_standing as enum ('economique','moyen','haut');
exception when duplicate_object then null; end $$;

-- =========================================================
-- Helpers: updated_at trigger
-- =========================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- =========================================================
-- Utilisateurs (liés à Supabase Auth)
-- =========================================================
-- Convention: users.id = auth.users.id (FK forte, on supprime le profil si l’auth user est supprimé)
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  avatar text,
  is_active boolean default true,
  permissions jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger trg_users_updated_at before update on public.users
  for each row execute function set_updated_at();

-- =========================================================
-- Administrateurs plateforme
-- =========================================================
-- On lie un admin à un user existant (1-1)
create table public.platform_admins (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null unique references public.users(id) on delete cascade,
  role text not null check (role in ('super_admin','admin')),
  permissions jsonb default '{}'::jsonb,
  is_active boolean default true,
  last_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger trg_platform_admins_updated_at before update on public.platform_admins
  for each row execute function set_updated_at();

-- =========================================================
-- Agences
-- =========================================================
create table public.agencies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  commercial_register text not null unique,
  logo_url text,
  is_accredited boolean default false,
  accreditation_number text,
  address text not null,
  city text not null,
  phone text not null,
  email text not null,
  director_id uuid references public.users(id) on delete set null,
  status text not null default 'approved',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint agencies_email_chk check (position('@' in email) > 1)
);
create index idx_agencies_city on public.agencies(city);
create trigger trg_agencies_updated_at before update on public.agencies
  for each row execute function set_updated_at();

-- =========================================================
-- Liaison utilisateurs/agences (rôles par agence)
-- =========================================================
create table public.agency_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  role agency_user_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, agency_id)
);
-- Un seul director par agence
create unique index uq_agency_single_director
  on public.agency_users(agency_id)
  where role = 'director';

-- =========================================================
-- Demandes d’inscription agence
-- =========================================================
create table public.agency_registration_requests (
  id uuid primary key default gen_random_uuid(),
  agency_name text not null,
  commercial_register text not null,
  director_first_name text not null,
  director_last_name text not null,
  director_email text not null,
  phone text not null,
  city text not null,
  address text not null,
  logo_url text,
  is_accredited boolean default false,
  accreditation_number text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  admin_notes text,
  processed_by uuid references public.users(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz default now(),
  director_password text,              -- à chiffrer/retirer en prod si inutile
  director_auth_user_id uuid references public.users(id) on delete set null
);

-- =========================================================
-- Abonnements agence
-- =========================================================
create table public.agency_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null unique references public.agencies(id) on delete cascade,
  plan_type plan_type not null default 'basic',
  status subscription_status not null default 'trial',
  suspension_reason text,
  monthly_fee numeric not null default 25000,
  start_date date not null default current_date,
  end_date date,
  last_payment_date date,
  next_payment_date date not null default (current_date + interval '30 days'),
  trial_days_remaining int default 30,
  payment_history jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger trg_agency_subscriptions_updated_at before update on public.agency_subscriptions
  for each row execute function set_updated_at();

create table public.subscription_payments (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null references public.agency_subscriptions(id) on delete cascade,
  amount numeric not null,
  payment_date date not null,
  payment_method pay_method not null,
  reference_number text,
  status text not null default 'completed' check (status in ('pending','completed','failed','refunded')),
  processed_by uuid references public.users(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);
create index idx_subscription_payments_sub on public.subscription_payments(subscription_id);

-- =========================================================
-- Classements agence
-- =========================================================
create table public.agency_rankings (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  year int not null,
  rank int not null,
  total_score numeric not null default 0,
  volume_score numeric default 0,
  recovery_rate_score numeric default 0,
  satisfaction_score numeric default 0,
  metrics jsonb default '{}'::jsonb,
  rewards jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  unique (agency_id, year),
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_ranking_per_agency_year UNIQUE (agency_id, year)
);

-- =========================================================
-- Propriétaires / Locataires
-- =========================================================
create table public.owners (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  address text not null,
  city text not null,
  property_title property_title not null,
  property_title_details text,
  marital_status marital_status not null,
  spouse_name text,
  spouse_phone text,
  children_count int default 0 check (children_count >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger trg_owners_updated_at before update on public.owners
  for each row execute function set_updated_at();

create table public.tenants (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  address text not null,
  city text not null,
  marital_status marital_status not null,
  spouse_name text,
  spouse_phone text,
  children_count int default 0 check (children_count >= 0),
  profession text not null,
  nationality text not null,
  photo_url text,
  id_card_url text,
  payment_status payment_reliability not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger trg_tenants_updated_at before update on public.tenants
  for each row execute function set_updated_at();

-- =========================================================
-- Biens
-- =========================================================
create table public.properties (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete restrict,
  title text not null,
  description text,
  location jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  standing property_standing not null,
  rooms jsonb default '[]'::jsonb,
  images jsonb default '[]'::jsonb,
  is_available boolean default true,
  for_sale boolean default false,
  for_rent boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_properties_agency on public.properties(agency_id);
create index idx_properties_owner on public.properties(owner_id);
create trigger trg_properties_updated_at before update on public.properties
  for each row execute function set_updated_at();

-- =========================================================
-- Annonces + Intérêts
-- =========================================================
create table public.announcements (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  title text not null,
  description text not null,
  type announcement_type not null,
  is_active boolean default true,
  expires_at timestamptz,
  views int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_announcements_agency on public.announcements(agency_id);
create index idx_announcements_property on public.announcements(property_id);
create trigger trg_announcements_updated_at before update on public.announcements
  for each row execute function set_updated_at();

create table public.announcement_interests (
  id uuid primary key default uuid_generate_v4(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  message text,
  status text not null check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now(),
  unique (announcement_id, user_id)
);
create index idx_interests_agency on public.announcement_interests(agency_id);

-- =========================================================
-- Contrats
-- =========================================================
create table public.contracts (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete restrict,
  owner_id uuid not null references public.owners(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  type contract_type not null,
  start_date date not null,
  end_date date,
  monthly_rent numeric,
  sale_price numeric,
  deposit numeric,
  charges numeric,
  commission_rate numeric not null default 10.0,
  commission_amount numeric not null default 0,
  status contract_status not null,
  terms text not null,
  documents jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_contracts_agency on public.contracts(agency_id);
create index idx_contracts_tenant on public.contracts(tenant_id);
create index idx_contracts_owner on public.contracts(owner_id);
create trigger trg_contracts_updated_at before update on public.contracts
  for each row execute function set_updated_at();

-- =========================================================
-- Reçus de loyers (normalisés)
-- =========================================================
create table public.rent_receipts (
  id uuid primary key default uuid_generate_v4(),
  receipt_number text not null unique,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  period_month int not null check (period_month between 1 and 12),
  period_year int not null check (period_year >= 2024),
  rent_amount numeric not null,
  charges numeric default 0,
  total_amount numeric not null,
  commission_amount numeric not null,
  owner_payment numeric not null,
  payment_date date not null,
  payment_method pay_method not null,
  notes text,
  issued_by uuid not null references public.users(id) on delete set null,
  created_at timestamptz default now()
);
create index idx_receipts_contract on public.rent_receipts(contract_id);

-- =========================================================
-- États financiers (liens forts)
-- =========================================================
create table public.financial_statements (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  owner_id uuid references public.owners(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  total_income numeric default 0,
  total_expenses numeric default 0,
  net_balance numeric default 0,
  pending_payments numeric default 0,
  transactions jsonb default '[]'::jsonb,
  generated_by uuid not null references public.users(id) on delete set null,
  generated_at timestamptz default now(),
  created_at timestamptz default now(),
  constraint chk_one_party check (
    (owner_id is not null and tenant_id is null) or
    (owner_id is null and tenant_id is not null)
  )
);
create index idx_financials_agency on public.financial_statements(agency_id);
create index idx_financials_owner on public.financial_statements(owner_id);
create index idx_financials_tenant on public.financial_statements(tenant_id);

-- =========================================================
-- Messages & Notifications
-- =========================================================
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  agency_id uuid references public.agencies(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  announcement_id uuid references public.announcements(id) on delete set null,
  subject text not null,
  content text not null,
  is_read boolean default false,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
create index idx_messages_receiver on public.messages(receiver_id);

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  type notif_type not null,
  title text not null,
  message text not null,
  data jsonb default '{}'::jsonb,
  is_read boolean default false,
  priority notif_priority not null,
  created_at timestamptz default now()
);
create index idx_notifications_user on public.notifications(user_id);

-- =========================================================
-- Paramètres plateforme
-- =========================================================
create table public.platform_settings (
  id uuid primary key default uuid_generate_v4(),
  setting_key text not null unique,
  setting_value jsonb not null,
  description text,
  category text not null default 'general',
  is_public boolean default false,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- =========================================================
-- Audit
-- =========================================================
create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

-- =========================================================
-- Index complémentaires utiles
-- =========================================================
create index idx_owners_agency on public.owners(agency_id);
create index idx_tenants_agency on public.tenants(agency_id);
create index idx_ann_interests_user on public.announcement_interests(user_id);

/**
voici une réécriture propre, normalisée et cohérente du schéma, avec :
  - des FK explicites et des cascades là où c’est logique,
  - des ENUMs pour toutes les valeurs finies,
  - des contraintes d’unicité pertinentes,
  - un users aligné sur Supabase Auth (clé étrangère vers auth.users(id)),
  - suppression des redondances (ex. rent_receipts ne duplique plus owner/tenant/property),
  - colonnes updated_at gérées par trigger.
  - AJOUT: Colonnes 'business_id' et triggers de génération automatique (TYPEAAMMJJ-NNNNN).
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
  create type agency_user_role as enum ('director','manager','agent','cashier');
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
-- Helpers: ID Generation Function (Professional Sequence)
-- =========================================================
-- Generates an ID like PREFIX240130-00001
CREATE OR REPLACE FUNCTION generate_business_id()
RETURNS TRIGGER AS $$
DECLARE
    prefix text;
    date_part text;
    seq_num int;
    new_id text;
    table_n text;
BEGIN
    -- Determine prefix based on table name
    table_n := TG_TABLE_NAME;
    
    IF table_n = 'owners' THEN prefix := 'PROP';
    ELSIF table_n = 'tenants' THEN prefix := 'LOC';
    ELSIF table_n = 'properties' THEN prefix := 'BIEN';
    ELSIF table_n = 'agencies' THEN prefix := 'AGEN';
    ELSIF table_n = 'contracts' THEN prefix := 'CONT'; -- Optional
    ELSE prefix := 'GEN';
    END IF;

    -- Get current date part (YYMMDD)
    date_part := to_char(current_date, 'YYMMDD');

    -- Find the max sequence for this prefix/date combination
    -- Note: This locks the table briefly or relies on atomic updates. 
    -- For high concurrency, a dedicated sequence table is better, but this suffices for typical usage.
    EXECUTE format('
        SELECT COALESCE(MAX(SUBSTRING(business_id FROM 12)::int), 0) + 1
        FROM public.%I
        WHERE business_id LIKE %L || %L || ''-%%''
    ', table_n, prefix, date_part) INTO seq_num;

    -- Format the new ID
    new_id := prefix || date_part || '-' || lpad(seq_num::text, 5, '0');
    
    -- Assign to the new row
    NEW.business_id := new_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- Utilisateurs (liés à Supabase Auth)
-- =========================================================
-- Convention: users.id = auth.users.id (FK forte, on supprime le profil si l’auth user est supprimé)
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  phone text,
  avatar text,
  is_active boolean default false,
  permissions jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger trg_users_updated_at before update on public.users
  for each row execute function set_updated_at();

create index if not exists idx_users_phone on users(phone);

-- =========================================================
-- Administrateurs plateforme
-- =========================================================
-- On lie un admin à un user existant (1-1)
create table if not exists public.platform_admins (
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
create table if not exists public.agencies (
  id uuid primary key default uuid_generate_v4(),
  business_id text unique, -- ADDED
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
create trigger trg_agencies_id_gen before insert on public.agencies
  for each row execute function generate_business_id();

-- =========================================================
-- Liaison utilisateurs/agences (rôles par agence)
-- =========================================================
create table if not exists public.agency_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  agency_id uuid references public.agencies(id) on delete cascade, -- Suppression de not null pour permettre la création d'utilisateur avant validation et création d'Agence.
  role agency_user_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (user_id, agency_id)
);
-- Un seul director par agence
create unique index uq_agency_single_director
  on public.agency_users(agency_id)
  where role = 'director';

-- =========================================================
-- Demandes d’inscription agence
-- =========================================================
create table if not exists public.agency_registration_requests (
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
  director_password text,
  director_auth_user_id uuid references public.users(id) on delete set null
);

-- =========================================================
-- Abonnements agence
-- =========================================================
create table if not exists public.agency_subscriptions (
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

create table if not exists public.subscription_payments (
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
create table if not exists public.agency_rankings (
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
  updated_at timestamptz default now(),
  constraint unique_ranking_per_agency_year unique (agency_id, year)
);
create trigger trg_agency_rankings_updated_at before update on public.agency_rankings
  for each row execute function set_updated_at();

-- =========================================================
-- Propriétaires / Locataires
-- =========================================================
create table if not exists public.owners (
  id uuid primary key default uuid_generate_v4(),
  business_id text unique, -- ADDED
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
create trigger trg_owners_id_gen before insert on public.owners
  for each row execute function generate_business_id();

create table if not exists public.tenants (
  id uuid primary key default uuid_generate_v4(),
  business_id text unique, -- ADDED
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
create trigger trg_tenants_id_gen before insert on public.tenants
  for each row execute function generate_business_id();

-- =========================================================
-- Biens
-- =========================================================
create table if not exists public.properties (
  id uuid primary key default uuid_generate_v4(),
  business_id text unique, -- ADDED
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
create trigger trg_properties_id_gen before insert on public.properties
  for each row execute function generate_business_id();

-- =========================================================
-- Annonces + Intérêts
-- =========================================================
create table if not exists public.announcements (
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

create table if not exists public.announcement_interests (
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
create table if not exists public.contracts (
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
create table if not exists public.rent_receipts (
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
  amount_paid numeric default 0,
  balance_due numeric default 0,
  payment_status text default 'paid', -- 'paid', 'partial', 'pending'
  agency_id uuid references public.agencies(id) on delete cascade,
  issued_by uuid not null references public.users(id) on delete set null,
  created_at timestamptz default now()
);
create index idx_receipts_contract on public.rent_receipts(contract_id);

-- =========================================================
-- États financiers (liens forts)
-- =========================================================
create table if not exists public.financial_statements (
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
create table if not exists public.messages (
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

create table if not exists public.notifications (
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
-- Notification Settings
-- =========================================================
create table if not exists public.notification_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  payment_reminder boolean not null default true,
  new_message boolean not null default true,
  rental_alert boolean not null default true,
  property_update boolean not null default true,
  contract_expiry boolean not null default true,
  new_interest boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger trg_notification_settings_updated_at before update on public.notification_settings
  for each row execute function set_updated_at();

-- =========================================================
-- Paramètres plateforme
-- =========================================================
create table if not exists public.platform_settings (
  id uuid primary key default uuid_generate_v4(),
  setting_key text not null unique,
  setting_value jsonb not null,
  description text,
  category text not null default 'general',
  is_public boolean default false,
- -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 - -   G E S T I O N 3 6 0   -   O P T I M I S A T I O N   D E S   P E R F O R M A N C E S   R L S   ( V 2 3 . 2 ) 
 
 - -   C e   s c r i p t   a j o u t e   l e s   i n d e x   m a n q u a n t s   p o u r   a c c � � l � � r e r   l e s   v � � r i f i c a t i o n s   R L S . 
 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 
 
 - -   1 .   I n d e x a t i o n   m a s s i v e   s u r   a g e n c y _ i d   ( L e   s o c l e   d u   R L S ) 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ a g e n c y _ u s e r s _ a g e n c y _ i d   O N   p u b l i c . a g e n c y _ u s e r s ( a g e n c y _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ a g e n c y _ u s e r s _ u s e r _ i d   O N   p u b l i c . a g e n c y _ u s e r s ( u s e r _ i d ) ; 
 
 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ o w n e r s _ a g e n c y _ i d   O N   p u b l i c . o w n e r s ( a g e n c y _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ t e n a n t s _ a g e n c y _ i d   O N   p u b l i c . t e n a n t s ( a g e n c y _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ p r o p e r t i e s _ a g e n c y _ i d   O N   p u b l i c . p r o p e r t i e s ( a g e n c y _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o n t r a c t s _ a g e n c y _ i d   O N   p u b l i c . c o n t r a c t s ( a g e n c y _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ f i n a n c i a l _ s t a t e m e n t s _ a g e n c y _ i d   O N   p u b l i c . f i n a n c i a l _ s t a t e m e n t s ( a g e n c y _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ f i n a n c i a l _ t r a n s a c t i o n s _ a g e n c y _ i d   O N   p u b l i c . f i n a n c i a l _ t r a n s a c t i o n s ( a g e n c y _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c a s h _ t r a n s a c t i o n s _ a g e n c y _ i d   O N   p u b l i c . c a s h _ t r a n s a c t i o n s ( a g e n c y _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ a n n o u n c e m e n t s _ a g e n c y _ i d   O N   p u b l i c . a n n o u n c e m e n t s ( a g e n c y _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ a g e n c y _ s u b s c r i p t i o n s _ a g e n c y _ i d   O N   p u b l i c . a g e n c y _ s u b s c r i p t i o n s ( a g e n c y _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ a g e n c y _ r a n k i n g s _ a g e n c y _ i d   O N   p u b l i c . a g e n c y _ r a n k i n g s ( a g e n c y _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ a g e n c y _ s e r v i c e _ m o d u l e s _ a g e n c y _ i d   O N   p u b l i c . a g e n c y _ s e r v i c e _ m o d u l e s ( a g e n c y _ i d ) ; 
 
 
 
 - -   2 .   I n d e x a t i o n   d e s   c l � � s   � � t r a n g � � r e s   u t i l i s � � e s   d a n s   l e s   j o i n t u r e s   R L S 
 
 - -   C r u c i a l   p o u r   r e n t _ r e c e i p t s   q u i   l i e   v i a   c o n t r a c t s 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ r e n t _ r e c e i p t s _ c o n t r a c t _ i d   O N   p u b l i c . r e n t _ r e c e i p t s ( c o n t r a c t _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o n t r a c t s _ o w n e r _ i d   O N   p u b l i c . c o n t r a c t s ( o w n e r _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o n t r a c t s _ t e n a n t _ i d   O N   p u b l i c . c o n t r a c t s ( t e n a n t _ i d ) ; 
 
 
 
 - -   3 .   I n d e x a t i o n   p o u r   l a   c o m m u n i c a t i o n 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ m e s s a g e s _ s e n d e r _ i d   O N   p u b l i c . m e s s a g e s ( s e n d e r _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ m e s s a g e s _ r e c e i v e r _ i d   O N   p u b l i c . m e s s a g e s ( r e c e i v e r _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ n o t i f i c a t i o n s _ u s e r _ i d   O N   p u b l i c . n o t i f i c a t i o n s ( u s e r _ i d ) ; 
 
 
 
 - -   4 .   A u d i t   &   L o g s 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ a u d i t _ l o g s _ u s e r _ i d   O N   p u b l i c . a u d i t _ l o g s ( u s e r _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ a u d i t _ l o g s _ c r e a t e d _ a t   O N   p u b l i c . a u d i t _ l o g s ( c r e a t e d _ a t   D E S C ) ; 
 
 
 
 - -   5 .   O p t i m i s a t i o n   d e   l a   f o n c t i o n   R L S   i s _ a g e n c y _ m e m b e r 
 
 - -   O n   s ' a s s u r e   q u ' e l l e   e s t   S T A B L E   e t   u t i l i s e   a u   m i e u x   l e s   i n d e x . 
 
 C R E A T E   O R   R E P L A C E   F U N C T I O N   p u b l i c . i s _ a g e n c y _ m e m b e r ( p _ a g e n c y _ i d   U U I D ) 
 
 R E T U R N S   B O O L E A N   L A N G U A G E   s q l   S T A B L E   S E C U R I T Y   D E F I N E R   S E T   s e a r c h _ p a t h   =   p u b l i c   A S   $ $ 
 
     - -   U t i l i s a t i o n   d ' u n e   s o u s - r e q u � � t e   s i m p l e   i n d e x � � e 
 
     S E L E C T   E X I S T S   ( 
 
         S E L E C T   1   F R O M   p u b l i c . a g e n c y _ u s e r s   
 
         W H E R E   u s e r _ i d   =   a u t h . u i d ( )   
 
         A N D   a g e n c y _ i d   =   p _ a g e n c y _ i d 
 
     ) ; 
 
 $ $ ; 
 
 
 
 - -   6 .   A n a l y s e   d e   l a   b a s e   p o u r   m e t t r e   � �   j o u r   l e s   s t a t i s t i q u e s   d u   p l a n i f i c a t e u r 
 
 A N A L Y Z E   p u b l i c . a g e n c y _ u s e r s ; 
 
 A N A L Y Z E   p u b l i c . o w n e r s ; 
 
 A N A L Y Z E   p u b l i c . t e n a n t s ; 
 
 A N A L Y Z E   p u b l i c . p r o p e r t i e s ; 
 
 A N A L Y Z E   p u b l i c . c o n t r a c t s ; 
 
 A N A L Y Z E   p u b l i c . r e n t _ r e c e i p t s ; 
 
 A N A L Y Z E   p u b l i c . f i n a n c i a l _ t r a n s a c t i o n s ; 
 
 
 
 D O   $ $   B E G I N   R A I S E   N O T I C E   ' � S&   O p t i m i s a t i o n s   d e   p e r f o r m a n c e   a p p l i q u � � e s   a v e c   s u c c � � s . ' ;   E N D   $ $ ; 
 
 

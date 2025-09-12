create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

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

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;


-- Convention: users.id = auth.users.id (FK forte, on supprime le profil si l’auth user est supprimé)
create table public.users (
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

create table public.agency_users (
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
  director_password text,
  director_auth_user_id uuid references public.users(id) on delete set null
);

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
  updated_at timestamptz default now(),
  constraint unique_ranking_per_agency_year unique (agency_id, year)
);
create trigger trg_agency_rankings_updated_at before update on public.agency_rankings
  for each row execute function set_updated_at();

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

create table public.notification_settings (
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

create index idx_owners_agency on public.owners(agency_id);
create index idx_tenants_agency on public.tenants(agency_id);
create index idx_ann_interests_user on public.announcement_interests(user_id);



import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { BarChart3, TrendingUp, Download, Calendar, DollarSign, Home, Users } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardStats, useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { Property, Contract, Owner, Tenant } from '../../types/db';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
);

export const ReportsHub: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReport, setSelectedReport] = useState('overview');
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number; commissions: number }[]>([]);

  const { user } = useAuth();

  // Données réelles de l'agence
  const { stats: dashboardStats, loading: statsLoading, error: statsError } = useDashboardStats();
  const { data: properties, loading: propertiesLoading, error: propertiesError } = useRealtimeData<Property>(
    (params) => dbService.properties.getAll(params),
    'properties',
    { agency_id: user?.agency_id ?? undefined } // Handle null to satisfy TS2322
  );
  const { data: contracts, loading: contractsLoading, error: contractsError } = useRealtimeData<Contract>(
    (params) => dbService.contracts.getAll(params),
    'contracts',
    { agency_id: user?.agency_id ?? undefined } // Handle null
  );
  const { data: owners, loading: ownersLoading, error: ownersError } = useRealtimeData<Owner>(
    (params) => dbService.owners.getAll(params),
    'owners',
    { agency_id: user?.agency_id ?? undefined } // Handle null
  );
  const { data: tenants, loading: tenantsLoading, error: tenantsError } = useRealtimeData<Tenant>(
    (params) => dbService.tenants.getAll(params),
    'tenants',
    { agency_id: user?.agency_id ?? undefined } // Handle null
  );

  // Fetch monthly revenue
  useEffect(() => {
    if (user?.agency_id) {
      dbService.getMonthlyRevenue(user.agency_id)
        .then(setMonthlyRevenue)
        .catch(err => {
          console.error('Erreur chargement revenu mensuel:', err);
          toast.error('Erreur lors du chargement des revenus mensuels');
        });
    }
  }, [user?.agency_id]);

  // Handle errors
  useEffect(() => {
    if (statsError) toast.error(statsError);
    if (propertiesError) toast.error(propertiesError);
    if (contractsError) toast.error(contractsError);
    if (ownersError) toast.error(ownersError);
    if (tenantsError) toast.error(tenantsError);
  }, [statsError, propertiesError, contractsError, ownersError, tenantsError]);

  // Calculs basés sur les vraies données
  const reportData = dashboardStats ? {
    overview: {
      totalRevenue: dashboardStats.monthlyRevenue,
      totalCommissions: monthlyRevenue.length > 0 ? monthlyRevenue[monthlyRevenue.length - 1].commissions : 0,
      activeContracts: dashboardStats.activeContracts,
      newClients: (owners?.length || 0) + (tenants?.length || 0),
      occupancyRate: dashboardStats.occupancyRate,
    },
    properties: {
      totalProperties: properties?.length || 0,
      availableProperties: properties?.filter(p => p.is_available).length || 0,
      rentedProperties: properties?.filter(p => !p.is_available).length || 0,
      soldProperties: contracts?.filter(c => c.type === 'vente').length || 0,
    },
    financial: {
      monthlyRevenue: monthlyRevenue.length > 0 ? monthlyRevenue : [
        { month: 'Jan', revenue: 0, commissions: 0 },
        { month: 'Fév', revenue: 0, commissions: 0 },
        { month: 'Mar', revenue: 0, commissions: 0 },
        { month: 'Avr', revenue: 0, commissions: 0 },
        { month: 'Mai', revenue: 0, commissions: 0 },
        { month: 'Jun', revenue: 0, commissions: 0 },
      ],
    },
  } : null;

  // Calculate growth percentages
  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return Number(((current - previous) / previous * 100).toFixed(1));
  };

  const revenueGrowth = monthlyRevenue.length >= 2
    ? getGrowthPercentage(monthlyRevenue[monthlyRevenue.length - 1].revenue, monthlyRevenue[monthlyRevenue.length - 2].revenue)
    : 0;
  const commissionsGrowth = monthlyRevenue.length >= 2
    ? getGrowthPercentage(monthlyRevenue[monthlyRevenue.length - 1].commissions, monthlyRevenue[monthlyRevenue.length - 2].commissions)
    : 0;
  const contractsGrowth = dashboardStats && dashboardStats.activeContracts > 0
    ? 5 // Placeholder: Calculate from historical contract data
    : 0;
  const clientsGrowth = reportData
    ? getGrowthPercentage(reportData.overview.newClients, reportData.overview.newClients * 0.85) // Placeholder: Use historical client data
    : 0;

  // Chart data
  const revenueChartData = reportData ? {
    labels: reportData.financial.monthlyRevenue.map(m => m.month),
    datasets: [
      {
        label: 'Revenus (FCFA)',
        data: reportData.financial.monthlyRevenue.map(m => m.revenue),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Commissions (FCFA)',
        data: reportData.financial.monthlyRevenue.map(m => m.commissions),
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  } : {
    labels: [],
    datasets: [],
  };

  const propertyTypeData = reportData ? {
    labels: ['Villas', 'Appartements', 'Terrains', 'Immeubles', 'Autres'],
    datasets: [
      {
        data: [
          properties?.filter(p => p.details?.type === 'villa').length || 0,
          properties?.filter(p => p.details?.type === 'appartement').length || 0,
          properties?.filter(p => p.details?.type === 'terrain_nu').length || 0,
          properties?.filter(p => p.details?.type === 'immeuble').length || 0,
          properties?.filter(p => p.details?.type === 'autres').length || 0,
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  } : {
    labels: [],
    datasets: [],
  };

  const occupancyData = reportData ? {
    labels: reportData.financial.monthlyRevenue.map(m => m.month),
    datasets: [
      {
        label: 'Taux d\'occupation (%)',
        data: reportData.financial.monthlyRevenue.map((_, i) => reportData.overview.occupancyRate * (0.9 + i * 0.02)),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  } : {
    labels: [],
    datasets: [],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const reportTypes = [
    { id: 'overview', name: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'properties', name: 'Propriétés', icon: Home },
    { id: 'financial', name: 'Financier', icon: DollarSign },
    { id: 'clients', name: 'Clients', icon: Users },
  ];

  const isLoading = statsLoading || propertiesLoading || contractsLoading || ownersLoading || tenantsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports et Statistiques</h1>
          <p className="text-gray-600 mt-1">
            Analysez les performances de votre agence
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Report Type Selector */}
      <Card>
        <div className="flex flex-wrap gap-2">
          {reportTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedReport(type.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                selectedReport === type.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <type.icon className="h-4 w-4" />
              <span>{type.name}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Overview Report */}
          {selectedReport === 'overview' && (
            reportData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <div className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="inline-flex items-center justify-center p-3 rounded-lg bg-green-500">
                            <DollarSign className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Revenus totaux
                            </dt>
                            <dd className="text-lg font-semibold text-gray-900">
                              {formatCurrency(reportData.overview.totalRevenue)}
                            </dd>
                          </dl>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center text-sm">
                          <span className={`flex items-center ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {revenueGrowth >= 0 ? '↗' : '↘'} {Math.abs(revenueGrowth)}%
                          </span>
                          <span className="ml-2 text-gray-500">vs mois précédent</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="inline-flex items-center justify-center p-3 rounded-lg bg-blue-500">
                            <TrendingUp className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Commissions
                            </dt>
                            <dd className="text-lg font-semibold text-gray-900">
                              {formatCurrency(reportData.overview.totalCommissions)}
                            </dd>
                          </dl>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center text-sm">
                          <span className={`flex items-center ${commissionsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {commissionsGrowth >= 0 ? '↗' : '↘'} {Math.abs(commissionsGrowth)}%
                          </span>
                          <span className="ml-2 text-gray-500">vs mois précédent</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="inline-flex items-center justify-center p-3 rounded-lg bg-yellow-500">
                            <Home className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Contrats actifs
                            </dt>
                            <dd className="text-lg font-semibold text-gray-900">
                              {reportData.overview.activeContracts}
                            </dd>
                          </dl>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center text-sm">
                          <span className={`flex items-center ${contractsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {contractsGrowth >= 0 ? '↗' : '↘'} {Math.abs(contractsGrowth)}%
                          </span>
                          <span className="ml-2 text-gray-500">vs mois précédent</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="inline-flex items-center justify-center p-3 rounded-lg bg-purple-500">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Nouveaux clients
                            </dt>
                            <dd className="text-lg font-semibold text-gray-900">
                              {reportData.overview.newClients}
                            </dd>
                          </dl>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center text-sm">
                          <span className={`flex items-center ${clientsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {clientsGrowth >= 0 ? '↗' : '↘'} {Math.abs(clientsGrowth)}%
                          </span>
                          <span className="ml-2 text-gray-500">vs mois précédent</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Évolution des revenus
                      </h3>
                      <div className="h-64">
                        <Bar data={revenueChartData} options={chartOptions} />
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Répartition par type de bien
                      </h3>
                      <div className="h-64">
                        <Pie data={propertyTypeData} options={{ responsive: true, maintainAspectRatio: false }} />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Additional Chart */}
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Taux d'occupation mensuel
                    </h3>
                    <div className="h-64">
                      <Line data={occupancyData} options={chartOptions} />
                    </div>
                  </div>
                </Card>

                {/* Performance Indicators */}
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Indicateurs de performance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {reportData.overview.occupancyRate}%
                        </div>
                        <p className="text-sm text-gray-600">Taux d'occupation</p>
                        <Badge variant={reportData.overview.occupancyRate >= 90 ? 'success' : reportData.overview.occupancyRate >= 75 ? 'info' : 'warning'} size="sm" className="mt-2">
                          {reportData.overview.occupancyRate >= 90 ? 'Excellent' : reportData.overview.occupancyRate >= 75 ? 'Bon' : 'À améliorer'}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          -j
                        </div>
                        <p className="text-sm text-gray-600">Délai moyen de location</p>
                        <Badge variant="info" size="sm" className="mt-2">
                          À calculer
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-yellow-600 mb-2">
                          -%
                        </div>
                        <p className="text-sm text-gray-600">Satisfaction client</p>
                        <Badge variant="warning" size="sm" className="mt-2">
                          À calculer
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )
          )}

          {/* Other report types placeholder */}
          {selectedReport !== 'overview' && (
            <Card className="p-8 text-center">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Rapport {reportTypes.find(t => t.id === selectedReport)?.name}
              </h3>
              <p className="text-gray-600 mb-4">
                Ce rapport sera disponible dans une prochaine version.
              </p>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Programmer un rapport
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
};




import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../lib/supabase';
import { Entity } from '../types/db';
import { toast } from 'react-hot-toast';
import debounce from 'lodash/debounce';
import equal from 'fast-deep-equal';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { formatSbError, isRlsDenied } from '../lib/helpers';
import { supabase } from '../lib/config';

// Logging conditionnel (DEV uniquement)
const log = (...args: any[]) => {
  if (import.meta.env.DEV) console.log(...args);
};


export function mapSupabaseError(err: unknown, context: string): string {
  if (!(err instanceof Error)) return 'Erreur inconnue';
  if (isRlsDenied(err)) return 'Accès refusé : permissions insuffisantes (RLS).';
  if (err.message.includes('Supabase non configuré') || err.message.includes('401')) {
    return 'Configuration Supabase manquante. Vérifiez les variables d\'environnement.';
  }
  if (err.message.includes('JWT')) return 'Session expirée. Veuillez vous reconnecter.';
  return formatSbError(context, err);
}


export interface GetAllParams {
  /** Contexte multi-agences */
  agency_id?: string;

  /** Filtres relationnels */
  owner_id?: string;
  tenant_id?: string;
  property_id?: string;
  contract_id?: string;

  /** Filtres de statut */
  standing?: string;        // pour les biens
  status?: string;          // pour contrats, paiements, etc.

  /** Recherche textuelle globale */
  search?: string;

  /** Pagination */
  limit?: number;
  offset?: number;

  /** Tri */
  order_by?: string;
  order_dir?: 'asc' | 'desc';

  /** Fourre-tout extensible (évite les erreurs TS à chaque nouveau filtre) */
  [key: string]: any;
}


interface UseRealtimeDataOptions {
  single?: boolean;
  onError?: (err: string) => void;
}

export interface UseRealtimeDataResult<T extends Entity> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useRealtimeData<T extends Entity>(
  fetchFunction: (params?: GetAllParams) => Promise<T[]>,
  tableName: string,
  params?: GetAllParams,
  options?: UseRealtimeDataOptions
): UseRealtimeDataResult<T> {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestDataRef = useRef<T[]>([]);
  const isFetchingRef = useRef(false);
  const channelRef = useRef<any>(null);
  const subscriptionStatusRef = useRef<string>('INITIAL');
  const isMountedRef = useRef(true);
  const lastDepsRef = useRef({ agencyId: null as string | null, authLoading: null as boolean | null, params: null as GetAllParams | null });

  // Stabiliser agencyId et params
  const agencyId = useMemo(() => (authLoading ? null : user?.agency_id ?? null), [user?.agency_id, authLoading]);
  const fetchParams = useMemo(() => ({ ...params, agency_id: agencyId ?? params?.agency_id }), [params, agencyId]);

  // Vérifier si les dépendances ont changé
  const depsChanged = !equal(
    { agencyId, authLoading, params: fetchParams },
    { agencyId: lastDepsRef.current.agencyId, authLoading: lastDepsRef.current.authLoading, params: lastDepsRef.current.params }
  );

  // Fonction de fetch
  const fetchData = useCallback(
    async (params: GetAllParams, signal: AbortSignal) => {
      if (!isMountedRef.current) {
        log(`🚫 Ignorer fetch ${tableName} : composant démonté`);
        return;
      }
      if (!params.agency_id) {
        log(`🚫 Ignorer fetch ${tableName} : agency_id manquant`);
        setError('Aucune agence associée à l’utilisateur');
        setLoading(false);
        toast.error('Aucune agence associée à l’utilisateur');
        return;
      }
      if (isFetchingRef.current) {
        log(`🚫 Ignorer fetch ${tableName} : déjà en cours`);
        return;
      }

      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      log(`🔄 Chargement ${tableName} pour agence:`, params.agency_id);

      try {
        const result = await fetchFunction(params);
        if (!signal.aborted && isMountedRef.current) {
          if (!equal(latestDataRef.current, result)) {
            log(`✅ ${tableName} mis à jour:`, result.length);
            latestDataRef.current = result;
            setData(result);
          } else {
            log(`✅ ${tableName} inchangé`);
          }
        }
      } catch (err) {
        if (signal.aborted || !isMountedRef.current) {
          log(`🚫 Fetch ${tableName} annulé ou composant démonté`);
          return;
        }
        log(`❌ Erreur chargement ${tableName}:`, err);
        const errMsg = mapSupabaseError(err, `Erreur chargement ${tableName}`);
        setError(errMsg);
        options?.onError?.(errMsg);
        toast.error(errMsg);
        setData([]);
      } finally {
        if (!signal.aborted && isMountedRef.current) {
          isFetchingRef.current = false;
          setLoading(false);
          log(`✅ Fetch ${tableName} terminé`);
        }
      }
    },
    [fetchFunction, tableName, options]
  );

  // Gestion des abonnements en temps réel
  const debouncedRefetch = useCallback(
    debounce((params: GetAllParams) => {
      if (!isMountedRef.current) {
        log(`🚫 Ignorer refetch ${tableName} : composant démonté`);
        return;
      }
      log(`🔄 Refetch déclenché pour ${tableName}`);
      fetchData(params, new AbortController().signal);
    }, 1000),
    [fetchData, tableName]
  );

  useEffect(() => {
    log(`🔄 useEffect exécuté pour ${tableName}, agencyId: ${agencyId}, authLoading: ${authLoading}, params:`, fetchParams);
    console.log('🔄 Dépendances useRealtimeData:', { agencyId, authLoading, tableName, params: fetchParams });

    if (!depsChanged) {
      log(`🚫 useEffect ignoré pour ${tableName} : dépendances inchangées`);
      return;
    }

    lastDepsRef.current = { agencyId, authLoading, params: fetchParams };
    isMountedRef.current = true;

    if (authLoading) {
      log(`⏳ Authentification en cours, attente pour ${tableName}`);
      setLoading(true);
      return;
    }

    if (!agencyId) {
      log(`🚫 Pas d'agence pour ${tableName}`);
      setLoading(false);
      setError('Aucune agence associée à l’utilisateur');
      toast.error('Aucune agence associée à l’utilisateur');
      setData([]);
      return;
    }

    log(`🔍 Initialisation fetch pour ${tableName} avec params:`, fetchParams);
    const abortController = new AbortController();
    fetchData(fetchParams, abortController.signal);

    // Vérifier si un canal actif existe
    if (channelRef.current && subscriptionStatusRef.current === 'SUBSCRIBED') {
      log(`🚫 Canal actif pour ${tableName}, ignorer réinitialisation`);
      return;
    }

    log(`📡 Initialisation subscription pour ${tableName}, agency: ${agencyId}`);
    const channel = supabase
      .channel(`public:${tableName}:${agencyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `agency_id=eq.${agencyId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
          log(`📡 Événement reçu pour ${tableName}:`, payload);
          const row = (payload.new || payload.old) as { agency_id?: string };
          if (
            row?.agency_id === agencyId &&
            ['INSERT', 'UPDATE', 'DELETE'].includes(payload.eventType)
          ) {
            log(`✅ Changement valide dans ${tableName} (agence ${agencyId})`);
            debouncedRefetch(fetchParams);
          } else {
            log(`🚫 Événement ignoré pour ${tableName}`);
          }
        }
      )
      .subscribe((status) => {
        log(`📡 Statut subscription ${tableName}:`, status);
        subscriptionStatusRef.current = status;
      });

    channelRef.current = channel;

    return () => {
      log(`🛑 Cleanup pour ${tableName}`);
      isMountedRef.current = false;
      abortController.abort();
      if (depsChanged && channelRef.current) {
        log(`🛑 Suppression subscription ${tableName}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        subscriptionStatusRef.current = 'CLOSED';
      }
    };
  }, [agencyId, authLoading, tableName, JSON.stringify(fetchParams)]);

  const refetch = useCallback(() => {
    if (agencyId && isMountedRef.current) {
      debouncedRefetch(fetchParams);
    }
  }, [agencyId, debouncedRefetch, fetchParams]);

  return { data, loading, error, refetch, setData };
}

export function useDashboardStats() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<{
    totalProperties: number;
    totalOwners: number;
    totalTenants: number;
    totalContracts: number;
    monthlyRevenue: number;
    activeContracts: number;
    occupancyRate: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (signal: AbortSignal) => {
    if (!user?.agency_id) {
      setStats({
        totalProperties: 0,
        totalOwners: 0,
        totalTenants: 0,
        totalContracts: 0,
        monthlyRevenue: 0,
        activeContracts: 0,
        occupancyRate: 0,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dbService.getDashboardStats(user.agency_id);
      if (!signal.aborted) setStats(result);
    } catch (err) {
      if (signal.aborted) return;
      log('❌ Erreur stats:', err);
      const errMsg = mapSupabaseError(err, 'Erreur chargement stats');
      setError(errMsg);
      toast.error(errMsg);
      setStats({
        totalProperties: 0,
        totalOwners: 0,
        totalTenants: 0,
        totalContracts: 0,
        monthlyRevenue: 0,
        activeContracts: 0,
        occupancyRate: 0,
      });
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [user?.agency_id]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchStats(abortController.signal);
    return () => abortController.abort();
  }, [fetchStats]);

  const refetch = useCallback(() => {
    fetchStats(new AbortController().signal);
  }, [fetchStats]);

  return { stats, loading, error, refetch };
}

export function useSupabaseCreate<T extends Entity>(
  createFunction: (data: Partial<T>) => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (err: string) => void;
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const create = async (data: Partial<T>) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await createFunction(data);
      options?.onSuccess?.(result);
      if (options?.successMessage) toast.success(options.successMessage);
      setSuccess(true);
      return result;
    } catch (err) {
      log('❌ Erreur création:', err);
      const errMsg = mapSupabaseError(err, 'Erreur création');
      setError(errMsg);
      options?.onError?.(errMsg);
      if (options?.errorMessage) toast.error(options.errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
  };

  return { create, loading, error, success, reset };
}

export function useSupabaseUpdate<T extends Entity>(
  updateFunction: (id: string, data: Partial<T>) => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (err: string) => void;
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = async (id: string, data: Partial<T>) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateFunction(id, data);
      options?.onSuccess?.(result);
      if (options?.successMessage) toast.success(options.successMessage);
      setSuccess(true);
      return result;
    } catch (err) {
      log('❌ Erreur mise à jour:', err);
      const errMsg = mapSupabaseError(err, 'Erreur mise à jour');
      setError(errMsg);
      options?.onError?.(errMsg);
      if (options?.errorMessage) toast.error(options.errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
  };

  return { update, loading, error, success, reset };
}

export function useSupabaseDelete(
  deleteFunction: (id: string) => Promise<boolean>,
  options?: {
    onSuccess?: () => void;
    onError?: (err: string) => void;
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const deleteItem = async (id: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await deleteFunction(id);
      setSuccess(true);
      options?.onSuccess?.();
      if (options?.successMessage) toast.success(options.successMessage);
    } catch (err) {
      log('❌ Erreur suppression:', err);
      const errMsg = mapSupabaseError(err, 'Erreur suppression');
      setError(errMsg);
      options?.onError?.(errMsg);
      if (options?.errorMessage) toast.error(options.errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
  };

  return { deleteItem, loading, error, success, reset };
}

// hooks/usePermissions

export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<{
    canEdit: boolean;
    canDelete: boolean;
    canContact: boolean;
  }>({ canEdit: false, canDelete: false, canContact: true });

  const checkPermission = async (agencyId: string) => {
    if (!user?.id) return { canEdit: false, canDelete: false, canContact: false };

    try {
      const { data } = await supabase
        .from('agency_users')
        .select('role')
        .eq('user_id', user.id)
        .eq('agency_id', agencyId)
        .single();

      if (!data) return { canEdit: false, canDelete: false, canContact: true };

      const role = data.role;
      const isDirectorOrAdmin = role === 'director' || role === 'admin';
      setPermissions({
        canEdit: isDirectorOrAdmin,
        canDelete: isDirectorOrAdmin,
        canContact: true, // Tous les utilisateurs peuvent contacter
      });
    } catch (err) {
      console.error('Erreur lors de la vérification des permissions:', err);
      return { canEdit: false, canDelete: false, canContact: true };
    }
  };

  return { checkPermission, permissions };
};





import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants");
    throw new Error('Configuration Supabase manquante');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage,
        storageKey: 'supabase.auth.token',
    },
});

// Client anonyme pour uploads sans session
export const supabaseAnon: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: undefined, // Désactiver le stockage de session
    },
});





import { supabase, supabaseAnon } from './config'; // Ajouter supabaseAnon
import { formatSbError } from './helpers';
import { RentReceipt, DashboardStats } from '../types/db';
import { propertiesService } from './db/propertiesService';
import { contractsService } from './db/contractsService';
import { ownersService } from './db/ownersService';
import { tenantsService } from './db/tenantsService';
import { usersService } from './db/usersService';
import { platformAdminsService } from './db/platformAdminsService';
import { platformSettingsService } from './db/platformSettingsService';
import { agenciesService } from './db/agenciesService';
import { agencyUsersService } from './db/agencyUsersService';
import { agencyRegistrationRequestsService } from './db/agencyRegistrationRequestsService';
import { agencySubscriptionsService } from './db/agencySubscriptionsService';
import { subscriptionPaymentsService } from './db/subscriptionPaymentsService';
import { agencyRankingsService } from './db/agencyRankingsService';
import { announcementsService } from './db/announcementsService';
import { announcementInterestsService } from './db/announcementInterestsService';
import { rentReceiptsService } from './db/rentReceiptsService';
import { financialStatementsService } from './db/financialStatementsService';
import { messagesService } from './db/messagesService';
import { auditLogsService } from './db/auditLogsService';
import { systemAlertsService } from './db/systemAlertsService';
import { notificationsService } from './db/notificationsService';
import { notificationSettingsService } from './db/notificationSettingsService';

export const dbService = {
  async getDashboardStats(agencyId: string): Promise<DashboardStats> {
    try {
      if (!agencyId) {
        throw new Error('agencyId manquant');
      }

      const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

      const [
        { count: totalProperties, error: propertiesError },
        { count: totalOwners, error: ownersError },
        { count: totalTenants, error: tenantsError },
        { count: totalContracts, error: contractsError },
        { data: rentReceipts, error: receiptsError },
        { count: activeContracts, error: activeContractsError },
        { count: occupiedProperties, error: occupiedPropertiesError },
      ] = await Promise.all([
        supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', agencyId),
        supabase
          .from('owners')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', agencyId),
        supabase
          .from('tenants')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', agencyId),
        supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', agencyId),
        supabase
          .from('rent_receipts')
          .select('total_amount')
          .eq('agency_id', agencyId)
          .gte('payment_date', startDate.toISOString())
          .lte('payment_date', endDate.toISOString())
          .returns<RentReceipt[] | null>(),
        supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .eq('status', 'active'),
        supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .eq('is_available', false),
      ]);

      if (propertiesError) throw new Error(formatSbError('❌ properties.count', propertiesError));
      if (ownersError) throw new Error(formatSbError('❌ owners.count', ownersError));
      if (tenantsError) throw new Error(formatSbError('❌ tenants.count', tenantsError));
      if (contractsError) throw new Error(formatSbError('❌ contracts.count', contractsError));
      if (receiptsError) throw new Error(formatSbError('❌ rent_receipts.select', receiptsError));
      if (activeContractsError) throw new Error(formatSbError('❌ contracts.count (active)', activeContractsError));
      if (occupiedPropertiesError) throw new Error(formatSbError('❌ properties.count (occupied)', occupiedPropertiesError));

      const monthlyRevenue = Array.isArray(rentReceipts)
        ? rentReceipts.reduce((sum: number, r: RentReceipt) => sum + (r.total_amount || 0), 0)
        : 0;

      const safeTotalProperties = totalProperties ?? 0;
      const safeOccupiedProperties = occupiedProperties ?? 0;

      const occupancyRate =
        safeTotalProperties > 0
          ? (safeOccupiedProperties / safeTotalProperties) * 100
          : 0;

      return {
        totalProperties: totalProperties || 0,
        totalOwners: totalOwners || 0,
        totalTenants: totalTenants || 0,
        totalContracts: totalContracts || 0,
        monthlyRevenue,
        activeContracts: activeContracts || 0,
        occupancyRate: Number(occupancyRate.toFixed(2)),
      };
    } catch (err) {
      console.error('getDashboardStats error:', err);
      throw new Error(formatSbError('❌ getDashboardStats', err));
    }
  },

  async getMonthlyRevenue(agencyId: string, months: number = 6): Promise<{ month: string; revenue: number; commissions: number }[]> {
    try {
      if (!agencyId) {
        throw new Error('agencyId manquant');
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12
      const startMonth = currentMonth - months + 1;
      const startYear = startMonth <= 0 ? currentYear - 1 : currentYear;
      const adjustedStartMonth = startMonth <= 0 ? startMonth + 12 : startMonth;

      const { data: receipts, error } = await supabase
        .from('rent_receipts')
        .select('period_month, period_year, total_amount')
        .eq('agency_id', agencyId)
        .gte('period_year', startYear.toString())
        .gte('period_month', adjustedStartMonth.toString().padStart(2, '0'))
        .lte('period_year', currentYear.toString())
        .lte('period_month', currentMonth.toString().padStart(2, '0'))
        .returns<RentReceipt[] | null>();

      if (error) throw new Error(formatSbError('❌ rent_receipts.select', error));

      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      const result: { month: string; revenue: number; commissions: number }[] = [];
      for (let i = 0; i < months; i++) {
        const month = (adjustedStartMonth + i - 1) % 12 + 1;
        const year = startYear + Math.floor((adjustedStartMonth + i - 1) / 12);
        const monthData = Array.isArray(receipts)
          ? receipts.filter((r: RentReceipt) => Number(r.period_year) === year && Number(r.period_month) === month)
          : [];
        const revenue = monthData.reduce((sum: number, r: RentReceipt) => sum + (r.total_amount || 0), 0);
        result.push({
          month: monthNames[month - 1],
          revenue,
          commissions: revenue * 0.1, // Adjust based on actual commission logic
        });
      }

      return result.reverse();
    } catch (err) {
      console.error('getMonthlyRevenue error:', err);
      throw new Error(formatSbError('❌ getMonthlyRevenue', err));
    }
  },

  users: usersService,
  platformAdmins: platformAdminsService,
  platformSettings: platformSettingsService,
  agencies: agenciesService,
  agencyUsers: agencyUsersService,
  agencyRegistrationRequests: agencyRegistrationRequestsService,
  agencySubscriptions: agencySubscriptionsService,
  subscriptionPayments: subscriptionPaymentsService,
  agencyRankings: agencyRankingsService,
  owners: ownersService,
  tenants: tenantsService,
  properties: propertiesService,
  announcements: announcementsService,
  announcementInterests: announcementInterestsService,
  contracts: contractsService,
  rentReceipts: rentReceiptsService,
  financialStatements: financialStatementsService,
  messages: messagesService,
  auditLogs: auditLogsService,
  notifications: notificationsService,
  notificationSettings: notificationSettingsService,
  systemAlerts: systemAlertsService,
};
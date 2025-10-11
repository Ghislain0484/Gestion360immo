import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Users,
  UserCheck,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Receipt,
  Eye,
  Edit,
  Printer,
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { BibleVerseCard } from '../ui/BibleVerse';
import { useDashboardStats, useRealtimeData, mapSupabaseError } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Contract, Property, RentReceipt, User } from '../../types/db';
import { AuditLog } from '../../types/platform';
import { AgencyUserRole } from '../../types/enums';

interface Rental {
  id: string;
  property: string;
  tenant: string;
  dueDate: string;
  amount: string;
  status: 'upcoming' | 'warning' | 'overdue';
}

interface Payment {
  id: string;
  type: 'received' | 'paid';
  tenant: string;
  owner: string;
  property: string;
  amount: number;
  date: string;
  receiptNumber: string;
  status: 'completed';
}

interface GetAllParams {
  agency_id?: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, admin, isLoading: authLoading } = useAuth();
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showAllRentals, setShowAllRentals] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [agencyActivities, setAgencyActivities] = useState<
    Array<
      AuditLog & {
        actor?: {
          id: string;
          full_name: string;
          email: string;
          role?: string;
          avatar?: string | null;
        };
      }
    >
  >([]);

  const realtimeFilters = useMemo(
    () => ({ agency_id: user?.agency_id ?? undefined }),
    [user?.agency_id],
  );
  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
      </div>
    );
  }

  if (!user && !admin) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-700 shadow-sm" role="alert">
        Veuillez vous connecter pour acceder au tableau de bord.
      </div>
    );
  }

  const { stats: dashboardStats, loading: statsLoading, error: statsError } = useDashboardStats();

  const {
    data: recentContracts,
    initialLoading: contractsInitialLoading,
    fetching: contractsFetching,
    error: contractsError,
  } = useRealtimeData<Contract>(
    (params?: GetAllParams) => dbService.contracts.getAll(params),
    'contracts',
    realtimeFilters,
  );

  const {
    data: recentProperties,
    initialLoading: propertiesInitialLoading,
    fetching: propertiesFetching,
    error: propertiesError,
  } = useRealtimeData<Property>(
    (params?: GetAllParams) => dbService.properties.getAll(params),
    'properties',
    realtimeFilters,
  );

  const contractsLoading = contractsInitialLoading || contractsFetching;
  const propertiesLoading = propertiesInitialLoading || propertiesFetching;

  const [recentReceipts, setRecentReceipts] = useState<RentReceipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(true);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);
  const agencyId = realtimeFilters.agency_id;

  useEffect(() => {
    if (!agencyId || !Array.isArray(recentContracts)) {
      setRecentReceipts([]);
      setReceiptsLoading(false);
      return;
    }

    const abortController = new AbortController();

    const fetchReceipts = async () => {
      try {
        setReceiptsLoading(true);
        setReceiptsError(null);
        const receipts = await dbService.rentReceipts.getAll({ agency_id: agencyId });
        if (!abortController.signal.aborted) {
          setRecentReceipts(receipts);
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        const errMsg = mapSupabaseError(err, 'Erreur chargement rent_receipts');
        setReceiptsError(errMsg);
        setRecentReceipts([]);
      } finally {
        if (!abortController.signal.aborted) {
          setReceiptsLoading(false);
        }
      }
    };

    fetchReceipts();

    return () => abortController.abort();
  }, [agencyId, recentContracts]);

  useEffect(() => {
    let cancelled = false;

    const loadActivities = async () => {
      if (!agencyId) {
        setAgencyActivities([]);
        setActivitiesLoading(false);
        return;
      }

      setActivitiesLoading(true);
      setActivitiesError(null);

      try {
        const [logs, agencyUsers] = await Promise.all([
          dbService.auditLogs.getAll(120),
          dbService.users.getByAgency(agencyId),
        ]);

        if (cancelled) return;

        const userMap = new Map<string, User & { role: AgencyUserRole; agency_id: string | null }>(
          agencyUsers.map((agencyUser) => [agencyUser.id, agencyUser]),
        );

        const formatted = (logs ?? [])
          .filter((log): log is AuditLog & { user_id: string } => Boolean(log.user_id))
          .map((log) => {
            const actor = userMap.get(log.user_id!);
            return {
              ...log,
              actor: actor
                ? {
                    id: actor.id,
                    full_name: `${actor.first_name} ${actor.last_name}`.trim() || actor.email,
                    email: actor.email,
                    role: actor.role,
                    avatar: actor.avatar ?? null,
                  }
                : undefined,
            };
          })
          .filter((log) => Boolean(log.actor))
          .slice(0, 12);

        setAgencyActivities(formatted);
      } catch (err: any) {
        if (!cancelled) {
          setActivitiesError(err?.message || 'Impossible de charger les activites recentes.');
          setAgencyActivities([]);
        }
      } finally {
        if (!cancelled) {
          setActivitiesLoading(false);
        }
      }
    };

    loadActivities();
    const interval = setInterval(loadActivities, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [agencyId]);

  useEffect(() => {
    const errors = [statsError, contractsError, propertiesError, receiptsError].filter(Boolean);
    setError(errors.length > 0 ? errors.join('; ') : null);
  }, [statsError, contractsError, propertiesError, receiptsError]);

  const stats = useMemo(() => {
    if (!dashboardStats) return [];

    const activeContractsCount = dashboardStats.activeContracts || dashboardStats.totalContracts || 0;
    const inactiveContractsCount = Math.max((dashboardStats.totalContracts || 0) - activeContractsCount, 0);

    return [
      {
        title: 'Proprietes gerees',
        value: dashboardStats.totalProperties.toString(),
        icon: Building2,
        trend: { value: 12, isPositive: true },
        color: 'blue' as const,
      },
      {
        title: 'Proprietaires',
        value: dashboardStats.totalOwners.toString(),
        icon: Users,
        trend: { value: 5, isPositive: true },
        color: 'green' as const,
      },
      {
        title: 'Locataires actifs',
        value: dashboardStats.totalTenants.toString(),
        icon: UserCheck,
        trend: { value: 8, isPositive: true },
        color: 'yellow' as const,
      },
      {
        title: 'Contrats actifs',
        value: activeContractsCount.toString(),
        icon: FileText,
        trend: { value: inactiveContractsCount, isPositive: inactiveContractsCount === 0 },
        color: 'red' as const,
      },
    ];
  }, [dashboardStats]);
  const formatCurrency = (amount: number | null | undefined) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount ?? 0);

  const upcomingRentals = useMemo((): Rental[] => {
    if (!Array.isArray(recentContracts)) return [];

    const msInDay = 1000 * 60 * 60 * 24;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const receiptsByContract = new Map<string, RentReceipt>();
    (Array.isArray(recentReceipts) ? recentReceipts : []).forEach((receipt) => {
      const key = receipt.contract_id;
      const existing = receiptsByContract.get(key);
      if (!existing) {
        receiptsByContract.set(key, receipt);
        return;
      }
      const existingDate = new Date(existing.payment_date ?? existing.created_at);
      const currentDate = new Date(receipt.payment_date ?? receipt.created_at);
      if (currentDate > existingDate) {
        receiptsByContract.set(key, receipt);
      }
    });

    const createDueDate = (baseYear: number, baseMonth: number, day: number, offset = 0) => {
      const totalMonths = baseMonth + offset;
      const year = baseYear + Math.floor(totalMonths / 12);
      const month = ((totalMonths % 12) + 12) % 12;
      const lastDay = new Date(year, month + 1, 0).getDate();
      return new Date(year, month, Math.min(day, lastDay));
    };

    return recentContracts
      .filter(
        (contract: Contract) =>
          ['active', 'renewed', 'draft'].includes(contract.status) && (contract.monthly_rent ?? 0) > 0,
      )
      .map((contract: Contract) => {
        const start = new Date(contract.start_date);
        if (Number.isNaN(start.getTime())) return null;

        const dueDay = start.getDate() || 1;
        let baseYear = start.getFullYear();
        let baseMonth = start.getMonth();
        let offset = 0;

        const latestReceipt = receiptsByContract.get(contract.id);
        if (latestReceipt) {
          baseYear = latestReceipt.period_year ?? start.getFullYear();
          baseMonth = (latestReceipt.period_month ?? start.getMonth() + 1) - 1;
          offset = 1; // next cycle after last receipt
        }

        let nextDue = createDueDate(baseYear, baseMonth, dueDay, offset);
        while (nextDue < startOfToday) {
          offset += 1;
          nextDue = createDueDate(baseYear, baseMonth, dueDay, offset);
        }

        const diffInDays = Math.ceil((nextDue.getTime() - startOfToday.getTime()) / msInDay);
        if (diffInDays < 0 || diffInDays > 5) {
          return null;
        }

        return {
          id: contract.id,
          property: `Propriete #${contract.property_id}`,
          tenant: `Locataire #${contract.tenant_id}`,
          dueDate: nextDue.toISOString().split('T')[0],
          amount: formatCurrency(contract.monthly_rent ?? 0),
          status: diffInDays <= 1 ? 'warning' : 'upcoming',
        };
      })
      .filter((item): item is Rental => Boolean(item))
      .slice(0, 5);
  }, [recentContracts, recentReceipts, formatCurrency]);

  const recentPayments = useMemo((): Payment[] => {
    if (!Array.isArray(recentReceipts) || !Array.isArray(recentContracts)) return [];

    const contractMap = new Map<string, Contract>();
    recentContracts.forEach((contract) => contractMap.set(contract.id, contract));

    const entries: Payment[] = [];

    recentReceipts.forEach((receipt) => {
      const contract = contractMap.get(receipt.contract_id);
      const baseDescriptor = {
        tenant: `Locataire #${contract?.tenant_id ?? receipt.tenant_id ?? 'Inconnu'}`,
        owner: `Proprietaire #${contract?.owner_id ?? receipt.owner_id ?? 'Inconnu'}`,
        property: `Propriete #${contract?.property_id ?? receipt.property_id ?? 'Inconnu'}`,
        receiptNumber: receipt.receipt_number,
      };

      const paymentDate = new Date(receipt.payment_date || receipt.created_at);
      const formattedDate = paymentDate.toISOString().split('T')[0];

      entries.push({
        id: `${receipt.id}-rent`,
        type: 'received',
        amount: receipt.total_amount,
        date: formattedDate,
        status: 'completed',
        ...baseDescriptor,
      });

      if ((receipt.owner_payment ?? 0) > 0) {
        entries.push({
          id: `${receipt.id}-owner`,
          type: 'paid',
          amount: receipt.owner_payment ?? 0,
          date: formattedDate,
          status: 'completed',
          ...baseDescriptor,
        });
      }
    });

    return entries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [recentReceipts, recentContracts]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">Termine</Badge>;
      case 'warning':
        return <Badge variant="warning">En attente</Badge>;
      case 'info':
        return <Badge variant="info">Nouveau</Badge>;
      case 'overdue':
        return <Badge variant="danger">En retard</Badge>;
      case 'upcoming':
        return <Badge variant="info">A venir</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />;
      case 'info':
        return <TrendingUp className="h-4 w-4 text-sky-500" aria-hidden="true" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />;
    }
  };

  const getTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const diffMs = Date.now() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes < 1) return 'A l\'instant';
      if (diffMinutes < 60) return `${diffMinutes} min`;
      if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} h`;
      return `${Math.floor(diffMinutes / 1440)} j`;
    } catch {
      return 'Inconnu';
    }
  };

  const ACTIVITY_ACTION_LABELS: Record<string, string> = {
    insert: 'Creation',
    update: 'Mise a jour',
    delete: 'Suppression',
    extend: 'Extension',
    suspend: 'Suspension',
    activate: 'Activation',
    generate: 'Generation',
    user_login_success: 'Connexion reussie',
    user_login_failure: 'Connexion echouee',
    registration_request_submitted: "Demande d'inscription",
    registration_request_failed: "Echec demande d'inscription",
    approve: 'Approbation',
    reject: 'Rejet',
  };

  const ENTITY_LABELS: Record<string, string> = {
    properties: 'Propriete',
    contracts: 'Contrat',
    owners: 'Proprietaire',
    tenants: 'Locataire',
    rent_receipts: 'Quittance',
    agency_users: 'Collaborateur',
    users: 'Utilisateur',
    audit_logs: 'Journal',
    agency_registration_requests: "Demande d'agence",
    agency_subscriptions: 'Abonnement',
    platform_settings: 'Parametre',
    notifications: 'Notification',
  };

  const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

  const getActivityIconMeta = (activity: AuditLog) => {
    switch (activity.table_name) {
      case 'properties':
        return { icon: Building2, bg: 'bg-blue-100/70', color: 'text-blue-600' };
      case 'contracts':
        return { icon: FileText, bg: 'bg-indigo-100/70', color: 'text-indigo-600' };
      case 'owners':
        return { icon: Users, bg: 'bg-emerald-100/70', color: 'text-emerald-600' };
      case 'tenants':
        return { icon: UserCheck, bg: 'bg-amber-100/70', color: 'text-amber-600' };
      case 'rent_receipts':
        return { icon: Receipt, bg: 'bg-purple-100/70', color: 'text-purple-600' };
      case 'agency_users':
      case 'users':
        return { icon: Users, bg: 'bg-slate-100', color: 'text-slate-600' };
      default:
        return { icon: TrendingUp, bg: 'bg-slate-100', color: 'text-slate-600' };
    }
  };

  const extractEntityLabel = (activity: AuditLog) => {
    const payload = (activity.new_values ?? activity.old_values) as Record<string, any> | null;
    if (!payload) return null;
    const candidates = ['title', 'name', 'full_name', 'reference', 'email', 'numero', 'status'];
    for (const key of candidates) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
    return null;
  };

  const formatActivityHeadline = (activity: AuditLog) => {
    const actionLabel = ACTIVITY_ACTION_LABELS[activity.action] ?? capitalize(activity.action.replace(/_/g, ' '));
    const entityLabel = ENTITY_LABELS[activity.table_name] ?? capitalize(activity.table_name.replace(/_/g, ' '));
    return `${actionLabel}  -  ${entityLabel}`;
  };

  const formatActivityDescription = (activity: AuditLog) => {
    const entityName = extractEntityLabel(activity);
    if (!entityName) return formatActivityHeadline(activity);
    return `${formatActivityHeadline(activity)} - ${entityName}`;
  };

  const greetingName = useMemo(() => {
    if (user) {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
      return fullName || user.email || 'cher partenaire';
    }
    if (admin) {
      const fullName = [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim();
      return fullName || admin.email || 'cher partenaire';
    }
    return 'cher partenaire';
  }, [user, admin]);

  const spotlightMetrics = useMemo(() => {
    if (!dashboardStats) return [];
    return [
      {
        label: 'Biens geres',
        value: dashboardStats.totalProperties.toLocaleString('fr-FR'),
        accent: 'bg-sky-100/70 text-sky-600',
        icon: Building2,
      },
      {
        label: 'Locataires actifs',
        value: dashboardStats.totalTenants.toLocaleString('fr-FR'),
        accent: 'bg-emerald-100/70 text-emerald-600',
        icon: Users,
      },
      {
        label: 'Contrats actifs',
        value: (dashboardStats.activeContracts || dashboardStats.totalContracts || 0).toLocaleString('fr-FR'),
        accent: 'bg-indigo-100/70 text-indigo-600',
        icon: FileText,
      },
    ];
  }, [dashboardStats]);

  const showSpotlightSkeleton = statsLoading && !dashboardStats;
  return (
    <div className="relative min-h-screen bg-slate-100">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-gradient-to-br from-sky-50 via-white to-emerald-100"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-24 right-12 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-10 top-72 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl space-y-10 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        {error && (
          <Card className="border border-rose-200 bg-rose-50/90 text-rose-700 shadow-lg" role="alert">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">Une alerte est survenue</p>
                <p className="text-sm text-rose-600/90">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="border-rose-200 text-rose-600 hover:bg-rose-100"
              >
                Recharger
              </Button>
            </div>
          </Card>
        )}

        <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Card className="relative overflow-hidden border-none bg-white/85 backdrop-blur-xl shadow-2xl shadow-slate-200/60">
            <div
              className="pointer-events-none absolute -top-24 -right-28 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative flex flex-col gap-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Badge variant="info" className="text-xs uppercase tracking-wide">
                    Espace agence
                  </Badge>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                    Bonjour, {greetingName}
                  </h1>
                  <p className="mt-3 max-w-xl text-base text-slate-600">
                    Pilotez vos performances en un coup d'oeil et enchainez vos actions prioritaires avec serenite.
                  </p>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <Button size="lg" onClick={() => navigate('/contracts')} className="shadow-md shadow-blue-500/20">
                    <FileText className="mr-2 h-5 w-5" />
                    Creer un contrat
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate('/reports')}
                    className="border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    Vue analytique
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {showSpotlightSkeleton
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/70 shadow-inner" />
                    ))
                  : spotlightMetrics.map(({ label, value, accent, icon: Icon }) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-white/40 bg-white/80 px-4 py-5 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className={clsx('flex h-11 w-11 items-center justify-center rounded-xl', accent)}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                            <p className="text-xl font-semibold text-slate-900">{value}</p>
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          </Card>

          <BibleVerseCard
            compact
            showRefresh
            className="h-full border-none bg-white/85 backdrop-blur-xl shadow-2xl shadow-slate-200/60"
          />
        </div>

        <section className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {statsLoading && !stats.length
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-32 animate-pulse rounded-2xl bg-white/70 shadow-inner" />
                ))
              : stats.length > 0
              ? stats.map((stat) => <StatsCard key={stat.title} {...stat} />)
              : (
                <Card className="md:col-span-2 xl:col-span-4 border border-dashed border-slate-200 text-center text-slate-500">
                  Aucune statistique disponible pour le moment.
                </Card>
              )}
          </div>

          {dashboardStats && (
            <Card className="relative overflow-hidden border-none bg-slate-900 text-slate-100 shadow-2xl">
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 opacity-90"
                aria-hidden="true"
              />
              <div className="relative z-10 flex flex-col gap-6">
                <header className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">Resume financier</h3>
                    <p className="text-sm text-slate-300">Analyse synthetique de vos performances du mois.</p>
                  </div>
                  <Badge variant="primary" className="bg-blue-500/20 text-blue-100">
                    Donnees en direct
                  </Badge>
                </header>
                <div className="grid gap-6 sm:grid-cols-3">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-slate-400">Revenus mensuels</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{formatCurrency(dashboardStats.monthlyRevenue)}</p>
                    <p className="mt-1 text-sm text-slate-400">Quittances validees ce mois-ci</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-wide text-slate-400">Taux d'occupation</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{dashboardStats.occupancyRate}%</p>
                    <p className="mt-1 text-sm text-slate-400">Part des biens occupes sur votre parc</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-wide text-slate-400">Commissions estimees</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{formatCurrency(dashboardStats.monthlyRevenue * 0.1)}</p>
                    <p className="mt-1 text-sm text-slate-400">Projection sur la base de 10% d'honoraires</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Activites recentes</h3>
              <Button variant="ghost" onClick={() => setShowAllActivities(true)} className="text-slate-500 hover:text-slate-700">
                Voir tout
              </Button>
            </div>
            <div className="mt-5 space-y-3">
              {activitiesLoading ? (
                <div className="flex h-36 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                </div>
              ) : activitiesError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-600">
                  {activitiesError}
                </div>
              ) : agencyActivities.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune activite recente.</p>
              ) : (
                agencyActivities.slice(0, 4).map((activity) => {
                  const { icon: ActivityIcon, bg, color } = getActivityIconMeta(activity);
                  return (
                    <div
                      key={activity.id}
                      className="group flex items-start gap-3 rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-lg"
                    >
                      <span className={clsx('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', bg)}>
                        <ActivityIcon className={clsx('h-5 w-5', color)} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {activity.actor?.full_name ?? 'Utilisateur inconnu'}
                            </p>
                            <p className="text-xs text-slate-500">{activity.actor?.role ?? 'Collaborateur'}</p>
                          </div>
                          <span className="whitespace-nowrap text-xs text-slate-400">{getTimeAgo(activity.created_at)}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 line-clamp-2">{formatActivityDescription(activity)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="border-none shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Loyers a venir</h3>
              <Button variant="ghost" onClick={() => setShowAllRentals(true)} className="text-slate-500 hover:text-slate-700">
                Voir tout
              </Button>
            </div>
            <div className="mt-5 space-y-3">
              {contractsLoading || receiptsLoading ? (
                <div className="flex h-36 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                </div>
              ) : upcomingRentals.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun loyer planifie sur la periode.</p>
              ) : (
                upcomingRentals.map((rental) => (
                  <div
                    key={rental.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{rental.property}</p>
                      <p className="mt-1 text-sm text-slate-500 truncate">
                        {rental.tenant} | {rental.dueDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900">{rental.amount}</span>
                      {getStatusBadge(rental.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card className="border-none shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Paiements recents</h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setShowAllPayments(true)} className="text-slate-500 hover:text-slate-700">
                Voir tout
              </Button>
              <Link to="/receipts">
                <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-100">
                  <Receipt className="mr-2 h-4 w-4" />
                  Gestion quittances
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {receiptsLoading ? (
              <div className="flex h-36 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
              </div>
            ) : recentPayments.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun paiement enregistre recemment.</p>
            ) : (
              recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-lg sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={clsx(
                        'h-3 w-3 rounded-full',
                        payment.type === 'received' ? 'bg-emerald-500' : 'bg-blue-500'
                      )}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {payment.type === 'received'
                          ? `Loyer recu - ${payment.tenant}`
                          : `Reversement - ${payment.owner}`}
                      </p>
                      <p className="text-sm text-slate-500">
                        {payment.property} | {payment.receiptNumber} | {payment.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-slate-500 capitalize">{payment.status}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-700"
                        onClick={() => alert('Visualisation non implementee')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-700"
                        onClick={() => alert('Modification non implementee')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-700"
                        onClick={() => alert('Impression non implementee')}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="border-none shadow-xl">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Actions rapides</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/properties')}
              className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-sky-50 to-sky-100 p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 group-hover:bg-sky-500/20">
                <Building2 className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-slate-900">Ajouter une propriete</p>
                <p className="text-sm text-slate-500">Enregistrez rapidement un nouveau bien</p>
              </div>
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate('/owners')}
              className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20">
                <Users className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-slate-900">Nouveau proprietaire</p>
                <p className="text-sm text-slate-500">Ajoutez un bailleur a votre reseau</p>
              </div>
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate('/tenants')}
              className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-amber-50 to-amber-100 p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20">
                <UserCheck className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-slate-900">Nouveau locataire</p>
                <p className="text-sm text-slate-500">Preparez votre prochain bail</p>
              </div>
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate('/contracts')}
              className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500/20">
                <FileText className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-slate-900">Generer un contrat</p>
                <p className="text-sm text-slate-500">Automatisez votre documentation</p>
              </div>
            </Button>
          </div>
        </Card>
        <Modal
          isOpen={showAllActivities}
          onClose={() => setShowAllActivities(false)}
          title="Toutes les activites"
          size="lg"
        >
          <div className="space-y-4">
            {agencyActivities.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune activite disponible</p>
            ) : (
              agencyActivities.map((activity) => {
                const { icon: ActivityIcon, bg, color } = getActivityIconMeta(activity);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm"
                  >
                    <span className={clsx('mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', bg)}>
                      <ActivityIcon className={clsx('h-5 w-5', color)} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {activity.actor?.full_name ?? 'Utilisateur inconnu'}
                          </p>
                          <p className="text-xs text-slate-500">{activity.actor?.role ?? 'Collaborateur'}</p>
                        </div>
                        <span className="whitespace-nowrap text-xs text-slate-400">{getTimeAgo(activity.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{formatActivityDescription(activity)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Modal>

        <Modal
          isOpen={showAllRentals}
          onClose={() => setShowAllRentals(false)}
          title="Tous les loyers a venir"
          size="lg"
        >
          <div className="space-y-3">
            {upcomingRentals.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun loyer a venir</p>
            ) : (
              upcomingRentals.map((rental) => (
                <div
                  key={rental.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{rental.property}</p>
                    <p className="mt-1 text-sm text-slate-500 truncate">
                      {rental.tenant} | {rental.dueDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-900">{rental.amount}</span>
                    {getStatusBadge(rental.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>

        <Modal
          isOpen={showAllPayments}
          onClose={() => setShowAllPayments(false)}
          title="Tous les paiements recents"
          size="lg"
        >
          <div className="space-y-3">
            {recentPayments.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun paiement recent</p>
            ) : (
              recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={clsx(
                        'h-3 w-3 rounded-full',
                        payment.type === 'received' ? 'bg-emerald-500' : 'bg-blue-500'
                      )}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {payment.type === 'received'
                          ? `Loyer recu - ${payment.tenant}`
                          : `Reversement - ${payment.owner}`}
                      </p>
                      <p className="text-sm text-slate-500">
                        {payment.property} | {payment.receiptNumber} | {payment.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-slate-500 capitalize">{payment.status}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700" onClick={() => alert('Visualisation non implementee')}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700" onClick={() => alert('Modification non implementee')}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700" onClick={() => alert('Impression non implementee')}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
};









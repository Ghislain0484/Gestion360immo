/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import clsx from 'clsx';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Users,
  UserCheck,
  FileText,
  TrendingUp,
  Receipt,
  Eye,
  Printer,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { printReceiptHTML, downloadReceiptPDF } from '../../utils/receiptActions';
import { StatsCard } from './StatsCard';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { BibleVerseCard } from '../ui/BibleVerse';
import { useDashboardStats, useRealtimeData, mapSupabaseError } from '../../hooks/useSupabaseData';
import { dbService, supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Contract, RentReceipt, User, Property } from '../../types/db';
import { PropertyMapCard } from './PropertyMapCard';
import { AuditLog } from '../../types/platform';
import { AgencyUserRole } from '../../types/enums';
import { AgencySubscriptionStatus } from './AgencySubscriptionStatus';
import { DashboardCharts } from './DashboardCharts';
import { MonthlyRevenueItem } from '../../types/contracts';
import { ModularTransaction } from '../../types/modular';

interface DashboardRental {
  id: string;
  property: string;
  tenant: string;
  dueDate: string;
  amount: string;
  status: 'upcoming' | 'warning' | 'overdue';
  isFirstPayment?: boolean;
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
  receipt?: RentReceipt;
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
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
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
    () => ({ agency_id: user?.agency_id || undefined, status: 'active', limit: 1000 }),
    [user?.agency_id],
  );

  const { stats: dashboardStats, loading: statsLoading, error: statsError } = useDashboardStats();

  const fetchContracts = useCallback((params?: GetAllParams) => dbService.contracts.getAll(params), []);
  const {
    data: recentContracts,
    initialLoading: contractsInitialLoading,
    fetching: contractsFetching,
    error: contractsError,
  } = useRealtimeData<Contract>(
    fetchContracts,
    'contracts',
    realtimeFilters,
  );

  const contractsLoading = contractsInitialLoading || contractsFetching;

  // Fetch properties for the map
  const fetchProperties = useCallback(() =>
    dbService.properties.getAll({ agency_id: realtimeFilters.agency_id, limit: 1000 }),
    [realtimeFilters.agency_id]
  );
  const { data: dashboardProperties } = useRealtimeData<Property>(
    fetchProperties,
    'properties',
    realtimeFilters,
  );

  const [recentReceipts, setRecentReceipts] = useState<RentReceipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(true);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);
  const [recentModularTxs, setRecentModularTxs] = useState<ModularTransaction[]>([]);
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<MonthlyRevenueItem[]>([]);
  const agencyId = realtimeFilters.agency_id;

  useEffect(() => {
    if (!agencyId) {
      setRecentReceipts([]);
      setReceiptsLoading(false);
      return;
    }

    const abortController = new AbortController();

    const fetchReceipts = async () => {
      try {
        setReceiptsLoading(true);
        setReceiptsError(null);
        
        const [receipts, modularTxs, chartData] = await Promise.all([
          dbService.rentReceipts.getAll({ agency_id: agencyId, limit: 200 }),
          dbService.modular.getAgencyTransactions(
            agencyId, 
            new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString(),
            new Date().toISOString()
          ),
          dbService.getMonthlyRevenue(agencyId, 6)
        ]);
        
        if (!abortController.signal.aborted) {
          setRecentReceipts(receipts);
          setRecentModularTxs(modularTxs);
          setMonthlyRevenueData(chartData);
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        const errMsg = mapSupabaseError(err, 'Erreur chargement donnees financieres');
        setReceiptsError(errMsg);
        setRecentReceipts([]);
        setRecentModularTxs([]);
      } finally {
        if (!abortController.signal.aborted) {
          setReceiptsLoading(false);
        }
      }
    };

    fetchReceipts();

    return () => abortController.abort();
  }, [agencyId]);

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
          dbService.auditLogs.getAll({ limit: 20 }),
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
      } catch (err: unknown) {
        if (!cancelled) {
          setActivitiesError(err instanceof Error ? err.message : 'Impossible de charger les activites recentes.');
          setAgencyActivities([]);
        }
      } finally {
        if (!cancelled) {
          setActivitiesLoading(false);
        }
      }
    };

    loadActivities();
    const interval = setInterval(loadActivities, 300_000); // 5 minutes

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [agencyId]);

  useEffect(() => {
    const errors = [statsError, contractsError, receiptsError].filter(Boolean);
    setError(errors.length > 0 ? errors.join('; ') : null);
  }, [statsError, contractsError, receiptsError]);

  const stats = useMemo(() => {
    if (!dashboardStats) return [];

    const activeContractsCount = dashboardStats.activeContracts || dashboardStats.totalContracts || 0;
    const inactiveContractsCount = Math.max((dashboardStats.totalContracts || 0) - activeContractsCount, 0);

    return [
      {
        title: 'Proprietes gerees',
        value: dashboardStats.totalProperties.toString(),
        icon: Building2,
        trend: { value: 0, isPositive: true },
        color: 'blue' as const,
      },
      {
        title: 'Proprietaires',
        value: dashboardStats.totalOwners.toString(),
        icon: Users,
        trend: { value: 0, isPositive: true },
        color: 'green' as const,
      },
      {
        title: 'Total locataires',
        value: dashboardStats.totalTenants.toString(),
        icon: UserCheck,
        trend: { value: 0, isPositive: true },
        color: 'yellow' as const,
      },
      {
        title: 'Contrats actifs',
        value: activeContractsCount.toString(),
        icon: FileText,
        trend: { value: 0, isPositive: true },
        color: 'red' as const,
      },
    ];
  }, [dashboardStats]);

  const formatCurrency = useCallback(
    (amount: number | null | undefined) =>
      new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0,
      }).format(amount ?? 0),
    []
  );

  const upcomingRentals = useMemo((): DashboardRental[] => {
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
        let isFirstPayment = false;

        const latestReceipt = receiptsByContract.get(contract.id);
        
        if (contract.next_payment_date) {
            const nextP = new Date(contract.next_payment_date);
            baseYear = nextP.getFullYear();
            baseMonth = nextP.getMonth();
            offset = 0; // Date is already the next target
            isFirstPayment = false;
        } else if (latestReceipt) {
          baseYear = latestReceipt.period_year ?? start.getFullYear();
          baseMonth = Number(latestReceipt.period_month ?? (start.getMonth() + 1)) - 1;
          offset = 1; // next cycle after last receipt
        } else {
          // No receipt found -> First Payment
          isFirstPayment = true;
        }

        let nextDue = createDueDate(baseYear, baseMonth, dueDay, offset);

        if (!isFirstPayment) {
          while (nextDue < startOfToday) {
            offset += 1;
            nextDue = createDueDate(baseYear, baseMonth, dueDay, offset);
          }
        }

        const diffInDays = Math.ceil((nextDue.getTime() - startOfToday.getTime()) / msInDay);

        if (diffInDays > 5) {
          return null; // Too far in future
        }

        let status: DashboardRental['status'] = 'upcoming';
        if (diffInDays < 0) status = 'overdue';
        else if (diffInDays <= 5) status = 'warning';

        return {
          id: contract.id,
          property: (contract as any).property?.title || (contract as any).property_business_id || `Propriété #${contract.property_id?.slice(0, 8)}`,
          tenant: (contract as any).tenant ? `${(contract as any).tenant.first_name} ${(contract as any).tenant.last_name}`.trim() : (contract as any).tenant_business_id || `Locataire #${contract.tenant_id?.slice(0, 8)}`,
          dueDate: nextDue.toISOString().split('T')[0],
          amount: formatCurrency(contract.monthly_rent ?? 0),
          status,
          isFirstPayment: isFirstPayment
        } as DashboardRental;
      })
      .filter((item): item is DashboardRental => item !== null)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 10);
  }, [recentContracts, recentReceipts, formatCurrency]);

  const recentPayments = useMemo((): Payment[] => {
    if (!Array.isArray(recentReceipts) || !Array.isArray(recentContracts)) return [];

    const contractMap = new Map<string, Contract>();
    recentContracts.forEach((contract) => contractMap.set(contract.id, contract));

    const entries: Payment[] = [];

    recentReceipts.forEach((receipt) => {
      const contract = contractMap.get(receipt.contract_id);
      const baseDescriptor = {
        tenant: (contract as any)?.tenant ? `${(contract as any).tenant.first_name} ${(contract as any).tenant.last_name}`.trim() : (receipt as any).tenant_business_id || `LOC-${(contract?.tenant_id || receipt.tenant_id || 'Inconnu').slice(0, 8)}`,
        owner: (contract as any)?.owner ? `${(contract as any).owner.first_name} ${(contract as any).owner.last_name}`.trim() : (receipt as any).owner_business_id || `PROP-${(contract?.owner_id || receipt.owner_id || 'Inconnu').slice(0, 8)}`,
        property: (contract as any)?.property?.title || (receipt as any).property_business_id || `BIEN-${(contract?.property_id || receipt.property_id || 'Inconnu').slice(0, 8)}`,
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
        receipt,
        ...baseDescriptor,
      });

      if ((receipt.owner_payment ?? 0) > 0) {
        entries.push({
          id: `${receipt.id}-owner`,
          type: 'paid',
          amount: receipt.owner_payment ?? 0,
          date: formattedDate,
          status: 'completed',
          receipt,
          ...baseDescriptor,
        });
      }
    });

    recentModularTxs.forEach((tx) => {
      if (tx.type !== 'income' && tx.type !== 'credit') return;

      entries.push({
        id: tx.id,
        type: 'received',
        amount: Number(tx.amount),
        date: tx.transaction_date.split('T')[0],
        status: 'completed',
        tenant: tx.description || 'Transaction Caisse',
        owner: '-',
        property: tx.module_type || 'Immobilier',
        receiptNumber: 'TXN-' + tx.id.slice(0, 8).toUpperCase(),
      });
    });

    return entries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [recentReceipts, recentContracts, recentModularTxs]);

  const getStatusBadge = (status: string, isFirstPayment?: boolean) => {
    if (isFirstPayment) {
      return <Badge variant="info">1er Loyer</Badge>;
    }
    switch (status) {
      case 'success':
        return <Badge variant="success">Terminé</Badge>;
      case 'warning':
        return <Badge variant="warning">5 Jours</Badge>; 
      case 'info':
        return <Badge variant="info">Nouveau</Badge>;
      case 'overdue':
        return <Badge variant="danger">En retard</Badge>;
      case 'upcoming':
        return <Badge variant="info">À venir</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
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
      return 'Administrateur';
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

  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none absolute -top-24 right-12 h-96 w-96 rounded-full bg-primary-500/10 blur-[120px] animate-pulse"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-10 top-72 h-80 w-80 rounded-full bg-emerald-500/10 blur-[100px] animate-pulse"
        style={{ animationDelay: '2s' }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-[1700px] space-y-10 px-4 pb-16 pt-8 sm:px-6 lg:px-10">
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

        <AgencySubscriptionStatus />

        <div className="grid items-stretch gap-8 grid-cols-1">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="card-glass relative overflow-hidden p-8 sm:p-10 border-none shadow-premium"
          >
            <div className="relative flex flex-col gap-10">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex-1 min-w-[300px]">
                  <Badge variant="primary" className="bg-primary-600/10 text-primary-600 border-none font-bold tracking-[0.2em] px-4 py-1.5 rounded-full mb-6">
                    Tableau de Bord
                  </Badge>
                  <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    Ravi de vous revoir, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-indigo-600">{greetingName}</span>
                  </h1>
                  <p className="mt-4 max-w-xl text-lg text-slate-500 font-medium leading-relaxed">
                    Tout semble optimal aujourd'hui. Voici un aperçu de l'activité de votre agence.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 self-start">
                  <Button size="lg" onClick={() => navigate('/contracts')} className="btn-premium">
                    <FileText className="h-5 w-5" />
                    Nouveau Contrat
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate('/reports')}
                    className="rounded-xl border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all px-8"
                  >
                    Statistiques
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                {showSpotlightSkeleton
                  ? Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                  ))
                  : spotlightMetrics.map(({ label, value, accent, icon: Icon }, idx) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      className="group p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className={clsx('flex h-12 w-12 items-center justify-center rounded-xl shadow-inner transition-transform duration-500 group-hover:rotate-6', accent)}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          </motion.div>
        </div>

        <section className="space-y-10">
          <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
            <DashboardCharts data={monthlyRevenueData} />
            <div className="flex flex-col gap-8">
                {dashboardStats && (
                    <Card className="relative overflow-hidden border-none bg-slate-900 text-slate-100 shadow-2xl p-8 flex-1">
                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <header className="mb-6">
                                <h3 className="text-xl font-black uppercase tracking-widest text-white/50">Synthèse Agence</h3>
                                <p className="text-4xl font-black text-white mt-4">{formatCurrency(dashboardStats.agencyEarnings)}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Revenus réels ce mois</p>
                            </header>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-t border-white/10">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Taux Occupation</span>
                                    <span className="text-sm font-black text-emerald-400">{(dashboardStats.occupancyRate || 0).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-t border-white/10">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cautions</span>
                                    <span className="text-sm font-black text-sky-400">{formatCurrency(dashboardStats.totalDeposits)}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
                <BibleVerseCard compact showRefresh className="card-glass border-none shadow-premium flex-1" />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {statsLoading && !stats.length
              ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
              ))
              : stats.length > 0
                ? stats.map((stat, idx) => <StatsCard key={stat.title} index={idx} {...stat} />)
                : (
                  <Card className="md:col-span-2 xl:col-span-4 border border-dashed border-slate-200 text-center text-slate-500">
                    Aucune statistique disponible pour le moment.
                  </Card>
                )}
          </div>
        </section>

        <PropertyMapCard
          properties={dashboardProperties ?? []}
          contracts={recentContracts ?? []}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-xl dark:bg-slate-900/80">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Activites recentes</h3>
              <Button variant="ghost" onClick={() => setShowAllActivities(true)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                Voir tout
              </Button>
            </div>
            <div className="mt-5 space-y-3">
              {activitiesLoading ? (
                <div className="flex h-36 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                </div>
              ) : activitiesError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
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
                      className="group flex items-start gap-3 rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-slate-600"
                    >
                      <span className={clsx('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', bg)}>
                        <ActivityIcon className={clsx('h-5 w-5', color)} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {activity.actor?.full_name ?? 'Utilisateur inconnu'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{activity.actor?.role ?? 'Collaborateur'}</p>
                          </div>
                          <span className="whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">{getTimeAgo(activity.created_at)}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-300">{formatActivityDescription(activity)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="border-none shadow-xl dark:bg-slate-900/80">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Loyers a venir</h3>
              <Button variant="ghost" onClick={() => setShowAllRentals(true)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
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
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-slate-600"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{rental.property}</p>
                      <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-300">
                        {rental.tenant} | {rental.dueDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{rental.amount}</span>
                      {getStatusBadge(rental.status, rental.isFirstPayment)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card className="border-none shadow-xl dark:bg-slate-900/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Paiements recents</h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setShowAllPayments(true)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                Voir tout
              </Button>
              <Link to="/receipts">
                <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
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
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-slate-600 sm:flex-row sm:items-center sm:justify-between"
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
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {payment.type === 'received'
                          ? `Loyer recu - ${payment.tenant}`
                          : `Reversement - ${payment.owner}`}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-300">
                        {payment.property} | {payment.receiptNumber} | {payment.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm capitalize text-slate-500 dark:text-slate-300">{payment.status}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        title="Voir détails"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowPaymentDetails(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        title="Imprimer"
                        onClick={() => {
                          if (payment.receipt && user?.agency_id) {
                            printReceiptHTML(payment.receipt, user.agency_id, {
                              tenantName: payment.tenant,
                              ownerName: payment.owner,
                              propertyTitle: payment.property
                            });
                          } else {
                            toast.error("Données de reçu manquantes");
                          }
                        }}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        title="Télécharger"
                        onClick={() => {
                          if (payment.receipt && user?.agency_id) {
                            downloadReceiptPDF(payment.receipt, user.agency_id, {
                              tenantName: payment.tenant,
                              ownerName: payment.owner,
                              propertyTitle: payment.property
                            });
                          } else {
                            toast.error("Données de reçu manquantes");
                          }
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="border-none shadow-xl dark:bg-slate-900/80">
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Actions rapides</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/properties')}
              className="group flex items-center gap-3 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-sky-100 p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-sky-500/20 dark:from-sky-500/10 dark:to-slate-900 dark:hover:border-sky-500/30"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 group-hover:bg-sky-500/20 dark:bg-sky-500/15 dark:text-sky-300">
                <Building2 className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Ajouter une propriete</p>
                <p className="text-sm text-slate-500 dark:text-slate-300">Enregistrez rapidement un nouveau bien</p>
              </div>
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate('/owners')}
              className="group flex items-center gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-slate-900 dark:hover:border-emerald-500/30"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300">
                <Users className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Nouveau proprietaire</p>
                <p className="text-sm text-slate-500 dark:text-slate-300">Ajoutez un bailleur a votre reseau</p>
              </div>
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate('/tenants')}
              className="group flex items-center gap-3 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-amber-100 p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-amber-500/20 dark:from-amber-500/10 dark:to-slate-900 dark:hover:border-amber-500/30"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300">
                <UserCheck className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Nouveau locataire</p>
                <p className="text-sm text-slate-500 dark:text-slate-300">Preparez votre prochain bail</p>
              </div>
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate('/contracts')}
              className="group flex items-center gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-indigo-500/20 dark:from-indigo-500/10 dark:to-slate-900 dark:hover:border-indigo-500/30"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500/20 dark:bg-indigo-500/15 dark:text-indigo-300">
                <FileText className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Generer un contrat</p>
                <p className="text-sm text-slate-500 dark:text-slate-300">Automatisez votre documentation</p>
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
                    className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80"
                  >
                    <span className={clsx('mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', bg)}>
                      <ActivityIcon className={clsx('h-5 w-5', color)} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {activity.actor?.full_name ?? 'Utilisateur inconnu'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{activity.actor?.role ?? 'Collaborateur'}</p>
                        </div>
                        <span className="whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">{getTimeAgo(activity.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{formatActivityDescription(activity)}</p>
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
                  className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{rental.property}</p>
                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-300">
                      {rental.tenant} | {rental.dueDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{rental.amount}</span>
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
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 sm:flex-row sm:items-center sm:justify-between"
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
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {payment.type === 'received'
                          ? `Loyer recu - ${payment.tenant}`
                          : `Reversement - ${payment.owner}`}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-300">
                        {payment.property} | {payment.receiptNumber} | {payment.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm capitalize text-slate-500 dark:text-slate-300">{payment.status}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        title="Voir détails"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowPaymentDetails(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        title="Imprimer"
                        onClick={() => {
                          if (payment.receipt && user?.agency_id) {
                            printReceiptHTML(payment.receipt, user.agency_id, {
                              tenantName: payment.tenant,
                              ownerName: payment.owner,
                              propertyTitle: payment.property
                            });
                          } else {
                            toast.error("Données de reçu manquantes");
                          }
                        }}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        title="Télécharger"
                        onClick={() => {
                          if (payment.receipt && user?.agency_id) {
                            downloadReceiptPDF(payment.receipt, user.agency_id, {
                              tenantName: payment.tenant,
                              ownerName: payment.owner,
                              propertyTitle: payment.property
                            });
                          } else {
                            toast.error("Données de reçu manquantes");
                          }
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>

        <Modal
          isOpen={showPaymentDetails}
          onClose={() => {
            setShowPaymentDetails(false);
            setSelectedPayment(null);
          }}
          title="Détails du Paiement"
          size="lg"
        >
          {selectedPayment && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-slate-50 to-blue-50 p-6 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <Badge variant={selectedPayment.type === 'received' ? 'success' : 'info'} className="mb-2">
                      {selectedPayment.type === 'received' ? 'Encaissement Loyer' : 'Reversement Propriétaire'}
                    </Badge>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Reçu N° {selectedPayment.receiptNumber}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Montant</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-300">
                      {formatCurrency(selectedPayment.amount)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Locataire</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-100">{selectedPayment.tenant}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Propriétaire</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-100">{selectedPayment.owner}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Bien Immobilier</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-100">{selectedPayment.property}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Date de Paiement</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-100">
                        {new Date(selectedPayment.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedPayment.receipt?.notes && (
                  <div className="mt-6 border-t border-blue-100 pt-6 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Notes / Observations</p>
                    <p className="text-sm italic text-slate-600 dark:text-slate-300">"{selectedPayment.receipt.notes}"</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  className="w-full flex items-center justify-center gap-2 py-6 rounded-xl hover:shadow-lg transition-all"
                  onClick={() => {
                    if (selectedPayment.receipt && user?.agency_id) {
                      printReceiptHTML(selectedPayment.receipt, user.agency_id, {
                        tenantName: selectedPayment.tenant,
                        ownerName: selectedPayment.owner,
                        propertyTitle: selectedPayment.property
                      });
                    }
                  }}
                >
                  <Printer className="w-5 h-5" />
                  <span>Imprimer le Reçu</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 py-6 transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => {
                    if (selectedPayment.receipt && user?.agency_id) {
                      downloadReceiptPDF(selectedPayment.receipt, user.agency_id, {
                        tenantName: selectedPayment.tenant,
                        ownerName: selectedPayment.owner,
                        propertyTitle: selectedPayment.property
                      });
                    }
                  }}
                >
                  <Download className="w-5 h-5" />
                  <span>Télécharger PDF</span>
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

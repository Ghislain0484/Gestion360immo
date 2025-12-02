import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  Shield,
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  Award,
  Settings,
  BarChart3,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AgencyManagement } from './AgencyManagement';
import { SubscriptionManagement } from './SubscriptionManagement';
import { AgencyRankings } from './AgencyRankings';
import { PlatformSettings } from './PlatformSettings';
import { PlatformStats, Agency } from '../../types/db';
import { dbService } from '../../lib/supabase';
import { getPlatformStats } from '../../lib/adminApi';
import { supabase } from '../../lib/config';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface AgencyRegistrationRequest {
  id: string;
  name: string;
  commercial_register: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  director_first_name: string;
  director_last_name: string;
  status: 'pending' | 'approved' | 'rejected';
  logo_temp_path?: string | null;
  created_agency_id?: string | null;
}

const adminTabs = [
  { id: 'overview', name: "Vue d'ensemble", icon: BarChart3 },
  { id: 'agencies', name: 'Gestion Agences', icon: Building2 },
  { id: 'subscriptions', name: 'Abonnements', icon: DollarSign },
  { id: 'rankings', name: 'Classements', icon: Award },
  { id: 'settings', name: 'Paramètres', icon: Settings },
];

export const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentAgencies, setRecentAgencies] = useState<Agency[]>([]);
  const [requests, setRequests] = useState<AgencyRegistrationRequest[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('admin-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = localStorage.getItem('admin-theme');
    if (storedTheme) setIsDarkMode(storedTheme === 'dark');
  }, []);

  const fetchPlatformStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await getPlatformStats();
      setPlatformStats(stats);

      const agencies = await dbService.agencies.getRecent(5);
      setRecentAgencies(agencies ?? []);

      const pendingRequests = await dbService.agencyRegistrationRequests.getAll({
        status: 'pending',
        limit: 10,
      });
      setRequests(pendingRequests ?? []);
    } catch (err: any) {
      console.error('Error fetching platform stats:', err);
      setError(err.message || 'Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatformStats();
    const interval = setInterval(fetchPlatformStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPlatformStats]);

  const approve = useCallback(
    async (request: AgencyRegistrationRequest) => {
      try {
        setLoading(true);
        const { data: updatedRequest, error: updateError } = await supabase
          .from('agency_registration_requests')
          .update({
            status: 'approved',
            approval_comments: 'Approuvée par administrateur',
          })
          .eq('id', request.id)
          .select('*')
          .single();

        if (updateError) throw updateError;

        // Deplacement du logo : decode/assainit le nom pour eviter les %20 / caracteres speciaux
        if (request.logo_temp_path && updatedRequest?.created_agency_id) {
          const bucket = 'agency-logos';
          const rawFileName = request.logo_temp_path.split('/').pop()!;

          const normalize = (name: string) => {
            let decoded = name;
            try { decoded = decodeURIComponent(decoded); } catch { /* ignore */ }
            decoded = decoded.replace(/%20/g, ' ');
            try { decoded = decodeURIComponent(decoded); } catch { /* ignore */ }
            return decoded.replace(/[^A-Za-z0-9._-]/g, '_');
          };

          const decodedFileName = (() => { try { return decodeURIComponent(rawFileName); } catch { return rawFileName; } })();
          const safeFileName = normalize(rawFileName);
          const targetPath = `logos/${updatedRequest.created_agency_id}/${safeFileName}`;

          const candidateSources = [
            `temp-registration/${request.id}/${decodedFileName}`,
            `temp-registration/${request.id}/${rawFileName}`,
            `temp-registration/${decodedFileName}`,
            `temp-registration/${rawFileName}`,
          ];

          let moved = false;
          for (const sourcePath of candidateSources) {
            const { error: moveError } = await supabase.storage.from(bucket).move(sourcePath, targetPath);
            if (!moveError) {
              moved = true;
              break;
            }
          }

          if (!moved) {
            throw new Error('Impossible de deplacer le logo (fichier introuvable)');
          }

          await supabase
            .from('agencies')
            .update({ logo: targetPath })
            .eq('id', updatedRequest.created_agency_id);
        }

        toast.success('Demande approuvée avec succès !');
        fetchPlatformStats();
      } catch (err: any) {
        console.error('Erreur lors de l\'approbation:', err);
        toast.error(err.message || "Impossible d'approuver la demande");
        // Rollback en cas d'erreur
        await supabase
          .from('agency_registration_requests')
          .update({ status: 'pending' })
          .eq('id', request.id);
      } finally {
        setLoading(false);
      }
    },
    [fetchPlatformStats],
  );

  const reject = useCallback(
    async (request: AgencyRegistrationRequest, comments: string = 'Rejetée par administrateur') => {
      try {
        setLoading(true);
        const { error } = await supabase
          .from('agency_registration_requests')
          .update({
            status: 'rejected',
            approval_comments: comments,
          })
          .eq('id', request.id);

        if (error) throw error;

        // Suppression du logo temporaire (chemin decode + fallback simple)
        if (request.logo_temp_path) {
          const bucket = 'agency-logos';
          const rawFileName = request.logo_temp_path.split('/').pop();
          if (rawFileName) {
            const decodedFileName = decodeURIComponent(rawFileName);
            const attempts = [
              `temp-registration/${request.id}/${decodedFileName}`,
              `temp-registration/${request.id}/${rawFileName}`,
              `temp-registration/${decodedFileName}`,
              `temp-registration/${rawFileName}`,
            ];

            for (const path of attempts) {
              const { error: deleteError } = await supabase.storage.from(bucket).remove([path]);
              if (!deleteError) break;
            }
          }
        }

        toast.success('Demande rejetée');
        fetchPlatformStats();
      } catch (err: any) {
        toast.error(err.message || 'Erreur lors du rejet');
      } finally {
        setLoading(false);
      }
    },
    [fetchPlatformStats],
  );

  const formatCurrency = useCallback(
    (amount: number) =>
      new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0,
      }).format(amount),
    [],
  );

  const pendingRequestsCount = useMemo(
    () => requests.filter((req) => req.status === 'pending').length,
    [requests],
  );

  const heroSnapshots = useMemo(() => {
    if (!platformStats) return [];
    return [
      { label: 'Agences totales', value: platformStats.totalAgencies.toLocaleString('fr-FR') },
      { label: 'Revenus cumulés', value: formatCurrency(platformStats.totalRevenue) },
      { label: 'Croissance mensuelle', value: `${platformStats.monthlyGrowth}%` },
    ];
  }, [platformStats, formatCurrency]);

  const overviewMetrics = useMemo(() => {
    if (!platformStats) return [];
    return [
      {
        label: 'Agences actives',
        value: platformStats.activeAgencies.toLocaleString('fr-FR'),
        secondary: `${pendingRequestsCount} demandes en attente`,
        icon: Building2,
        accent: 'bg-rose-100/70 text-rose-600',
      },
      {
        label: 'Revenus abonnements',
        value: formatCurrency(platformStats.subscriptionRevenue),
        secondary: `Total cumulé: ${formatCurrency(platformStats.totalRevenue)}`,
        icon: DollarSign,
        accent: 'bg-emerald-100/70 text-emerald-600',
      },
      {
        label: 'Biens gérés',
        value: platformStats.totalProperties.toLocaleString('fr-FR'),
        secondary: `${platformStats.totalContracts.toLocaleString('fr-FR')} contrats actifs`,
        icon: Users,
        accent: 'bg-blue-100/70 text-blue-600',
      },
      {
        label: 'Croissance mensuelle',
        value: `${platformStats.monthlyGrowth}%`,
        secondary: 'Tendance du mois courant',
        icon: TrendingUp,
        accent: 'bg-indigo-100/70 text-indigo-600',
      },
    ];
  }, [platformStats, pendingRequestsCount, formatCurrency]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast.success('Déconnexion réussie');
    } catch (err: any) {
      toast.error(err.message || 'Impossible de se déconnecter.');
    }
  }, [logout]);

  const containerClass = clsx(
    'min-h-screen transition-colors duration-300',
    isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900',
  );

  if (loading) {
    return (
      <div className={clsx(containerClass, 'flex min-h-screen items-center justify-center')}>
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-transparent border-t-rose-500" />
      </div>
    );
  }

  return (
    <div className={clsx(containerClass, 'relative min-h-screen overflow-hidden')}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-gradient-to-br from-rose-50 via-white to-indigo-100" />
      <div className="pointer-events-none absolute -top-24 right-12 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
      <div className="pointer-events-none absolute left-10 top-72 h-64 w-64 rounded-full bg-indigo-200/30 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl space-y-10 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        {error && (
          <Card className="border border-rose-200 bg-rose-50/90 text-rose-700 shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">Une erreur est survenue</p>
                <p className="text-sm text-rose-600/80">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchPlatformStats}>
                Actualiser
              </Button>
            </div>
          </Card>
        )}

        {/* Hero + Stats rapides */}
        <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Card className="relative overflow-hidden border-none bg-white/85 backdrop-blur-xl shadow-2xl shadow-rose-200/50">
            <div className="relative flex flex-col gap-6 p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-inner">
                    <Shield className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">console admin</p>
                    <h1 className="text-3xl font-semibold text-slate-900">Gestion360Immo</h1>
                    <p className="text-sm text-slate-500">
                      Surveillez les performances globales de la plateforme et accompagnez les agences en temps réel.
                    </p>
                  </div>
                  <Badge variant="danger" size="sm" className="ml-2">Super admin</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsDarkMode((prev) => !prev)}>
                    {isDarkMode ? (
                      <>
                        <Sun className="mr-2 h-4 w-4" />
                        Mode clair
                      </>
                    ) : (
                      <>
                       M <Moon className="mr-2 h-4 w-4" />
                        Mode sombre
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchPlatformStats}>
                    Actualiser
                  </Button>
                  <Button variant="danger" size="sm" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Se déconnecter
                  </Button>
                </div>
              </div>

              {heroSnapshots.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {heroSnapshots.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/50 bg-white/80 px-4 py-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="border-none bg-white/85 backdrop-blur-xl shadow-xl">
            <div className="flex h-full flex-col justify-between gap-4 p-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Demandes en cours</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{pendingRequestsCount}</p>
                <p className="text-sm text-slate-500">Agences en attente de validation</p>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <p>Agences totales: {platformStats?.totalAgencies.toLocaleString('fr-FR') ?? '-'}</p>
                <p>Revenus cumulés: {platformStats ? formatCurrency(platformStats.totalRevenue) : '-'}</p>
                <p>Agences actives: {platformStats?.activeAgencies.toLocaleString('fr-FR') ?? '-'}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Métriques détaillées */}
        {platformStats && overviewMetrics.length > 0 && (
          <section className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {overviewMetrics.map((metric) => (
                <Card key={metric.label} className="border-none bg-white/90 shadow-md shadow-rose-200/40">
                  <div className="flex items-start gap-4 p-5">
                    <span className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', metric.accent)}>
                      <metric.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.label}</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{metric.value}</p>
                      {metric.secondary && <p className="text-xs text-slate-500">{metric.secondary}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Navigation */}
        <div className="rounded-2xl border border-white/60 bg-white/80 p-2 shadow-inner backdrop-blur md:px-4">
          <nav className="flex flex-wrap gap-2">
            {adminTabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-rose-500 text-white shadow' : 'text-slate-600 hover:bg-rose-100/60',
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu principal */}
        <div>
          {activeTab === 'overview' ? (
            <div className="space-y-8">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Agences récentes */}
                <Card className="border-none bg-white/90 shadow-md">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900">Agences récentes</h3>
                    <p className="text-sm text-slate-500">Six dernières validations</p>
                    {recentAgencies.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {recentAgencies.slice(0, 6).map((agency) => (
                          <div key={agency.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <div>
                              <p className="font-medium text-slate-900">{agency.name}</p>
                              <p className="text-xs text-slate-500">{agency.city}</p>
                            </div>
                            <span className="text-xs text-slate-400">
                              {new Date(agency.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-6 text-center text-sm text-slate-500">Aucune agence récente</div>
                    )}
                  </div>
                </Card>

                {/* Alertes système (désactivées car table inexistante) */}
                <Card className="border-none bg-white/90 shadow-md">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900">Alertes système</h3>
                    <p className="text-sm text-slate-500">Tout est opérationnel</p>
                    <div className="mt-6 text-center">
                      <div className="flex items-center justify-center gap-3 rounded-xl bg-green-50 p-4">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <p className="font-medium text-green-800">Système opérationnel</p>
                      </div>
                      <p className="mt-2 text-xs text-green-600">Tous les services fonctionnent normalement</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Demandes d'approbation */}
              <Card className="border-none bg-white/90 shadow-md">
                <div className="p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Demandes d'approbation</h3>
                      <p className="text-sm text-slate-500">Gestion des nouvelles agences</p>
                    </div>
                    <Badge variant="secondary">{pendingRequestsCount} en attente</Badge>
                  </div>

                  {requests.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      {requests.map((req) => (
                        <div key={req.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                          <div className="grid gap-3 text-sm md:grid-cols-2">
                            <div>
                              <p className="font-semibold text-slate-900">{req.name}</p>
                              <p className="text-xs text-slate-500">Registre: {req.commercial_register}</p>
                            </div>
                            <div>
                              <p>Email: {req.email}</p>
                              <p>Directeur: {req.director_first_name} {req.director_last_name}</p>
                            </div>
                            <div>
                              <p>Téléphone: {req.phone}</p>
                              <p>Ville: {req.city}</p>
                            </div>
                            <div>
                              <p>Logo: {req.logo_temp_path ? 'Présent' : 'Aucun'}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => approve(req)}>
                              Approuver
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => reject(req)}>
                              Rejeter
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-6 text-center text-sm text-slate-500">Aucune demande à traiter</p>
                  )}
                </div>
              </Card>
            </div>
          ) : activeTab === 'agencies' ? (
            <AgencyManagement />
          ) : activeTab === 'subscriptions' ? (
            <SubscriptionManagement />
          ) : activeTab === 'rankings' ? (
            <AgencyRankings />
          ) : (
            <PlatformSettings />
          )}
        </div>
      </div>
    </div>
  );
};

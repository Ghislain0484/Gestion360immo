import React, { useCallback, useEffect, useState } from 'react';
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
import { PlatformStats, Agency, SystemAlert } from '../../types/db';
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
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
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
    if (storedTheme) {
      setIsDarkMode(storedTheme === 'dark');
    }
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

      const alerts = await dbService.systemAlerts.systemAlerts();
      setSystemAlerts(alerts ?? []);
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
            approval_comments: 'Approved',
          })
          .eq('id', request.id)
          .select('*')
          .single();

        if (updateError) {
          throw updateError;
        }

        if (request.logo_temp_path && updatedRequest?.created_agency_id) {
          const fileName = request.logo_temp_path.split('/').pop();
          if (!fileName) throw new Error('Nom de fichier invalide');

          const bucket = 'agency-logos';
          const sourcePath = `temp-registration/${fileName}`;
          const targetPath = `logos/${updatedRequest.created_agency_id}/${fileName}`;

          const { error: moveError } = await supabase.storage.from(bucket).move(sourcePath, targetPath);
          if (moveError) {
            await supabase
              .from('agency_registration_requests')
              .update({ status: 'pending' })
              .eq('id', request.id);
            throw moveError;
          }

          const { error: updateAgencyError } = await supabase
            .from('agencies')
            .update({ logo: targetPath })
            .eq('id', updatedRequest.created_agency_id);
          if (updateAgencyError) {
            await supabase
              .from('agency_registration_requests')
              .update({ status: 'pending' })
              .eq('id', request.id);
            throw updateAgencyError;
          }
        }

        toast.success('Demande approuvée avec succès');
        fetchPlatformStats();
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de l'approbation");
      } finally {
        setLoading(false);
      }
    },
    [fetchPlatformStats],
  );

  const reject = useCallback(
    async (request: AgencyRegistrationRequest, comments: string) => {
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

        if (request.logo_temp_path) {
          const fileName = request.logo_temp_path.split('/').pop();
          if (fileName) {
            await supabase.storage.from('agency-logos').remove([`temp-registration/${fileName}`]);
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

  const cardClass = useMemo(
    () => (isDarkMode ? 'bg-slate-900 border-slate-800 shadow-lg shadow-slate-900/40' : 'bg-white shadow-sm'),
    [isDarkMode],
  );

  if (loading) {
    return (
      <div className={clsx(containerClass, 'flex items-center justify-center')}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500" />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div
        className={clsx(
          'border-b transition-colors',
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm',
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-5">
            <div className="flex items-center space-x-3">
              <div
                className={clsx(
                  'p-2 rounded-xl shadow-inner',
                  isDarkMode ? 'bg-rose-500/10 text-rose-300' : 'bg-rose-100 text-rose-600',
                )}
              >
                <Shield className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Administration Gestion360Immo</h1>
                <p className="text-sm text-muted-foreground">
                  Pilotage global des agences, abonnements et performances
                </p>
              </div>
              <Badge variant="danger" size="sm">
                Super Admin
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsDarkMode((prev) => !prev)}>
                {isDarkMode ? (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Mode clair
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    Mode sombre
                  </>
                )}
              </Button>
              <Button variant="danger" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <Card className={clsx(cardClass, 'border border-red-400 bg-red-100/80 text-red-800')}>
            <div className="p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">Une erreur est survenue</p>
                <p className="text-sm opacity-80">{error}</p>
              </div>
              <Button variant="danger" size="sm" onClick={fetchPlatformStats}>
                Réessayer
              </Button>
            </div>
          </Card>
        )}

        <div
          className={clsx(
            'rounded-2xl p-2 shadow-inner overflow-x-auto',
            isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white/80 border border-slate-200',
          )}
        >
          <nav className="flex space-x-4 md:space-x-6">
            {adminTabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex items-center space-x-2 rounded-xl px-4 py-2 transition-all text-sm font-medium',
                    isActive
                      ? 'bg-rose-500 text-white shadow'
                      : isDarkMode
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            {platformStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className={clsx(cardClass, 'border-t-4 border-rose-500')}>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={clsx(
                            'p-3 rounded-xl',
                            isDarkMode ? 'bg-rose-500/10 text-rose-300' : 'bg-rose-100 text-rose-600',
                          )}
                        >
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm uppercase tracking-wide opacity-70">Agences actives</p>
                          <p className="text-2xl font-semibold">{platformStats.activeAgencies.toLocaleString()}</p>
                        </div>
                      </div>
                      <Badge variant="danger">{platformStats.totalAgencies}</Badge>
                    </div>
                    <p className="text-xs opacity-70">
                      {platformStats.pendingRequests} demandes d'inscription en attente
                    </p>
                  </div>
                </Card>

                <Card className={clsx(cardClass, 'border-t-4 border-emerald-500')}>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={clsx(
                          'p-3 rounded-xl',
                          isDarkMode ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-100 text-emerald-600',
                        )}
                      >
                        <DollarSign className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-wide opacity-70">Revenus abonnements</p>
                        <p className="text-2xl font-semibold">
                          {formatCurrency(platformStats.subscriptionRevenue)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs opacity-70">
                      Total cumulé : {formatCurrency(platformStats.totalRevenue)}
                    </p>
                  </div>
                </Card>

                <Card className={clsx(cardClass, 'border-t-4 border-blue-500')}>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={clsx(
                          'p-3 rounded-xl',
                          isDarkMode ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-100 text-blue-600',
                        )}
                      >
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-wide opacity-70">Biens gérés</p>
                        <p className="text-2xl font-semibold">
                          {platformStats.totalProperties.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs opacity-70">
                      {platformStats.totalContracts.toLocaleString()} contrats actifs
                    </p>
                  </div>
                </Card>

                <Card className={clsx(cardClass, 'border-t-4 border-violet-500')}>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={clsx(
                          'p-3 rounded-xl',
                          isDarkMode ? 'bg-violet-500/10 text-violet-300' : 'bg-violet-100 text-violet-600',
                        )}
                      >
                        <TrendingUp className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-wide opacity-70">Croissance mensuelle</p>
                        <p className="text-2xl font-semibold">{platformStats.monthlyGrowth}%</p>
                      </div>
                    </div>
                    <p className="text-xs opacity-70">Nouvelles agences ce mois</p>
                  </div>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className={cardClass}>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Agences récemment inscrites</h3>
                  {recentAgencies.length > 0 ? (
                    <div className="space-y-3">
                      {recentAgencies.map((agency) => (
                        <div
                          key={agency.id}
                          className={clsx(
                            'flex items-center justify-between rounded-xl border px-4 py-3 transition-colors',
                            isDarkMode
                              ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80'
                              : 'border-slate-200 bg-slate-50 hover:bg-white',
                          )}
                        >
                          <div>
                            <p className="font-medium">{agency.name}</p>
                            <p className="text-xs opacity-70">{agency.city}</p>
                          </div>
                          <span className="text-xs opacity-70">
                            {new Date(agency.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 opacity-70">
                      <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p>Aucune agence récente</p>
                    </div>
                  )}
                </div>
              </Card>

              <Card className={cardClass}>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Alertes système</h3>
                  {systemAlerts.length > 0 ? (
                    <div className="space-y-3">
                      {systemAlerts.map((alert, index) => {
                        const palette =
                          alert.type === 'warning'
                            ? { bg: 'bg-amber-100 dark:bg-amber-500/10', dot: 'bg-amber-500' }
                            : alert.type === 'error'
                            ? { bg: 'bg-rose-100 dark:bg-rose-500/10', dot: 'bg-rose-500' }
                            : alert.type === 'success'
                            ? { bg: 'bg-emerald-100 dark:bg-emerald-500/10', dot: 'bg-emerald-500' }
                            : { bg: 'bg-sky-100 dark:bg-sky-500/10', dot: 'bg-sky-500' };
                        return (
                          <div
                            key={index}
                            className={clsx(
                              'flex items-start space-x-3 rounded-xl px-4 py-3 text-sm',
                              palette.bg,
                              isDarkMode && 'border border-white/5',
                            )}
                          >
                            <span className={clsx('mt-1 h-2 w-2 rounded-full', palette.dot)} />
                            <div>
                              <p className="font-medium">{alert.title}</p>
                              <p className="text-xs opacity-80">{alert.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 opacity-70">Aucune alerte en cours</div>
                  )}
                </div>
              </Card>
            </div>

            <Card className={cardClass}>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Demandes d'approbation d'agences</h3>
                {requests.length > 0 ? (
                  <div className="space-y-4">
                    {requests.map((req) => (
                      <div
                        key={req.id}
                        className={clsx(
                          'rounded-xl border p-4 transition-colors',
                          isDarkMode
                            ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80'
                            : 'border-slate-200 bg-white',
                        )}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="font-medium">{req.name}</p>
                            <p className="opacity-70">Registre : {req.commercial_register}</p>
                          </div>
                          <div>
                            <p>Email : {req.email}</p>
                            <p>Directeur : {req.director_first_name} {req.director_last_name}</p>
                          </div>
                          <div>
                            <p>Téléphone : {req.phone}</p>
                            <p>Ville : {req.city}</p>
                          </div>
                          <div>
                            <p>Logo : {req.logo_temp_path ? req.logo_temp_path : 'Aucun'}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => approve(req)}>
                            Approuver
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => reject(req, 'Rejet automatique')}>
                            Rejeter
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm opacity-70 text-center py-6">Aucune demande en attente</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'agencies' && <AgencyManagement />}
        {activeTab === 'subscriptions' && <SubscriptionManagement />}
        {activeTab === 'rankings' && <AgencyRankings />}
        {activeTab === 'settings' && <PlatformSettings />}
      </div>
    </div>
  );
};

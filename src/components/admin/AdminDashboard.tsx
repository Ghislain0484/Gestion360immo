import React, { useState } from 'react';
// Trigger build for Platform Admin Management fix
import { AdminHeader } from './layout/AdminHeader';
import { AdminSidebar } from './layout/AdminSidebar';
import { AdminStats } from './dashboard/AdminStats';
import { AgenciesOverview } from './dashboard/AgenciesOverview';
import { RevenueChart } from './dashboard/RevenueChart';
import { ActivityFeed } from './dashboard/ActivityFeed';
import { AgenciesList } from './agencies/AgenciesList';
import { AgencyDetails } from './agencies/AgencyDetails';
import { SubscriptionPlans } from './subscriptions/SubscriptionPlans';
import { ActiveSubscriptions } from './subscriptions/ActiveSubscriptions';
import { RegistrationRequests } from './requests/RegistrationRequests';
import { AgencyRankingsEnhanced } from './rankings/AgencyRankingsEnhanced';
import { FinancialReports } from './reports/FinancialReports';
import { PlatformOwnersList } from './owners/PlatformOwnersList';
import { PlatformSettings } from './PlatformSettings';
import { Agency } from '../../types/db';
import { useAdmin } from '../../contexts/AdminContext';
import { useAgencies } from '../../hooks/useAdminQueries';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);

  const { platformStats, pendingRequestsCount, loading } = useAdmin();

  React.useEffect(() => {
    setSelectedAgency(null);
  }, [activeTab]);

  const { data: agencies = [] } = useAgencies();

  const recentAgencies = React.useMemo(() => {
    return [...agencies]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [agencies]);

  const headerStats = platformStats
    ? {
        activeAgencies: platformStats.activeAgencies,
        todayRevenue: platformStats.todayRevenue || 0,
        pendingRequests: pendingRequestsCount,
      }
    : undefined;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 font-sans dark:bg-slate-950">
      <div className="pointer-events-none absolute right-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-200/20 blur-[120px] animate-pulse dark:bg-indigo-500/10" />
      <div
        className="pointer-events-none absolute bottom-[-5%] left-[-5%] h-[30%] w-[30%] rounded-full bg-purple-200/20 blur-[100px] animate-pulse dark:bg-purple-500/10"
        style={{ animationDelay: '2s' }}
      />
      <div className="pointer-events-none absolute left-[10%] top-[30%] h-[20%] w-[20%] rounded-full bg-emerald-100/30 blur-[80px] dark:bg-emerald-500/10" />

      <div className="relative z-10">
        <AdminHeader platformStats={headerStats} onNavigate={setActiveTab} />

        <div className="flex">
          <AdminSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            pendingRequestsCount={pendingRequestsCount}
          />

          <main className="relative flex-1 p-10">
            <div className="mx-auto max-w-[1400px] px-4">
              <div className="group relative">
                <div className="pointer-events-none absolute -inset-1 rounded-[40px] bg-gradient-to-r from-indigo-500/10 to-purple-500/10 blur opacity-25 transition duration-1000 group-hover:opacity-40 group-hover:duration-200" />
                <div className="relative min-h-[calc(100vh-160px)] overflow-hidden rounded-[36px] border border-white/40 bg-white/70 shadow-2xl shadow-indigo-500/5 backdrop-blur-3xl dark:border-slate-800/70 dark:bg-slate-950/70 dark:shadow-black/30">
                  <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

                  <div className="p-8 md:p-12">
                    {activeTab === 'overview' && (
                      <div className="animate-slide-up space-y-10">
                        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                          <div>
                            <div className="mb-3 flex items-center gap-2">
                              <span className="h-1.5 w-8 rounded-full bg-indigo-500" />
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">
                                Platform Metrics
                              </span>
                            </div>
                            <h2 className="mb-3 text-5xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
                              Tableau de{' '}
                              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                bord
                              </span>
                            </h2>
                            <p className="max-w-xl text-lg font-medium text-slate-500 dark:text-slate-300">
                              Pilotez l'ensemble de votre ecosysteme immobilier avec une precision absolue.
                            </p>
                          </div>
                          <div className="flex gap-4">
                            <div className="rounded-3xl bg-slate-900 p-4 shadow-xl shadow-slate-900/10 dark:bg-slate-800">
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Status global
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="font-bold text-white">100% operationnel</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <AdminStats
                          stats={platformStats}
                          loading={loading}
                          pendingRequestsCount={pendingRequestsCount}
                        />

                        <div className="grid gap-10 lg:grid-cols-2">
                          <div className="group/card relative overflow-hidden rounded-[32px] border border-slate-200/60 bg-slate-50/70 p-1 shadow-sm transition-all hover:border-indigo-500/20 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-500/30">
                            <div className="p-8">
                              <AgenciesOverview
                                agencies={recentAgencies}
                                loading={loading}
                                onViewDetails={setSelectedAgency}
                              />
                            </div>
                          </div>
                          <div className="group/card relative overflow-hidden rounded-[32px] border border-slate-200/60 bg-slate-50/70 p-1 shadow-sm transition-all hover:border-purple-500/20 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-purple-500/30">
                            <div className="p-8">
                              <RevenueChart stats={platformStats} loading={loading} />
                            </div>
                          </div>
                        </div>

                        <ActivityFeed loading={loading} />
                      </div>
                    )}

                    {activeTab === 'agencies' && (
                      <div className="animate-slide-up space-y-8">
                        <div className="mb-10">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="h-1.5 w-8 rounded-full bg-indigo-500" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">
                              Management
                            </span>
                          </div>
                          <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Gestion des <span className="text-indigo-600 text-shadow-glow">agences</span>
                          </h2>
                          <p className="max-w-2xl text-lg text-slate-500 dark:text-slate-300">
                            Supervisez les agences partenaires, gerez les acces et optimisez les collaborations.
                          </p>
                        </div>
                        <AgenciesList onViewDetails={setSelectedAgency} />
                      </div>
                    )}

                    {selectedAgency && (
                      <AgencyDetails
                        agency={selectedAgency}
                        onClose={() => setSelectedAgency(null)}
                        onUpdate={() => {
                          setSelectedAgency(null);
                          window.location.reload();
                        }}
                      />
                    )}

                    {activeTab === 'subscriptions' && (
                      <div className="animate-slide-up space-y-8">
                        <div className="mb-10">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="h-1.5 w-8 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">
                              Billing Logic
                            </span>
                          </div>
                          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Abonnements et <span className="text-emerald-600">facturation</span>
                          </h2>
                        </div>
                        <SubscriptionPlans />
                        <ActiveSubscriptions />
                      </div>
                    )}

                    {activeTab === 'requests' && (
                      <div className="animate-slide-up space-y-8">
                        <div className="mb-10">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="h-1.5 w-8 rounded-full bg-amber-500" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500">
                              Quality Control
                            </span>
                          </div>
                          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Nouveaux <span className="text-amber-600">partenaires</span>
                          </h2>
                        </div>
                        <RegistrationRequests />
                      </div>
                    )}

                    {activeTab === 'owners' && (
                      <div className="animate-slide-up space-y-8">
                        <div className="mb-10">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="h-1.5 w-8 rounded-full bg-indigo-500" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">
                              Management
                            </span>
                          </div>
                          <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Pilotage <span className="text-indigo-600">proprietaires</span>
                          </h2>
                          <p className="max-w-2xl text-lg text-slate-500 dark:text-slate-300">
                            Visualisez et gerez les abonnements de tous les proprietaires de la plateforme.
                          </p>
                        </div>
                        <PlatformOwnersList />
                      </div>
                    )}

                    {activeTab === 'rankings' && <div className="animate-slide-up"><AgencyRankingsEnhanced /></div>}
                    {activeTab === 'reports' && <div className="animate-slide-up"><FinancialReports /></div>}
                    {activeTab === 'settings' && <div className="animate-slide-up"><PlatformSettings /></div>}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-up {
          animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .text-shadow-glow {
          text-shadow: 0 0 20px rgba(79, 70, 229, 0.1);
        }
      `}</style>
    </div>
  );
};

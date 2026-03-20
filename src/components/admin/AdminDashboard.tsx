import React, { useState } from 'react';
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
import { PlatformSettings } from './PlatformSettings';
import { Agency } from '../../types/db';
import { useAdmin } from '../../contexts/AdminContext';
import { useAgencies } from '../../hooks/useAdminQueries';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);

  // Utilisation du Context Admin pour les stats globales
  const { platformStats, pendingRequestsCount, loading } = useAdmin();

  // Reset selected agency when tab changes to avoid blocking navigation/overlay
  React.useEffect(() => {
    setSelectedAgency(null);
  }, [activeTab]);

  // Utilisation de React Query pour les agences
  const { data: agencies = [] } = useAgencies();

  // Agences récentes (5 dernières)
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
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-200/20 blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full bg-purple-200/20 blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[30%] left-[10%] w-[20%] h-[20%] rounded-full bg-emerald-100/30 blur-[80px] pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <AdminHeader platformStats={headerStats} />

        <div className="flex">
          {/* Sidebar */}
          <AdminSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            pendingRequestsCount={pendingRequestsCount}
          />

          {/* Main Content Area */}
          <main className="flex-1 p-10 relative">
            <div className="max-w-[1400px] mx-auto px-4">
              {/* Glassmorphism Wrapper for Content */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-[40px] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 pointer-events-none"></div>
                <div className="relative bg-white/70 backdrop-blur-3xl border border-white/40 shadow-2xl shadow-indigo-500/5 rounded-[36px] overflow-hidden min-h-[calc(100vh-160px)]">

                  {/* Decorative Header inner */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

                  <div className="p-8 md:p-12">
                    {/* Vue d'ensemble */}
                    {activeTab === 'overview' && (
                      <div className="space-y-10 animate-slide-up">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="h-1.5 w-8 rounded-full bg-indigo-500" />
                              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em]">Platform Metrics</span>
                            </div>
                            <h2 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-3">
                              Tableau de <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">bord</span>
                            </h2>
                            <p className="text-slate-500 text-lg font-medium max-w-xl">
                              Pilotez l'ensemble de votre écosystème immobilier avec une précision absolue.
                            </p>
                          </div>
                          <div className="flex gap-4">
                            <div className="p-4 rounded-3xl bg-slate-900 shadow-xl shadow-slate-900/10">
                              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Status global</p>
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-white font-bold">100% Opérationnel</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Statistiques globales */}
                        <AdminStats
                          stats={platformStats}
                          loading={loading}
                          pendingRequestsCount={pendingRequestsCount}
                        />

                        {/* Grille Analytique */}
                        <div className="grid gap-10 lg:grid-cols-2">
                          <div className="group/card relative rounded-[32px] overflow-hidden bg-slate-50/50 p-1 border border-slate-200/50 transition-all hover:border-indigo-500/20 hover:bg-white shadow-sm hover:shadow-2xl">
                            <div className="p-8">
                              <AgenciesOverview 
                                agencies={recentAgencies} 
                                loading={loading} 
                                onViewDetails={setSelectedAgency}
                              />
                            </div>
                          </div>
                          <div className="group/card relative rounded-[32px] overflow-hidden bg-slate-50/50 p-1 border border-slate-200/50 transition-all hover:border-purple-500/20 hover:bg-white shadow-sm hover:shadow-2xl">
                            <div className="p-8">
                              <RevenueChart stats={platformStats} loading={loading} />
                            </div>
                          </div>
                        </div>

                        {/* Activité */}
                        <ActivityFeed loading={loading} />
                      </div>
                    )}

                    {/* Other tabs with similar refined layouts */}
                    {activeTab === 'agencies' && (
                      <div className="space-y-8 animate-slide-up">
                        <div className="mb-10">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="h-1.5 w-8 rounded-full bg-indigo-500" />
                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em]">Management</span>
                          </div>
                          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                            Gestion des <span className="text-indigo-600 text-shadow-glow">agences</span>
                          </h2>
                          <p className="text-slate-500 text-lg max-w-2xl">
                            Supervisez les agences partenaires, gérez les accès et optimisez les collaborations.
                          </p>
                        </div>
                        <AgenciesList onViewDetails={setSelectedAgency} />
                      </div>
                    )}

                    {/* Modal de détails de l'agence (Accessible depuis n'importe quel onglet) */}
                    {selectedAgency && (
                      <AgencyDetails
                        agency={selectedAgency}
                        onClose={() => setSelectedAgency(null)}
                        onUpdate={() => {
                          setSelectedAgency(null);
                          // Optionnel: on peut forcer un rechargement si nécessaire, 
                          // mais React Query devrait déjà l'avoir fait via les invalidations
                          window.location.reload();
                        }}
                      />
                    )}

                    {/* Simplified remaining tabs for brevity but consistent with main style */}
                    {activeTab === 'subscriptions' && (
                      <div className="space-y-8 animate-slide-up">
                        <div className="mb-10">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="h-1.5 w-8 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em]">Billing Logic</span>
                          </div>
                          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Abonnements & <span className="text-emerald-600">Facturation</span></h2>
                        </div>
                        <SubscriptionPlans />
                        <ActiveSubscriptions />
                      </div>
                    )}

                    {activeTab === 'requests' && (
                      <div className="space-y-8 animate-slide-up">
                        <div className="mb-10">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="h-1.5 w-8 rounded-full bg-amber-500" />
                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em]">Quality Control</span>
                          </div>
                          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Nouveaux <span className="text-amber-600">Partenaires</span></h2>
                        </div>
                        <RegistrationRequests />
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

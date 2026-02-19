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
      todayRevenue: platformStats.totalRevenue / 30 || 0, // Estimation journalière
      pendingRequests: pendingRequestsCount,
    }
    : undefined;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 50%, #ecfdf5 100%)' }}>
      {/* Header */}
      <AdminHeader platformStats={headerStats} />

      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingRequestsCount={pendingRequestsCount}
        />

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Vue d'ensemble */}
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-fade-in">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-emerald-600/10 rounded-3xl blur-3xl" />
                  <div className="relative">
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-emerald-600 bg-clip-text text-transparent mb-2">
                      Tableau de bord
                    </h2>
                    <p className="text-neutral-600 text-lg">
                      Vue d'ensemble de la plateforme Gestion360Immo
                    </p>
                  </div>
                </div>

                {/* Statistiques globales */}
                <AdminStats
                  stats={platformStats}
                  loading={loading}
                  pendingRequestsCount={pendingRequestsCount}
                />

                {/* Grille 2 colonnes : Agences + Revenus */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <AgenciesOverview agencies={recentAgencies} loading={loading} />
                  <RevenueChart stats={platformStats} loading={loading} />
                </div>

                {/* Activité récente */}
                <ActivityFeed loading={loading} />
              </div>
            )}

            {/* Gestion des agences */}
            {activeTab === 'agencies' && (
              <div className="space-y-6 animate-fade-in">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl blur-3xl" />
                  <div className="relative">
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent mb-2">
                      Gestion des agences
                    </h2>
                    <p className="text-neutral-600 text-lg">
                      Gérez toutes les agences de la plateforme
                    </p>
                  </div>
                </div>
                <AgenciesList onViewDetails={setSelectedAgency} />
                {selectedAgency && (
                  <AgencyDetails
                    agency={selectedAgency}
                    onClose={() => setSelectedAgency(null)}
                    onUpdate={() => {
                      // Rafraîchir la liste des agences
                      setSelectedAgency(null);
                      window.location.reload(); // Temporaire - React Query invalidera automatiquement
                    }}
                  />
                )}
              </div>
            )}

            {/* Gestion des abonnements */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-6 animate-fade-in">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 rounded-3xl blur-3xl" />
                  <div className="relative">
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent mb-2">
                      Gestion des abonnements
                    </h2>
                    <p className="text-neutral-600 text-lg">
                      Plans d'abonnement et souscriptions actives
                    </p>
                  </div>
                </div>
                <SubscriptionPlans />
                <ActiveSubscriptions />
              </div>
            )}

            {/* Demandes d'inscription */}
            {activeTab === 'requests' && (
              <div className="space-y-6 animate-fade-in">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-orange-600/10 rounded-3xl blur-3xl" />
                  <div className="relative">
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent mb-2">
                      Demandes d'inscription
                    </h2>
                    <p className="text-neutral-600 text-lg">
                      Gérez les demandes d'inscription des nouvelles agences
                    </p>
                  </div>
                </div>
                <RegistrationRequests />
              </div>
            )}

            {/* Classements */}
            {activeTab === 'rankings' && (
              <div className="animate-fade-in">
                <AgencyRankingsEnhanced />
              </div>
            )}

            {/* Rapports */}
            {activeTab === 'reports' && (
              <div className="space-y-6 animate-fade-in">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl blur-3xl" />
                  <div className="relative">
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent mb-2">
                      Rapports et Analytics
                    </h2>
                    <p className="text-neutral-600 text-lg">
                      Analyses financières et rapports détaillés
                    </p>
                  </div>
                </div>
                <FinancialReports />
              </div>
            )}

            {/* Paramètres */}
            {activeTab === 'settings' && (
              <div className="space-y-6 animate-fade-in">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-600/10 to-gray-600/10 rounded-3xl blur-3xl" />
                  <div className="relative">
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-700 to-gray-600 bg-clip-text text-transparent mb-2">
                      Paramètres de la plateforme
                    </h2>
                    <p className="text-neutral-600 text-lg">
                      Configuration et paramètres généraux
                    </p>
                  </div>
                </div>
                <PlatformSettings />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Styles pour les animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

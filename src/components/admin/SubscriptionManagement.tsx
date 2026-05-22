import React, { useState } from 'react';
import { DollarSign, Calendar, AlertTriangle, CheckCircle, CreditCard, Ban, RefreshCw, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import {
  useAgencies,
  useToggleAgencyStatus,
  useExtendSubscription,
  useUpdateAgencyPlan,
  usePlatformSettings
} from '../../hooks/useAdminQueries';
import { Agency } from '../../types/db';

export const SubscriptionManagement: React.FC = () => {
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');

  // React Query hooks
  const { data: agencies = [], isLoading, error, refetch } = useAgencies();
  const { data: settings } = usePlatformSettings();
  const toggleStatus = useToggleAgencyStatus();
  const updatePlan = useUpdateAgencyPlan();

  // Calculs dérivés
  const activeAgencies = agencies.filter((a) => a.subscription_status === 'active');
  const suspendedAgencies = agencies.filter((a) => a.subscription_status === 'suspended');

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string | null | undefined) => {
    const actualStatus = status || 'active';
    const variants: Record<string, any> = {
      active: { variant: 'success', label: 'Actif' },
      suspended: { variant: 'danger', label: 'Suspendu' },
      trial: { variant: 'warning', label: 'Essai' },
      cancelled: { variant: 'secondary', label: 'Annulé' },
    };
    const config = variants[actualStatus] || variants.active;
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
  };

  const getPlanLabel = (plan: string | null | undefined): string => {
    return 'Fintech 1%';
  };

  const handleSuspend = (agency: Agency) => {
    setSelectedAgency(agency);
    setShowSuspendModal(true);
  };

  const handleActivate = (agency: Agency) => {
    toggleStatus.mutate({
      id: agency.id,
      currentStatus: agency.subscription_status
    });
  };

  const confirmSuspend = () => {
    if (!selectedAgency || !suspensionReason.trim()) return;

    toggleStatus.mutate(
      { id: selectedAgency.id, currentStatus: 'active' },
      {
        onSuccess: () => {
          setShowSuspendModal(false);
          setSelectedAgency(null);
          setSuspensionReason('');
        },
      }
    );
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
          <p className="text-gray-600 mb-4">Impossible de charger les abonnements</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Gestion de la Plateforme (Modèle Fintech 1%)</h2>
        <div className="flex items-center space-x-3">
          <Badge variant="success" size="sm">
            Commission 1% Fintech
          </Badge>
          {suspendedAgencies.length > 0 && (
            <Badge variant="danger" size="sm">
              {suspendedAgencies.length} suspendue{suspendedAgencies.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">
              0 FCFA
            </div>
            <p className="text-sm text-gray-600">Frais d'Abonnement Fixes</p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {activeAgencies.length}
            </div>
            <p className="text-sm text-gray-600">Agences actives</p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-red-600 mb-2">
              {suspendedAgencies.length}
            </div>
            <p className="text-sm text-gray-600">Agences suspendues</p>
          </div>
        </Card>
      </div>

      {/* Plans Pricing */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-2xl rounded-[2rem] relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-40 h-40 text-indigo-400" />
        </div>
        <div className="p-8 md:p-12 relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-4 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest">
              Nouveau Modèle Économique Unique
            </span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-white">
            Accès Permanent &amp; Croissance Fintech unique à <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">1%</span> sur la plateforme
          </h3>
          <p className="max-w-3xl text-indigo-200 text-sm md:text-base leading-relaxed mb-8">
            Fini les abonnements mensuels fixes et restrictifs. Gestion360 s'aligne entièrement sur la réussite de votre activité immobilière. Vous ne payez rien si vous n'encaissez rien. Nous prélevons une commission minimale de 1% sur vos flux financiers gérés via notre passerelle fintech, vous libérant de tout coût d'infrastructure.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-indigo-900/60">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Frais Fixes</p>
              <p className="text-2xl font-black text-white">0 FCFA <span className="text-xs font-normal text-slate-400">/ mois</span></p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Fonctionnalités</p>
              <p className="text-2xl font-black text-white">100% Illimitées</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Engagement</p>
              <p className="text-2xl font-black text-white">Zéro Contrainte</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Subscriptions List */}
      {agencies.length > 0 ? (
        <div className="space-y-4">
          {agencies.map((agency) => (
            <Card key={agency.id} className="hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{agency.name}</h3>
                    <p className="text-sm text-gray-500">
                      Modèle Performance ({getPlanLabel(agency.plan_type)})
                    </p>
                  </div>
                  {getStatusBadge(agency.subscription_status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Ville</p>
                    <p className="font-medium">{agency.city}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium">{agency.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date d'inscription</p>
                    <p className="font-medium">
                      {new Date(agency.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    {agency.subscription_status === 'suspended' && (
                      <div className="flex items-center text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        <span>Accès suspendu</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    {agency.subscription_status === 'active' ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleSuspend(agency)}
                        isLoading={toggleStatus.isPending}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Suspendre
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleActivate(agency)}
                        isLoading={toggleStatus.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Activer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun abonnement</h3>
          <p className="text-gray-600">Les abonnements des agences apparaîtront ici.</p>
        </Card>
      )}

      {/* Suspend Modal */}
      <Modal
        isOpen={showSuspendModal}
        onClose={() => {
          setShowSuspendModal(false);
          setSelectedAgency(null);
          setSuspensionReason('');
        }}
        title="Suspendre l'accès de l'agence"
        size="md"
      >
        {selectedAgency && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">{selectedAgency.name}</h4>
              <p className="text-sm text-gray-600">
                Plan {getPlanLabel(selectedAgency.plan_type)}
              </p>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                L'agence perdra l'accès à la plateforme jusqu'à la réactivation.
              </p>
            </div>

            <Input
              label="Raison de la suspension"
              placeholder="Ex: Activité suspecte ou résiliation"
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
            />

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowSuspendModal(false);
                  setSelectedAgency(null);
                  setSuspensionReason('');
                }}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={confirmSuspend}
                isLoading={toggleStatus.isPending}
                disabled={!suspensionReason.trim()}
              >
                Confirmer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
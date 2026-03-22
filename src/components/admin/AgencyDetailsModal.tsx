import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Agency } from '../../types/db';
import { BadgeVariant, SubscriptionStatus, PlanType } from '../../types/enums';

interface AgencyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAgency: (Agency & {
    subscription_status?: SubscriptionStatus;
    plan_type?: PlanType;
    monthly_fee?: number;
  }) | null;
  getStatusColor: (status: SubscriptionStatus) => BadgeVariant;
  getStatusLabel: (status: SubscriptionStatus) => string;
  getPlanLabel: (plan: PlanType) => string;
  formatCurrency: (amount: number) => string;
  onUpdate?: (id: string, updates: Partial<Agency>) => Promise<void>;
  isUpdating?: boolean;
}

const AVAILABLE_MODULES = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'properties', label: 'Propriétés' },
  { id: 'owners', label: 'Propriétaires' },
  { id: 'tenants', label: 'Locataires' },
  { id: 'contracts', label: 'Contrats' },
  { id: 'caisse', label: 'Caisse' },
  { id: 'hotel', label: 'Gestion Hôtelière' },
  { id: 'residences', label: 'Résidences Meublées' },
  { id: 'collaboration', label: 'Collaboration' },
  { id: 'etats-des-lieux', label: 'États des lieux' },
  { id: 'travaux', label: 'Travaux' },
];

export const AgencyDetailsModal: React.FC<AgencyDetailsModalProps> = ({
  isOpen,
  onClose,
  selectedAgency,
  getPlanLabel,
  formatCurrency,
  onUpdate,
  isUpdating,
}) => {
  const [editedModules, setEditedModules] = React.useState<string[]>([]);
  const [editedStatus, setEditedStatus] = React.useState<SubscriptionStatus>('active');

  React.useEffect(() => {
    if (selectedAgency) {
      setEditedModules(selectedAgency.enabled_modules || ['base']);
      setEditedStatus(selectedAgency.subscription_status || 'active');
    }
  }, [selectedAgency, isOpen]);

  const handleToggleModule = (moduleId: string) => {
    setEditedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(m => m !== moduleId) 
        : [...prev, moduleId]
    );
  };

  const handleSave = async () => {
    if (!selectedAgency || !onUpdate) return;
    await onUpdate(selectedAgency.id, {
      enabled_modules: editedModules,
      status: editedStatus as any
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Détails de l'agence"
      size="lg"
    >
      {!selectedAgency ? (
        <div className="p-12 text-center text-gray-500">Chargement...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Informations générales</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Nom:</strong> {selectedAgency.name}</p>
                <p><strong>Registre:</strong> {selectedAgency.commercial_register}</p>
                <p><strong>Ville:</strong> {selectedAgency.city}</p>
                <p><strong>Email:</strong> {selectedAgency.email}</p>
                <p><strong>Téléphone:</strong> {selectedAgency.phone}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Abonnement & Statut</h4>
              <div className="space-y-4">
                <div className="text-sm">
                  {selectedAgency.plan_type && (
                    <p><strong>Plan:</strong> {getPlanLabel(selectedAgency.plan_type)}</p>
                  )}
                  {selectedAgency.monthly_fee !== undefined && (
                    <p><strong>Montant:</strong> {formatCurrency(selectedAgency.monthly_fee)}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Statut de l'agence</label>
                  <select
                    value={editedStatus}
                    onChange={(e) => setEditedStatus(e.target.value as SubscriptionStatus)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  >
                    <option value="pending">En attente</option>
                    <option value="approved">Approuvée / Actif</option>
                    <option value="suspended">Suspendu</option>
                    <option value="rejected">Rejeté</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium text-gray-900 mb-4">Gestion des Modules</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {AVAILABLE_MODULES.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => handleToggleModule(mod.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                    editedModules.includes(mod.id)
                      ? 'bg-red-50 border-red-200 text-red-700 shadow-sm'
                      : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    editedModules.includes(mod.id) ? 'bg-red-500 border-red-500' : 'border-gray-300'
                  }`}>
                    {editedModules.includes(mod.id) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-semibold">{mod.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t font-semibold">
            <Button variant="ghost" onClick={onClose} disabled={isUpdating}>
              Annuler
            </Button>
            <Button 
              onClick={handleSave} 
              isLoading={isUpdating}
              className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
            >
              Sauvegarder les modifications
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
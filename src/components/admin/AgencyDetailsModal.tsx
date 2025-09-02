import React from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Agency, SubscriptionStatus, PlanType } from '../../types/db';
import { BadgeVariant } from '../../types/ui';

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
}

export const AgencyDetailsModal: React.FC<AgencyDetailsModalProps> = ({
  isOpen,
  onClose,
  selectedAgency,
  getStatusColor,
  getStatusLabel,
  getPlanLabel,
  formatCurrency,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Détails de l'agence"
      size="lg"
    >
      {selectedAgency && (
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
                {selectedAgency.is_accredited && (
                  <p><strong>Numéro d'accréditation:</strong> {selectedAgency.accreditation_number || 'N/A'}</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Abonnement</h4>
              <div className="space-y-2 text-sm">
                {selectedAgency.plan_type && (
                  <p><strong>Plan:</strong> {getPlanLabel(selectedAgency.plan_type)}</p>
                )}
                {selectedAgency.subscription_status && (
                  <p><strong>Statut:</strong> 
                    <Badge variant={getStatusColor(selectedAgency.subscription_status)} size="sm" className="ml-2">
                      {getStatusLabel(selectedAgency.subscription_status)}
                    </Badge>
                  </p>
                )}
                {selectedAgency.monthly_fee !== undefined && (
                  <p><strong>Montant mensuel:</strong> {formatCurrency(selectedAgency.monthly_fee)}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button variant="ghost" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
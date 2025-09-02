import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Building2, MapPin, Eye, Settings } from 'lucide-react';
import { Agency, SubscriptionStatus, PlanType } from '../../types/db';
import { BadgeVariant } from '../../types/ui';
import { Dispatch, SetStateAction } from 'react';

interface AgencyCardProps {
  agency: Agency & {
    subscription_status?: SubscriptionStatus;
    plan_type?: PlanType;
    monthly_fee?: number;
  };
  getStatusColor: (status: SubscriptionStatus) => BadgeVariant;
  getStatusLabel: (status: SubscriptionStatus) => string;
  getPlanLabel: (plan: PlanType) => string;
  formatCurrency: (amount: number) => string;
  setSelectedAgency: Dispatch<SetStateAction<(Agency & { subscription_status?: SubscriptionStatus; plan_type?: PlanType; monthly_fee?: number }) | null>>;
  setShowDetails: (show: boolean) => void;
}

export const AgencyCard: React.FC<AgencyCardProps> = ({
  agency,
  getStatusColor,
  getStatusLabel,
  getPlanLabel,
  formatCurrency,
  setSelectedAgency,
  setShowDetails,
}) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{agency.name}</h3>
              <p className="text-sm text-gray-500">{agency.commercial_register}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {agency.subscription_status && (
              <Badge variant={getStatusColor(agency.subscription_status)} size="sm">
                {getStatusLabel(agency.subscription_status)}
              </Badge>
            )}
            {agency.plan_type && (
              <Badge variant="secondary" size="sm">
                {getPlanLabel(agency.plan_type)}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{agency.city}</span>
          </div>
          <div className="text-sm text-gray-600">
            <span>Email: {agency.email}</span>
          </div>
          <div className="text-sm text-gray-600">
            <span>Téléphone: {agency.phone}</span>
          </div>
        </div>

        {agency.monthly_fee !== undefined && (
          <div className="p-3 bg-blue-50 rounded-lg mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-800">Abonnement mensuel:</span>
              <span className="font-medium text-blue-900">
                {formatCurrency(agency.monthly_fee || 0)}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Inscrite le {agency.created_at ? new Date(agency.created_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
          </span>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedAgency(agency);
                setShowDetails(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Clock, CheckCircle, Ban } from 'lucide-react';
import { AgencyRegistrationRequest } from '../../types/db';

interface RegistrationRequestCardProps {
  request: AgencyRegistrationRequest; // Use AgencyRegistrationRequest
  approveRegistration: (requestId: string) => Promise<void>;
  rejectRegistration: (requestId: string) => Promise<void>;
}

export const RegistrationRequestCard: React.FC<RegistrationRequestCardProps> = ({
  request,
  approveRegistration,
  rejectRegistration,
}) => {
  return (
    <Card className="border-l-4 border-l-yellow-500">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {request.agency_name || 'Nom non spécifié'}
              </h3>
              <p className="text-sm text-gray-500">Demande d'inscription</p>
            </div>
          </div>
          <Badge variant="warning" size="sm">En attente</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Informations agence</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>Nom:</strong> {request.agency_name}</p>
              <p><strong>Registre:</strong> {request.commercial_register}</p>
              <p><strong>Ville:</strong> {request.city}</p>
              <p><strong>Adresse:</strong> {request.address}</p>
              <p><strong>Téléphone:</strong> {request.phone}</p>
              {request.is_accredited && (
                <p><strong>Numéro d'accréditation:</strong> {request.accreditation_number || 'N/A'}</p>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Directeur</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>Nom:</strong> {request.director_first_name} {request.director_last_name}</p>
              <p><strong>Email:</strong> {request.director_email}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-xs text-gray-500">
            Demande reçue le {request.created_at ? new Date(request.created_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
          </span>
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => approveRegistration(request.id)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approuver
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => rejectRegistration(request.id)}
            >
              <Ban className="h-4 w-4 mr-1" />
              Rejeter
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
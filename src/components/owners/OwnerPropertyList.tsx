import React, { useState } from 'react';
import { Building2, DollarSign, Calendar, FileText, Eye, Edit, Printer } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface OwnerProperty {
  id: string;
  title: string;
  type: string;
  monthlyRent: number;
  commission: number;
  ownerPayment: number;
  contractDate: Date;
  status: 'active' | 'vacant' | 'maintenance';
  tenant?: {
    name: string;
    phone: string;
  };
}

interface OwnerPropertyListProps {
  ownerId: string;
  ownerName: string;
  registrationDate: Date;
}

export const OwnerPropertyList: React.FC<OwnerPropertyListProps> = ({
  ownerId,
  ownerName,
  registrationDate
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<OwnerProperty | null>(null);

  // Mock properties data for the owner
  const properties: OwnerProperty[] = [
    {
      id: 'prop_001',
      title: 'Villa Cocody Angré',
      type: 'Villa',
      monthlyRent: 450000,
      commission: 45000,
      ownerPayment: 405000,
      contractDate: new Date(registrationDate.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 jours avant
      status: 'active',
      tenant: {
        name: 'Jean Baptiste Kone',
        phone: '+225 01 02 03 04 05'
      }
    },
    {
      id: 'prop_002',
      title: 'Appartement Plateau',
      type: 'Appartement',
      monthlyRent: 320000,
      commission: 32000,
      ownerPayment: 288000,
      contractDate: new Date(registrationDate.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 jour avant
      status: 'active',
      tenant: {
        name: 'Marie Bamba',
        phone: '+225 05 06 07 08 09'
      }
    },
    {
      id: 'prop_003',
      title: 'Maison Yopougon',
      type: 'Maison',
      monthlyRent: 280000,
      commission: 28000,
      ownerPayment: 252000,
      contractDate: new Date(registrationDate.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 jours après
      status: 'vacant'
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'vacant': return 'warning';
      case 'maintenance': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Loué';
      case 'vacant': return 'Vacant';
      case 'maintenance': return 'Maintenance';
      default: return status;
    }
  };

  const totalMonthlyRevenue = properties
    .filter(p => p.status === 'active')
    .reduce((total, p) => total + p.ownerPayment, 0);

  const totalCommissions = properties
    .filter(p => p.status === 'active')
    .reduce((total, p) => total + p.commission, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <div className="p-4 text-center">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-green-700">{properties.length}</div>
            <p className="text-sm text-green-600">Biens gérés</p>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200">
          <div className="p-4 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-lg font-bold text-blue-700">
              {formatCurrency(totalMonthlyRevenue)}
            </div>
            <p className="text-sm text-blue-600">Revenus mensuels</p>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-200">
          <div className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
            <div className="text-lg font-bold text-yellow-700">
              {formatCurrency(totalCommissions)}
            </div>
            <p className="text-sm text-yellow-600">Commissions agence</p>
          </div>
        </Card>
      </div>

      {/* Properties List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Biens de {ownerName}</h4>
          <div className="text-sm text-gray-500">
            Propriétaire depuis le {registrationDate.toLocaleDateString('fr-FR')}
          </div>
        </div>

        {properties.map((property) => (
          <Card key={property.id} className="bg-white/80 backdrop-blur-sm border-gray-200 hover:shadow-lg transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-6 w-6 text-green-600" />
                  <div>
                    <h5 className="font-semibold text-gray-900">{property.title}</h5>
                    <p className="text-sm text-gray-500">{property.type} • ID: {property.id}</p>
                  </div>
                </div>
                <Badge variant={getStatusColor(property.status)} size="sm">
                  {getStatusLabel(property.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50/80 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">Loyer mensuel</p>
                  <p className="font-semibold text-blue-800">
                    {formatCurrency(property.monthlyRent)}
                  </p>
                </div>
                <div className="text-center p-3 bg-red-50/80 rounded-lg">
                  <p className="text-xs text-red-600 mb-1">Commission (10%)</p>
                  <p className="font-semibold text-red-800">
                    {formatCurrency(property.commission)}
                  </p>
                </div>
                <div className="text-center p-3 bg-green-50/80 rounded-lg">
                  <p className="text-xs text-green-600 mb-1">Reversement</p>
                  <p className="font-semibold text-green-800">
                    {formatCurrency(property.ownerPayment)}
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50/80 rounded-lg">
                  <p className="text-xs text-purple-600 mb-1">Date contrat</p>
                  <p className="font-semibold text-purple-800">
                    {property.contractDate.toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              {property.tenant && (
                <div className="p-3 bg-gray-50/80 rounded-lg mb-4">
                  <p className="text-sm text-gray-600">
                    <strong>Locataire actuel :</strong> {property.tenant.name} ({property.tenant.phone})
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Contrat signé le {property.contractDate.toLocaleDateString('fr-FR')}
                  {property.contractDate < registrationDate && (
                    <span className="text-green-600 ml-2">✓ Antidaté</span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProperty(property);
                      setShowDetails(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Property Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedProperty(null);
        }}
        title="Détails du bien"
        size="lg"
      >
        {selectedProperty && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Informations générales</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Titre:</strong> {selectedProperty.title}</p>
                  <p><strong>Type:</strong> {selectedProperty.type}</p>
                  <p><strong>Statut:</strong> {getStatusLabel(selectedProperty.status)}</p>
                  <p><strong>Date du contrat:</strong> {selectedProperty.contractDate.toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Détails financiers</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Loyer mensuel:</strong> {formatCurrency(selectedProperty.monthlyRent)}</p>
                  <p><strong>Commission agence:</strong> {formatCurrency(selectedProperty.commission)}</p>
                  <p><strong>Reversement propriétaire:</strong> {formatCurrency(selectedProperty.ownerPayment)}</p>
                </div>
              </div>
            </div>

            {selectedProperty.tenant && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Locataire actuel</h4>
                <p className="text-sm text-blue-800">
                  <strong>Nom:</strong> {selectedProperty.tenant.name}<br />
                  <strong>Téléphone:</strong> {selectedProperty.tenant.phone}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
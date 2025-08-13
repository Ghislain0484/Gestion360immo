import React, { useState, useEffect } from 'react';
import { Search, UserCheck, Phone, MapPin, Briefcase, Flag, AlertTriangle, CheckCircle, XCircle, Building2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { dbService } from '../../lib/supabase';

interface TenantHistory {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  profession: string;
  nationality: string;
  payment_status: 'bon' | 'irregulier' | 'mauvais';
  photo_url?: string;
  agencies: { name: string };
  rentals: Array<{
    start_date: string;
    end_date?: string;
    monthly_rent: number;
    status: string;
    properties: { title: string };
  }>;
}

export const TenantHistorySearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [tenants, setTenants] = useState<TenantHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantHistory | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const searchTenants = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const results = await dbService.searchTenantsHistory(searchTerm, paymentFilter);
      setTenants(results || []);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'bon': return 'success';
      case 'irregulier': return 'warning';
      case 'mauvais': return 'danger';
      default: return 'secondary';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'bon': return <CheckCircle className="h-4 w-4" />;
      case 'irregulier': return <AlertTriangle className="h-4 w-4" />;
      case 'mauvais': return <XCircle className="h-4 w-4" />;
      default: return <UserCheck className="h-4 w-4" />;
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'bon': return 'Bon payeur';
      case 'irregulier': return 'Payeur irrégulier';
      case 'mauvais': return 'Mauvais payeur';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <UserCheck className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Recherche d'historique des locataires
            </h3>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchTenants()}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="bon">Bons payeurs</option>
              <option value="irregulier">Payeurs irréguliers</option>
              <option value="mauvais">Mauvais payeurs</option>
            </select>
            
            <Button onClick={searchTenants} disabled={loading || !searchTerm.trim()}>
              {loading ? 'Recherche...' : 'Rechercher'}
            </Button>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">
                  Collaboration inter-agences
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Cette recherche vous permet de consulter l'historique des locataires ayant été gérés par d'autres agences de la plateforme. 
                  Les montants des loyers ne sont pas affichés pour préserver la confidentialité commerciale.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Results */}
      {tenants.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              Résultats de recherche ({tenants.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((tenant) => (
              <Card key={tenant.id} className="hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    {tenant.photo_url ? (
                      <img
                        src={tenant.photo_url}
                        alt={`${tenant.first_name} ${tenant.last_name}`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">
                        {tenant.first_name} {tenant.last_name}
                      </h5>
                      <div className="flex items-center text-xs text-gray-500">
                        <Building2 className="h-3 w-3 mr-1" />
                        <span>{tenant.agencies.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-3 w-3 mr-2" />
                      <span>{tenant.phone}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-3 w-3 mr-2" />
                      <span>{tenant.city}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Briefcase className="h-3 w-3 mr-2" />
                      <span>{tenant.profession}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Flag className="h-3 w-3 mr-2" />
                      <span>{tenant.nationality}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Statut de paiement:</span>
                      <Badge variant={getPaymentStatusColor(tenant.payment_status)} size="sm">
                        <div className="flex items-center space-x-1">
                          {getPaymentStatusIcon(tenant.payment_status)}
                          <span>{getPaymentStatusLabel(tenant.payment_status)}</span>
                        </div>
                      </Badge>
                    </div>

                    {tenant.rentals && tenant.rentals.length > 0 && (
                      <div className="text-xs text-gray-500">
                        <p>{tenant.rentals.length} location(s) dans l'historique</p>
                        <p>Dernière: {tenant.rentals[0]?.properties?.title}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setShowDetails(true);
                      }}
                    >
                      Voir l'historique complet
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tenant Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedTenant(null);
        }}
        title="Historique détaillé du locataire"
        size="lg"
      >
        {selectedTenant && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              {selectedTenant.photo_url ? (
                <img
                  src={selectedTenant.photo_url}
                  alt={`${selectedTenant.first_name} ${selectedTenant.last_name}`}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserCheck className="h-8 w-8 text-blue-600" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedTenant.first_name} {selectedTenant.last_name}
                </h3>
                <p className="text-gray-600">Géré par {selectedTenant.agencies.name}</p>
                <Badge variant={getPaymentStatusColor(selectedTenant.payment_status)} size="sm" className="mt-1">
                  {getPaymentStatusLabel(selectedTenant.payment_status)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Informations personnelles</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Téléphone:</strong> {selectedTenant.phone}</p>
                  {selectedTenant.email && <p><strong>Email:</strong> {selectedTenant.email}</p>}
                  <p><strong>Adresse:</strong> {selectedTenant.address}, {selectedTenant.city}</p>
                  <p><strong>Profession:</strong> {selectedTenant.profession}</p>
                  <p><strong>Nationalité:</strong> {selectedTenant.nationality}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Historique des locations</h4>
                {selectedTenant.rentals && selectedTenant.rentals.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTenant.rentals.map((rental, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <p className="font-medium">{rental.properties.title}</p>
                        <p className="text-gray-600">
                          Du {new Date(rental.start_date).toLocaleDateString('fr-FR')}
                          {rental.end_date && ` au ${new Date(rental.end_date).toLocaleDateString('fr-FR')}`}
                        </p>
                        <Badge variant={rental.status === 'actif' ? 'success' : 'secondary'} size="sm">
                          {rental.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Aucun historique de location disponible</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">
                    Note de confidentialité
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Les montants des loyers et détails financiers ne sont pas affichés dans le cadre de la collaboration inter-agences. 
                    Seules les informations de profil et l'historique de paiement sont partagées.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
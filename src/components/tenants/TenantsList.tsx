import React, { useState } from 'react';
import { Plus, Search, Eye, Edit, Trash2, User, Phone, MapPin, Briefcase, Flag, FileText, DollarSign } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { TenantForm } from './TenantForm';
import { ReceiptGenerator } from '../receipts/ReceiptGenerator';
import { FinancialStatements } from '../financial/FinancialStatements';
import { Tenant, TenantFormData } from '../../types/tenant';
import { useRealtimeData, useSupabaseCreate, useSupabaseDelete } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const TenantsList: React.FC = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showReceiptGenerator, setShowReceiptGenerator] = useState(false);
  const [showFinancialStatements, setShowFinancialStatements] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaritalStatus, setFilterMaritalStatus] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');

  // Chargement des données
  const { data: tenants, loading, error, refetch, setData } = useRealtimeData<Tenant>(
    dbService.getTenants,
    'tenants'
  );

  const { create: createTenant, loading: creating } = useSupabaseCreate(
    dbService.createTenant,
    (newTenant) => {
      setData(prev => [newTenant, ...prev]);
      setShowForm(false);
    }
  );

  const { deleteItem: deleteTenant, loading: deleting } = useSupabaseDelete(
    dbService.deleteTenant,
    () => refetch()
  );

  const handleAddTenant = async (tenantData: TenantFormData) => {
    if (!user?.agencyId) {
      alert('Aucune agence associée');
      return;
    }
    
    try {
      const tenantPayload = {
        agency_id: user.agencyId,
        first_name: tenantData.firstName,
        last_name: tenantData.lastName,
        phone: tenantData.phone,
        email: tenantData.email || null,
        address: tenantData.address,
        city: tenantData.city,
        marital_status: tenantData.maritalStatus,
        spouse_name: tenantData.spouseName || null,
        spouse_phone: tenantData.spousePhone || null,
        children_count: tenantData.childrenCount,
        profession: tenantData.profession,
        nationality: tenantData.nationality,
        photo_url: tenantData.photoUrl || null,
        id_card_url: tenantData.idCardUrl || null,
        payment_status: tenantData.paymentStatus,
      };
      
      await createTenant(tenantPayload);
      
    } catch (error) {
      console.error('Erreur création locataire:', error);
      alert('Erreur lors de la création');
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (confirm('Supprimer ce locataire ?')) {
      try {
        await deleteTenant(tenantId);
      } catch (error) {
        console.error('Erreur suppression:', error);
      }
    }
  };

  const getMaritalStatusLabel = (status: string) => {
    const labels = {
      celibataire: 'Célibataire',
      marie: 'Marié(e)',
      divorce: 'Divorcé(e)',
      veuf: 'Veuf/Veuve'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels = {
      bon: 'Bon payeur',
      irregulier: 'Payeur irrégulier',
      mauvais: 'Mauvais payeur'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getMaritalStatusColor = (status: string) => {
    switch (status) {
      case 'marie': return 'success';
      case 'celibataire': return 'info';
      case 'divorce': return 'warning';
      case 'veuf': return 'secondary';
      default: return 'secondary';
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

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = 
      tenant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.phone.includes(searchTerm) ||
      tenant.profession.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMaritalStatus = filterMaritalStatus === 'all' || tenant.maritalStatus === filterMaritalStatus;
    const matchesPaymentStatus = filterPaymentStatus === 'all' || tenant.paymentStatus === filterPaymentStatus;
    
    return matchesSearch && matchesMaritalStatus && matchesPaymentStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Erreur: {error}</p>
        <Button onClick={refetch}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locataires</h1>
          <p className="text-gray-600 mt-1">
            Gestion des locataires ({tenants.length})
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un locataire
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <select
            value={filterPaymentStatus}
            onChange={(e) => setFilterPaymentStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="bon">Bon payeur</option>
            <option value="irregulier">Payeur irrégulier</option>
            <option value="mauvais">Mauvais payeur</option>
          </select>
        </div>
      </Card>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTenants.map((tenant) => (
          <Card key={tenant.id} className="hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {tenant.photoUrl ? (
                    <img
                      src={tenant.photoUrl}
                      alt={`${tenant.firstName} ${tenant.lastName}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {tenant.firstName} {tenant.lastName}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-3 w-3 mr-1" />
                      <span>{tenant.phone}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedTenant(tenant);
                      setShowReceiptGenerator(true);
                    }}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedTenant(tenant);
                      setShowFinancialStatements(true);
                    }}
                  >
                    <DollarSign className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteTenant(tenant.id)}
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2 text-green-600" />
                  <span>{tenant.city}</span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Briefcase className="h-4 w-4 mr-2 text-orange-600" />
                  <span>{tenant.profession}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Paiement:</span>
                  <Badge variant={getPaymentStatusColor(tenant.paymentStatus)} size="sm">
                    {getPaymentStatusLabel(tenant.paymentStatus)}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <User className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun locataire
          </h3>
          <p className="text-gray-600 mb-4">
            Commencez par ajouter votre premier locataire.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un locataire
          </Button>
        </div>
      )}

      <TenantForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleAddTenant}
      />

      <ReceiptGenerator
        isOpen={showReceiptGenerator}
        onClose={() => {
          setShowReceiptGenerator(false);
          setSelectedTenant(null);
        }}
        tenantId={selectedTenant?.id}
      />

      {selectedTenant && (
        <Modal
          isOpen={showFinancialStatements}
          onClose={() => {
            setShowFinancialStatements(false);
            setSelectedTenant(null);
          }}
          title="État financier"
          size="xl"
        >
          <FinancialStatements
            entityId={selectedTenant.id}
            entityType="tenant"
            entityName={`${selectedTenant.firstName} ${selectedTenant.lastName}`}
          />
        </Modal>
      )}
    </div>
  );
};
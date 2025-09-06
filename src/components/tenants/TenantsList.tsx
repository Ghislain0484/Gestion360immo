import React, { useState, useEffect } from 'react';
import { Plus, Search, User, Phone, MapPin, Briefcase, FileText, DollarSign, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { TenantForm } from './TenantForm';
import ReceiptGenerator from '../receipts/ReceiptGenerator';
import { FinancialStatements } from '../financial/FinancialStatements';
import { Tenant, TenantFormData, TenantWithRental } from '../../types/db';
import { useRealtimeData, useSupabaseCreate, useSupabaseDelete } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_SIZE = 10;

export const TenantsList: React.FC = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showReceiptGenerator, setShowReceiptGenerator] = useState(false);
  const [showFinancialStatements, setShowFinancialStatements] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithRental | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<'all' | 'bon' | 'irregulier' | 'mauvais'>('all');
  const [filterMaritalStatus, setFilterMaritalStatus] = useState<'all' | 'celibataire' | 'marie' | 'divorce' | 'veuf'>('all');
  const [currentPage, setCurrentPage] = useState(0);

  const { data: tenants, loading, error, setData, refetch } = useRealtimeData<Tenant>(
    () => dbService.tenants.getAll({
      agency_id: user?.agency_id ?? undefined, // <-- ici on convertit null en undefined
      limit: PAGE_SIZE,
      offset: currentPage * PAGE_SIZE,
      search: searchTerm,
      marital_status: filterMaritalStatus === 'all' ? undefined : filterMaritalStatus,
      payment_status: filterPaymentStatus === 'all' ? undefined : filterPaymentStatus
    }),
    'tenants'
  );

  const { create: createTenant } = useSupabaseCreate(
    dbService.tenants.create,
    (newTenant) => {
      setData(prev => [newTenant, ...prev]);
      setShowForm(false);
    }
  );

  const { deleteItem: deleteTenant, loading: deleting } = useSupabaseDelete(
    dbService.tenants.delete,
    () => refetch()
  );

  const handleAddTenant = async (tenantData: TenantFormData) => {
    if (!user?.agency_id) return alert('Aucune agence associée');

    try {
      const tenantPayload = { ...tenantData, agency_id: user.agency_id };
      await createTenant(tenantPayload);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création du locataire');
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Supprimer ce locataire ?')) return;
    try { await deleteTenant(tenantId); }
    catch (err) { console.error(err); }
  };

  const getPaymentStatusColor = (status: Tenant['payment_status']) => {
    switch (status) {
      case 'bon': return 'success';
      case 'irregulier': return 'warning';
      case 'mauvais': return 'danger';
      default: return 'secondary';
    }
  };

  const getPaymentStatusLabel = (status: Tenant['payment_status']) => {
    switch (status) {
      case 'bon': return 'Bon payeur';
      case 'irregulier': return 'Payeur irrégulier';
      case 'mauvais': return 'Mauvais payeur';
      default: return status;
    }
  };

  const filteredTenants = tenants?.filter(t => {
    const matchesSearch =
      t.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm) ||
      t.profession.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMarital = filterMaritalStatus === 'all' || t.marital_status === filterMaritalStatus;
    const matchesPayment = filterPaymentStatus === 'all' || t.payment_status === filterPaymentStatus;

    return matchesSearch && matchesMarital && matchesPayment;
  }) || [];

  useEffect(() => {
    refetch();
  }, [searchTerm, filterPaymentStatus, filterMaritalStatus]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="text-center py-12"><p className="text-red-600 mb-4">{error}</p><Button onClick={refetch}>Réessayer</Button></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Locataires ({tenants?.length || 0})</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Ajouter un locataire</Button>
      </div>

      {/* Search & filter */}
      <Card>
        <div className="flex gap-4 flex-col md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterPaymentStatus}
            onChange={e => setFilterPaymentStatus(e.target.value as Tenant['payment_status'] | 'all')}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        {filteredTenants.map(tenant => (
          <Card key={tenant.id} className="hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                  {tenant.photo_url
                    ? <img src={tenant.photo_url} alt={tenant.first_name} className="w-12 h-12 rounded-full object-cover" />
                    : <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center"><User className="h-6 w-6 text-blue-600" /></div>
                  }
                  <div>
                    <h3 className="font-semibold">{tenant.first_name} {tenant.last_name}</h3>
                    <div className="flex items-center text-sm text-gray-600"><Phone className="h-3 w-3 mr-1" />{tenant.phone}</div>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedTenant(tenant); setShowReceiptGenerator(true); }}>
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedTenant(tenant); setShowFinancialStatements(true); }}>
                    <DollarSign className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteTenant(tenant.id)} disabled={deleting}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600"><MapPin className="h-4 w-4 mr-2 text-green-600" />{tenant.city}</div>
                <div className="flex items-center text-sm text-gray-600"><Briefcase className="h-4 w-4 mr-2 text-orange-600" />{tenant.profession}</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Paiement:</span>
                  <Badge variant={getPaymentStatusColor(tenant.payment_status)} size="sm">
                    {getPaymentStatusLabel(tenant.payment_status)}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <User className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">Aucun locataire</h3>
          <p className="text-gray-600 mb-4">Commencez par ajouter votre premier locataire.</p>
          <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Ajouter un locataire</Button>
        </div>
      )}

      {/* Modals */}
      <TenantForm isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleAddTenant} />
      <ReceiptGenerator
        isOpen={showReceiptGenerator}
        onClose={() => { setShowReceiptGenerator(false); setSelectedTenant(null); }}
        tenantId={selectedTenant?.id ?? ''} // string garanti
        contractId={selectedTenant?.contractId}
        propertyId={selectedTenant?.propertyId}
        ownerId={selectedTenant?.ownerId}
      />

      {selectedTenant && (
        <Modal
          isOpen={showFinancialStatements}
          onClose={() => { setShowFinancialStatements(false); setSelectedTenant(null); }}
          title="État financier"
          size="xl"
        >
          <FinancialStatements
            entityId={selectedTenant.id}
            entityType="tenant"
            entityName={`${selectedTenant.first_name} ${selectedTenant.last_name}`}
          />
        </Modal>
      )}
    </div>
  );
};

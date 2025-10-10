import React, { useState, useMemo } from 'react';
import { Building2, DollarSign, FileText, Eye, Edit, Printer, MessageSquare } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Property, Contract, Tenant, Owner } from '../../types/db';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import toast from 'react-hot-toast';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { sendContactMessage } from '../../utils/contactUtils';

interface OwnerProperty {
  id: string;
  title: string;
  type: string;
  monthly_rent: number;
  commission_amount: number;
  owner_payment: number;
  contract_date: string;
  status: Contract['status'];
  tenant?: {
    name: string;
    phone: string;
  };
}

interface OwnerPropertyListProps {
  ownerId: string;
  ownerName: string;
  registrationDate: string;
}

interface GetAllParams {
  agency_id?: string;
  owner_id?: string;
}

export const OwnerPropertyList: React.FC<OwnerPropertyListProps> = ({
  ownerId,
  ownerName,
  registrationDate,
}) => {
  const { user } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<OwnerProperty | null>(null);

  // -------------------- Fetch Properties --------------------
  const { data: rawProperties, initialLoading, error } = useRealtimeData<
    Property & { contracts: (Contract & { tenant: Tenant | null })[] }
  >(async (params?: GetAllParams) => {
    if (!params?.agency_id) throw new Error('Agency ID is required');
    if (!params?.owner_id) throw new Error('Owner ID is required');
    const { data, error } = await supabase
      .from('properties')
      .select(`
        id, title, description, created_at, updated_at, agency_id, owner_id, location, details, standing, rooms, images, is_available, for_sale, for_rent,
        contracts (
          id, agency_id, property_id, owner_id, tenant_id, type, start_date, end_date, monthly_rent, sale_price, deposit, charges, commission_rate, commission_amount, status, terms, documents, created_at, updated_at,
          tenants (id, first_name, last_name, phone)
        )
      `)
      .eq('owner_id', params.owner_id)
      .eq('agency_id', params.agency_id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`❌ properties.select | ${error.message}`);
    return (data ?? []).map((p: any) => ({
      ...p,
      contracts: p.contracts.map((c: any) => ({
        ...c,
        tenant: c.tenants?.[0] || null,
      })),
    }));
  }, 'properties', { agency_id: user?.agency_id ?? undefined, owner_id: ownerId });

  // -------------------- Map Properties --------------------
  const properties: OwnerProperty[] = useMemo(
    () =>
      rawProperties?.map((property) => {
        const activeContract = property.contracts.find((c) => c.status === 'active');
        const type = (property.details as { type?: string } | null)?.type || 'Inconnu';
        return {
          id: property.id,
          title: property.title,
          type,
          monthly_rent: activeContract?.monthly_rent || 0,
          commission_amount: activeContract?.commission_amount || 0,
          owner_payment: activeContract
            ? (activeContract.monthly_rent || 0) - (activeContract.commission_amount || 0)
            : 0,
          contract_date: activeContract?.start_date || property.created_at,
          status: activeContract?.status || 'expired',
          tenant: activeContract?.tenant
            ? {
                name: `${activeContract.tenant.first_name} ${activeContract.tenant.last_name}`,
                phone: activeContract.tenant.phone || 'N/A',
              }
            : undefined,
        };
      }) || [],
    [rawProperties]
  );

  // -------------------- Utils --------------------
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'expired':
      case 'terminated': return 'warning';
      case 'draft': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Loué';
      case 'expired': return 'Expiré';
      case 'terminated': return 'Résilié';
      case 'draft': return 'Brouillon';
      case 'renewed': return 'Renouvelé';
      default: return status;
    }
  };

  const handleContact = async (property: OwnerProperty) => {
    if (!user?.id) return toast.error('Utilisateur non authentifié');
    if (!user.role || !['admin', 'director'].includes(user.role)) {
      return toast.error('Vous n’avez pas les permissions nécessaires pour contacter l’agence.');
    }
    const owner: Owner = {
      id: ownerId,
      agency_id: user.agency_id ?? '',
      first_name: ownerName.split(' ')[0] || '',
      last_name: ownerName.split(' ').slice(1).join(' ') || '',
      phone: '',
      address: '',
      city: '',
      property_title: 'autres',
      property_title_details: null,
      marital_status: 'celibataire',
      spouse_name: null,
      spouse_phone: null,
      children_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await sendContactMessage(user.id, owner, 'property', property.id, property.title);
  };

  const totalMonthlyRevenue = useMemo(
    () => properties.filter((p) => p.status === 'active').reduce((sum, p) => sum + p.owner_payment, 0),
    [properties]
  );
  const totalCommissions = useMemo(
    () => properties.filter((p) => p.status === 'active').reduce((sum, p) => sum + p.commission_amount, 0),
    [properties]
  );

  // -------------------- Render --------------------
  if (initialLoading) return <p>Chargement...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 text-center p-4">
          <Building2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
          <div className="text-2xl font-bold text-green-700">{properties.length}</div>
          <p className="text-sm text-green-600">Biens gérés</p>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200 text-center p-4">
          <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-600" />
          <div className="text-lg font-bold text-blue-700">{formatCurrency(totalMonthlyRevenue)}</div>
          <p className="text-sm text-blue-600">Revenus mensuels</p>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-200 text-center p-4">
          <FileText className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
          <div className="text-lg font-bold text-yellow-700">{formatCurrency(totalCommissions)}</div>
          <p className="text-sm text-yellow-600">Commissions agence</p>
        </Card>
      </div>

      {/* Properties */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Biens de {ownerName}</h4>
          <div className="text-sm text-gray-500">
            Propriétaire depuis le {new Date(registrationDate).toLocaleDateString('fr-FR')}
          </div>
        </div>

        {properties.length === 0 ? (
          <p className="text-gray-500">Aucun bien trouvé pour ce propriétaire.</p>
        ) : (
          properties.map((property) => (
            <Card
              key={property.id}
              className="bg-white/80 backdrop-blur-sm border-gray-200 hover:shadow-lg transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-6 w-6 text-green-600" />
                    <div>
                      <h5 className="font-semibold text-gray-900">{property.title}</h5>
                      <p className="text-sm text-gray-500">
                        {property.type} • ID: {property.id}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(property.status)} size="sm">
                    {getStatusLabel(property.status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50/80 rounded-lg">
                    <p className="text-xs text-blue-600 mb-1">Loyer mensuel</p>
                    <p className="font-semibold text-blue-800">{formatCurrency(property.monthly_rent)}</p>
                  </div>
                  <div className="text-center p-3 bg-red-50/80 rounded-lg">
                    <p className="text-xs text-red-600 mb-1">Commission</p>
                    <p className="font-semibold text-red-800">{formatCurrency(property.commission_amount)}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50/80 rounded-lg">
                    <p className="text-xs text-green-600 mb-1">Reversement</p>
                    <p className="font-semibold text-green-800">{formatCurrency(property.owner_payment)}</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50/80 rounded-lg">
                    <p className="text-xs text-purple-600 mb-1">Date contrat</p>
                    <p className="font-semibold text-purple-800">
                      {new Date(property.contract_date).toLocaleDateString('fr-FR')}
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
                    Contrat signé le {new Date(property.contract_date).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedProperty(property);
                        setShowDetails(true);
                      }}
                      aria-label={`Voir les détails de ${property.title}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label={`Modifier ${property.title}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label={`Imprimer les détails de ${property.title}`}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleContact(property)}
                      aria-label={`Contacter à propos de ${property.title}`}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal */}
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
                  <p><strong>Date du contrat:</strong> {new Date(selectedProperty.contract_date).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Détails financiers</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Loyer mensuel:</strong> {formatCurrency(selectedProperty.monthly_rent)}</p>
                  <p><strong>Commission agence:</strong> {formatCurrency(selectedProperty.commission_amount)}</p>
                  <p><strong>Reversement propriétaire:</strong> {formatCurrency(selectedProperty.owner_payment)}</p>
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
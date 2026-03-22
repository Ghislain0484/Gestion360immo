import React, { useState, useMemo, useCallback } from 'react';
import { Plus, LayoutGrid, List as ListIcon, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { FilterBar } from '../shared/FilterBar';
import { Property } from '../../types/db';
import { PropertyForm } from './PropertyForm';
import { PropertyCard } from './PropertyCard';
import { useRealtimeData, useSupabaseCreate } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { generateSlug } from '../../utils/idSystem';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { OHADAContractGenerator } from '../../utils/contractTemplates';

export const PropertiesList: React.FC = () => {
  const navigate = useNavigate();
  const { user, agencyId: authAgencyId } = useAuth();
  const isDirector = user?.role === 'director';
  const isManager = user?.role === 'manager';
  const isDirectorOrManager = isDirector || isManager;
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState({
    standing: 'all',
    type: 'all',
    commune: 'all',
  });
  const [filterStatus, setFilterStatus] = useState<'all' | 'vacant' | 'occupied'>('all');

  const handleFilterChange = (id: string, value: any) => {
    setFilters(prev => ({ ...prev, [id]: value }));
  };

  const clearFilters = () => {
    setFilters({ standing: 'all', type: 'all', commune: 'all' });
    setSearchTerm('');
  };
  const fetchProperties = useCallback(() => dbService.properties.getAll({
    agency_id: authAgencyId || undefined,
    limit: 1000,
    includeOwner: true
  }), [authAgencyId]);

  const { data: properties, initialLoading, error, refetch } = useRealtimeData<Property>(
    fetchProperties,
    'properties',
    { limit: 1000 }
  );

  // Fetch contracts and tenants for display
  const { data: contracts } = useRealtimeData(
    dbService.contracts.getAll,
    'contracts',
    { agency_id: authAgencyId || undefined, limit: 1000 }
  );
  const { data: tenants } = useRealtimeData(
    dbService.tenants.getAll,
    'tenants',
    { agency_id: authAgencyId || undefined, limit: 1000 }
  );

  const getRentalInfo = (propertyId: string) => {
    const activeContract = contracts?.find(c => c.property_id === propertyId && c.status === 'active' && c.type === 'location');

    if (!activeContract) return { isOccupied: false };

    const tenant = tenants?.find(t => t.id === activeContract.tenant_id);
    return {
      isOccupied: !!tenant,
      tenantName: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Inconnu',
      rentAmount: activeContract.monthly_rent
    };
  };

  // Décomptes pour les filtres rapides
  const stats = useMemo(() => {
    if (!properties) return { total: 0, vacant: 0, occupied: 0 };
    return {
      total: properties.length,
      vacant: properties.filter(p => {
        const info = getRentalInfo(p.id);
        const isOccupied = info.isOccupied;
        return p.is_available && !isOccupied;
      }).length,
      occupied: properties.filter(p => {
        const info = getRentalInfo(p.id);
        return info.isOccupied;
      }).length
    };
  }, [properties, contracts, tenants]);

  const { create: createProperty, loading: creatingLoading } = useSupabaseCreate(
    dbService.properties.create,
    {
      onSuccess: async (newProperty) => {
        setShowForm(false);
        refetch();
        
        // GÉNERATION AUTOMATIQUE DU CONTRAT DE GESTION
        if (newProperty && authAgencyId) {
          try {
            toast.loading('Génération du contrat de gestion...', { id: 'mgmt-gen' });
            const agency = await dbService.agencies.getById(authAgencyId);
            const owner = await dbService.owners.getById(newProperty.owner_id);
            
            if (agency && owner) {
              const contractPayload = {
                agency_id: authAgencyId,
                property_id: newProperty.id,
                owner_id: newProperty.owner_id,
                tenant_id: '00000000-0000-0000-0000-000000000000', // Locataire vide pour gestion
                type: 'gestion' as const,
                start_date: new Date().toISOString().split('T')[0],
                commission_rate: 10,
                commission_amount: 0,
                status: 'active' as const,
                terms: OHADAContractGenerator.generateManagementContract(agency, owner, 10),
                documents: []
              };
              
              await dbService.contracts.create(contractPayload);
              toast.success('Contrat de gestion généré automatiquement', { id: 'mgmt-gen' });
            }
          } catch (err) {
            console.error('Error generating management contract:', err);
            toast.error('Erreur lors de la génération du contrat de gestion', { id: 'mgmt-gen' });
          }
        }
      },
      onError: (err) => {
        console.error("Property Creation Error:", err);
        toast.error("Erreur lors de la création du bien: " + err);
      }
    }
  );


  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const info = getRentalInfo(property.id);
      const isOccupied = info.isOccupied;
      const isAvailable = property.is_available && !isOccupied;

      const s = searchTerm.toLowerCase();
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const ns = normalize(searchTerm);

      const statusLabel = isOccupied ? 'occupé' : (isAvailable ? 'vacant' : 'indisponible');
      const alternateStatusLabel = isOccupied ? 'loué' : (isAvailable ? 'disponible' : '');

      const matchesSearch =
        property.title.toLowerCase().includes(s) ||
        property.location.quartier.toLowerCase().includes(s) ||
        property.location.commune.toLowerCase().includes(s) ||
        normalize(statusLabel).includes(ns) ||
        (alternateStatusLabel && normalize(alternateStatusLabel).includes(ns));

      const matchesStanding = filters.standing === 'all' || property.standing === filters.standing;
      const matchesType = filters.type === 'all' || property.details.type === filters.type;
      const matchesCommune = filters.commune === 'all' || property.location.commune === filters.commune;

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'vacant' && isAvailable) ||
        (filterStatus === 'occupied' && isOccupied);

      return matchesSearch && matchesStanding && matchesType && matchesCommune && matchesStatus;
    });
  }, [properties, searchTerm, filters, contracts, tenants, filterStatus]);

  const handlePropertyClick = (property: Property) => {
    // Generate human-readable slug using business_id if available, otherwise fallback to id
    const slugId = property.business_id || property.id;
    const slug = generateSlug(slugId, property.title);
    navigate(`/proprietes/${slug}`); // Using generic slug route
  };

  const handleDeleteProperty = async (property: Property) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le bien "${property.title}" ? Cette action est irréversible et supprimera également tous les contrats, quittances et images associés.`)) {
      return;
    }

    const toastId = toast.loading('Suppression en cours...');
    try {
      // 1. Fetch associated contracts first
      const propertyContracts = await dbService.contracts.getAll({ property_id: property.id, agency_id: authAgencyId || undefined });

      if (propertyContracts.length > 0) {
        console.log(`🧹 Nettoyage de ${propertyContracts.length} contrats pour le bien ${property.id}`);
        for (const contract of propertyContracts) {
          // 1.1 First delete receipts for this contract to avoid FK constraint error on contracts
          const receipts = await dbService.rentReceipts.getAll({ contract_id: contract.id, agency_id: authAgencyId || undefined });
          if (receipts.length > 0) {
            console.log(`🧾 Suppression de ${receipts.length} quittances pour le contrat ${contract.id}`);
            for (const receipt of receipts) {
              await dbService.rentReceipts.delete(receipt.id);
            }
          }
          // 1.2 Now delete the contract
          await dbService.contracts.delete(contract.id);
        }
      }

      // 2. Cleanup financial transactions linked to this property
      const { data: transactions } = await dbService.financials.getTransactionsByProperty(property.id);
      if (transactions && transactions.length > 0) {
        console.log(`💰 Nettoyage de ${transactions.length} transactions financières pour le bien ${property.id}`);
        for (const tx of transactions) {
          await dbService.financials.deleteTransaction(tx.id);
        }
      }

      // 3. Cleanup images from storage
      if (property.images && property.images.length > 0) {
        console.log(`🖼️ Nettoyage de ${property.images.length} images de la plateforme`);
        for (const img of property.images) {
          if (img.url) {
            await dbService.properties.deleteImage(img.url);
          }
        }
      }

      // 3. Finally delete the property
      await dbService.properties.delete(property.id);

      toast.success('Bien et toutes les données associées supprimés avec succès', { id: toastId });
      refetch();
    } catch (err: any) {
      console.error('Error deleting property:', err);
      toast.error('Erreur lors de la suppression: ' + (err.message || 'Le bien est probablement lié à des données protégées.'), { id: toastId });
    }
  };

  if (initialLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-64 bg-gray-200 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">
        <p>Une erreur est survenue : {error}</p>
        <Button onClick={refetch} className="mt-4" variant="outline">Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propriétés</h1>
          <p className="text-sm text-gray-500 mt-1">
            {properties.length} bien{properties.length > 1 ? 's' : ''} en gestion
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border p-1 rounded-lg flex items-center hidden sm:flex">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Bien
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 shadow-md border-none bg-white/90 backdrop-blur-sm">
        <FilterBar
          fields={[
            {
              id: 'standing',
              label: 'Standing',
              type: 'select',
              options: [
                { value: 'economique', label: 'Économique' },
                { value: 'moyen', label: 'Moyen' },
                { value: 'haut', label: 'Haut' },
              ]
            },
            {
              id: 'type',
              label: 'Type',
              type: 'select',
              options: [
                { value: 'villa', label: 'Villa' },
                { value: 'appartement', label: 'Appartement' },
                { value: 'immeuble', label: 'Immeuble' },
                { value: 'terrain_nu', label: 'Terrain Nu' },
                { value: 'autres', label: 'Autres' },
              ]
            },
            {
              id: 'commune',
              label: 'Commune',
              type: 'select',
              options: Array.from(new Set(properties.map(p => p.location.commune)))
                .filter(Boolean)
                .map(c => ({ value: c, label: c }))
            }
          ]}
          values={filters}
          onChange={handleFilterChange}
          onClear={clearFilters}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Rechercher par titre, quartier..."
          stats={[
            {
              label: 'Tous',
              count: stats.total,
              active: filterStatus === 'all',
              onClick: () => setFilterStatus('all')
            },
            {
              label: 'Vacants',
              count: stats.vacant,
              active: filterStatus === 'vacant',
              onClick: () => setFilterStatus('vacant'),
              activeColorClass: 'text-emerald-600',
              colorClass: 'bg-emerald-100'
            },
            {
              label: 'Occupés',
              count: stats.occupied,
              active: filterStatus === 'occupied',
              onClick: () => setFilterStatus('occupied'),
              activeColorClass: 'text-amber-600',
              colorClass: 'bg-amber-100'
            }
          ]}
        />
      </Card>

      {/* Grid Content */}
      {filteredProperties.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200 border-dashed">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Aucun bien trouvé</h3>
          <p className="text-gray-500 mt-1 mb-4">Ajoutez un bien pour commencer la commercialisation.</p>
          <Button onClick={() => setShowForm(true)}>Ajouter un bien</Button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {filteredProperties.map((property: Property) => (
            viewMode === 'grid' ? (
              <PropertyCard
                key={property.id}
                property={property}
                {...getRentalInfo(property.id)}
                onClick={() => handlePropertyClick(property)}
                onDelete={isDirectorOrManager ? () => handleDeleteProperty(property) : undefined}
              />
            ) : (
              <Card
                key={property.id}
                className="p-4 flex items-center justify-between hover:shadow-md cursor-pointer transition-shadow"
                onClick={() => handlePropertyClick(property)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg object-cover overflow-hidden">
                    {property.images?.[0] && <img src={property.images[0].url} className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{property.title}</h3>
                    <p className="text-sm text-gray-500">{property.location.quartier}, {property.location.commune}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {(() => {
                    const info = getRentalInfo(property.id);
                    const isOccupied = info.isOccupied;
                    const isAvailable = property.is_available && !isOccupied;
                    return (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${isOccupied ? 'bg-yellow-100 text-yellow-700' :
                        (isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')
                        }`}>
                        {isOccupied ? 'Occupé' : (isAvailable ? 'Disponible' : 'Indisponible')}
                      </span>
                    );
                  })()}
                  {isDirectorOrManager && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProperty(property);
                      }}
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            )
          ))}
        </div>
      )}

      {/* Property Form Modal */}
      <PropertyForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={async (data) => {
          await createProperty(data);
        }}
        isLoading={creatingLoading}
      />
    </div>
  );
};
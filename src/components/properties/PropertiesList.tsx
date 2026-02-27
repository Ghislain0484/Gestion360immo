import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Search, LayoutGrid, List as ListIcon, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Property } from '../../types/db';
import { PropertyForm } from './PropertyForm';
import { PropertyCard } from './PropertyCard';
import { useRealtimeData, useSupabaseCreate } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { generateSlug } from '../../utils/idSystem';
import debounce from 'lodash/debounce';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export const PropertiesList: React.FC = () => {
  const navigate = useNavigate();
  const { user, agencyId: authAgencyId } = useAuth();
  const isDirector = user?.role === 'director';
  const isManager = user?.role === 'manager';
  const isDirectorOrManager = isDirector || isManager;
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStanding, setFilterStanding] = useState<string>('all');

  const fetchProperties = useCallback(() => dbService.properties.getAll({
    agency_id: authAgencyId || undefined,
    limit: 1000,
    includeOwner: true
  }), [authAgencyId]);

  const { data: properties, initialLoading, error, refetch } = useRealtimeData<Property>(
    fetchProperties,
    'properties'
  );

  // Fetch contracts and tenants for display
  const { data: contracts } = useRealtimeData(
    dbService.contracts.getAll,
    'contracts',
    { agency_id: authAgencyId || undefined }
  );
  const { data: tenants } = useRealtimeData(
    dbService.tenants.getAll,
    'tenants',
    { agency_id: authAgencyId || undefined }
  );

  const { create: createProperty, loading: creatingLoading } = useSupabaseCreate(
    dbService.properties.create,
    {
      onSuccess: () => {
        setShowForm(false);
        refetch();
        // Success message is handled by PropertyForm's internal SuccessModal
      },
      onError: (err) => {
        console.error("Property Creation Error:", err);
        toast.error("Erreur lors de la création du bien: " + err);
      }
    }
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

  const debouncedSetSearchTerm = debounce((value: string) => setSearchTerm(value), 300);

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const matchesSearch =
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.quartier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.commune.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStanding = filterStanding === 'all' || property.standing === filterStanding;

      return matchesSearch && matchesStanding;
    });
  }, [properties, searchTerm, filterStanding]);

  const handlePropertyClick = (property: Property) => {
    const slug = generateSlug(property.id, property.title);
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
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par titre, quartier..."
              className="pl-10"
              onChange={(e) => debouncedSetSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={filterStanding}
            onChange={(e) => setFilterStanding(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Tous standings</option>
            <option value="economique">Économique</option>
            <option value="moyen">Moyen</option>
            <option value="haut">Haut</option>
          </select>
        </div>
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
          {filteredProperties.map(property => (
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
import React, { useState, useMemo } from 'react';
import { Plus, Search, LayoutGrid, List as ListIcon } from 'lucide-react';
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

export const PropertiesList: React.FC = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStanding, setFilterStanding] = useState<string>('all');

  const { data: properties, initialLoading, error, refetch } = useRealtimeData<Property>(
    dbService.properties.getAll,
    'properties',
    { limit: 1000 }
  );

  // Fetch contracts and tenants for display
  const { data: contracts } = useRealtimeData(dbService.contracts.getAll, 'contracts');
  const { data: tenants } = useRealtimeData(dbService.tenants.getAll, 'tenants');

  const { create: createProperty } = useSupabaseCreate(
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
    const activeContract = contracts?.find(c => c.property_id === propertyId && c.status === 'active');
    if (!activeContract) return null;

    const tenant = tenants?.find(t => t.id === activeContract.tenant_id);
    return {
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
                  <span className={`px-2 py-1 rounded text-xs font-medium ${property.is_available ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {property.is_available ? 'Disponible' : 'Occupé'}
                  </span>
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
      />
    </div>
  );
};
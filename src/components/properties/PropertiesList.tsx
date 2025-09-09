import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, MapPin, Eye, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { PropertyForm } from './PropertyForm';
import { PropertyDetailsModal } from './PropertyDetailsModal';
import { Property, PropertyFormData } from '../../types/db';
import { useRealtimeData, useSupabaseCreate, useSupabaseDelete } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import debounce from 'lodash/debounce';

const PAGE_SIZE = 10;

export const PropertiesList: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStanding, setFilterStanding] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(0);

  const fetchProperties = useCallback(
    () =>
      dbService.properties.getAll({
        agency_id: user?.agency_id ?? undefined,
        limit: PAGE_SIZE,
        offset: currentPage * PAGE_SIZE,
        search: searchTerm,
        standing: filterStanding === 'all' ? undefined : filterStanding,
      }),
    [user?.agency_id, currentPage, searchTerm, filterStanding]
  );

  const { data: properties, loading, error, refetch, setData } = useRealtimeData<Property>(fetchProperties, 'properties');

  const { create: createProperty, loading: creating } = useSupabaseCreate(
    dbService.properties.create,
    {
      onSuccess: (newProperty) => {
        setData(prev => [newProperty, ...prev]);
        setShowForm(false);
        toast.success('Propriété créée avec succès');
      },
      onError: (err) => toast.error(err),
    }
  );

  const { deleteItem: deleteProperty, loading: deleting } = useSupabaseDelete(
    dbService.properties.delete,
    {
      onSuccess: () => {
        refetch();
        toast.success('Propriété supprimée avec succès');
      },
      onError: (err) => toast.error(err),
    }
  );

  const handleAddProperty = useCallback(
    async (propertyData: PropertyFormData) => {
      if (!user?.agency_id) {
        toast.error('Aucune agence associée');
        return;
      }

      try {
        const propertyPayload: Partial<Property> = {
          agency_id: user.agency_id,
          owner_id: propertyData.owner_id,
          title: propertyData.title,
          description: propertyData.description || '',
          location: propertyData.location,
          details: propertyData.details,
          standing: propertyData.standing,
          rooms: propertyData.rooms || [],
          images: propertyData.images || [],
          is_available: propertyData.is_available,
          for_sale: propertyData.for_sale,
          for_rent: propertyData.for_rent,
        };

        await createProperty(propertyPayload);
      } catch (error) {
        console.error('Erreur création propriété:', error);
        toast.error('Erreur lors de la création');
      }
    },
    [user?.agency_id, createProperty]
  );

  const handleDeleteProperty = useCallback(
    async (propertyId: string) => {
      if (!confirm('Supprimer cette propriété ?')) return;
      try {
        await deleteProperty(propertyId);
      } catch (error) {
        console.error('Erreur suppression:', error);
        toast.error('Erreur lors de la suppression');
      }
    },
    [deleteProperty]
  );

  const getStandingColor = useCallback((standing: string) => {
    switch (standing) {
      case 'economique':
        return 'warning';
      case 'moyen':
        return 'info';
      case 'haut':
        return 'success';
      default:
        return 'secondary';
    }
  }, []);

  const debouncedRefetch = useCallback(debounce(() => refetch(), 500), [refetch]);

  useEffect(() => {
    debouncedRefetch();
    return () => debouncedRefetch.cancel();
  }, [searchTerm, filterStanding, currentPage, debouncedRefetch]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user?.agency_id) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg" role="alert">
        Aucune agence associée. Veuillez vérifier votre profil.
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={refetch} aria-label="Réessayer le chargement des propriétés">
          Réessayer
        </Button>
      </div>
    );
  }

  const totalPages = Math.ceil((properties?.length || 0) / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propriétés</h1>
          <p className="text-gray-600 mt-1">Gestion du portefeuille ({properties?.length || 0})</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={creating} aria-label="Ajouter une propriété">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une propriété
        </Button>
      </div>

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
                aria-label="Rechercher une propriété"
              />
            </div>
          </div>
          <select
            value={filterStanding}
            onChange={(e) => setFilterStanding(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filtrer par standing"
          >
            <option value="all">Tous les standings</option>
            <option value="economique">Économique</option>
            <option value="moyen">Moyen</option>
            <option value="haut">Haut</option>
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : !properties || properties.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Plus className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune propriété</h3>
            <p className="text-gray-600 mb-4">Commencez par ajouter votre première propriété.</p>
            <Button onClick={() => setShowForm(true)} disabled={creating} aria-label="Ajouter une propriété">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une propriété
            </Button>
          </div>
        ) : (
          properties.map((property) => (
            <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-w-16 aspect-h-12 bg-gray-200 relative">
                {property.images && property.images.length > 0 ? (
                  <img
                    src={property.images.find((img: any) => img.isPrimary)?.url || property.images[0].url}
                    alt={property.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">Aucune image</span>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge variant={getStandingColor(property.standing)} size="sm">
                    {property.standing.charAt(0).toUpperCase() + property.standing.slice(1)}
                  </Badge>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge variant={property.is_available ? 'success' : 'danger'} size="sm">
                    {property.is_available ? 'Disponible' : 'Occupé'}
                  </Badge>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{property.title}</h3>
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>
                    {property.location?.commune || 'Non spécifié'}, {property.location?.quartier || 'Non spécifié'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{property.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Créée le {new Date(property.created_at).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedProperty(property);
                        setShowDetailsModal(true);
                      }}
                      aria-label={`Voir les détails de ${property.title}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteProperty(property.id)}
                      disabled={deleting}
                      aria-label={`Supprimer ${property.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center space-x-2 mt-6">
          <Button
            variant="outline"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((prev) => prev - 1)}
            aria-label="Page précédente"
          >
            Précédent
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage + 1} sur {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage((prev) => prev + 1)}
            aria-label="Page suivante"
          >
            Suivant
          </Button>
        </div>
      )}

      <PropertyForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleAddProperty}
      />

      <PropertyDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedProperty(null);
        }}
        property={selectedProperty}
        onUpdate={() => refetch()}
      />
    </div>
  );
};
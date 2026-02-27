import React, { useState, useMemo } from 'react';
import { Plus, Search, MapPin, Phone, Eye, MessageCircle, Filter, Trash2, Edit } from 'lucide-react';
import { useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Owner } from '../../types/db';
import { OwnerForm } from './OwnerForm';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { generateSlug } from '../../utils/idSystem';
import debounce from 'lodash/debounce';
import toast from 'react-hot-toast';

export const OwnersList: React.FC = () => {
  const navigate = useNavigate();
  const { agencyId: authAgencyId, user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOwners = useCallback(() => dbService.owners.getAll({
    agency_id: authAgencyId || undefined
  }), [authAgencyId]);

  const { data: owners, initialLoading, error, refetch } = useRealtimeData<Owner>(
    fetchOwners,
    'owners'
  );

  // Fetch properties for count (limit 1000 to ensure accurate counts)
  const { data: properties } = useRealtimeData(
    dbService.properties.getAll,
    'properties',
    { agency_id: authAgencyId || undefined, limit: 1000 }
  );

  // Fetch contracts for tenant count
  const { data: contracts } = useRealtimeData(
    dbService.contracts.getAll,
    'contracts',
    { agency_id: authAgencyId || undefined, limit: 1000 }
  );

  const getPropertyCount = (ownerId: string) => {
    const count = properties?.filter(p => p.owner_id === ownerId).length || 0;
    return count;
  };

  const getTenantCount = (ownerId: string) => {
    if (!contracts) return 0;

    // Filter active contracts for this owner (only rental contracts with a tenant)
    const ownerContracts = contracts.filter(c =>
      c.owner_id === ownerId &&
      c.status === 'active' &&
      c.type === 'location' &&
      !!c.tenant_id
    );

    // Cross-reference with properties to ensure data integrity
    // If we have properties loaded, we should only count tenants in properties that actually exist
    const validContracts = properties
      ? ownerContracts.filter(c => properties.some(p => p.id === c.property_id))
      : ownerContracts;

    // Get unique tenant IDs from VALID contracts
    const tenantIds = new Set(validContracts.map(c => c.tenant_id));

    return tenantIds.size;
  };

  const debouncedSetSearchTerm = debounce((value: string) => setSearchTerm(value), 300);

  const filteredOwners = useMemo(() => {
    if (!searchTerm) return owners;
    const lower = searchTerm.toLowerCase();
    return owners.filter((owner) =>
      owner.first_name.toLowerCase().includes(lower) ||
      owner.last_name.toLowerCase().includes(lower) ||
      owner.phone.includes(lower) ||
      owner.city.toLowerCase().includes(lower)
    );
  }, [owners, searchTerm]);

  const handleRowClick = (owner: Owner) => {
    console.log('Row clicked:', owner);
    // Use business_id (e.g. PROP...) for prettier URLs if available, otherwise UUID
    const slugId = owner.business_id || owner.id;
    const slug = generateSlug(slugId, `${owner.first_name} ${owner.last_name}`);
    navigate(`/proprietaires/${slug}`);
  };

  if (initialLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
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
          <h1 className="text-2xl font-bold text-gray-900">Propriétaires</h1>
          <p className="text-sm text-gray-500 mt-1">
            {owners.length} propriétaire{owners.length > 1 ? 's' : ''} enregistré{owners.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Propriétaire
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, téléphone, ville..."
              className="pl-10"
              onChange={(e) => debouncedSetSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex whitespace-nowrap gap-2 w-full sm:w-auto">
            <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>
              Filtres
            </Button>
          </div>
        </div>
      </Card>

      {/* List Content */}
      {filteredOwners.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200 border-dashed">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Aucun propriétaire trouvé</h3>
          <p className="text-gray-500 mt-1 mb-4">Ajoutez votre premier propriétaire pour commencer la gestion.</p>
          <Button onClick={() => setShowForm(true)}>Ajouter un propriétaire</Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Identité & Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Localisation
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Biens & Locataires
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOwners.map((owner) => (
                <tr
                  key={owner.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(owner)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                          {owner.first_name[0]}{owner.last_name[0]}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {owner.first_name} {owner.last_name}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {/* Simulated ID for display */}
                          PROP{new Date(owner.created_at).getFullYear().toString().substr(2)}...
                        </div>
                        <div className="text-sm text-gray-500 sm:hidden">
                          {owner.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-1.5 text-gray-400" />
                      {owner.city}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <Phone className="h-4 w-4 mr-1.5 text-gray-400" />
                      {owner.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center">
                        <Badge variant="secondary" className="mr-2">{getPropertyCount(owner.id)}</Badge>
                        <span className="text-sm text-gray-500">bien{getPropertyCount(owner.id) > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center">
                        <Badge variant="primary" className="mr-2">{getTenantCount(owner.id)}</Badge>
                        <span className="text-sm text-gray-500">locataire{getTenantCount(owner.id) > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="WhatsApp"
                        onClick={(e) => {
                          e.stopPropagation();
                          const phone = owner.phone.replace(/\s+/g, '');
                          window.open(`https://wa.me/${phone.startsWith('+') ? phone.slice(1) : (phone.startsWith('00') ? phone.slice(2) : `225${phone}`)}`, '_blank');
                        }}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Voir détails"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(owner);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOwner(owner);
                          setShowForm(true);
                        }}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Supprimer définitivement ${owner.first_name} ${owner.last_name} ? Cette action supprimera également tous ses biens et l'historique associé.`)) {
                            const toastId = toast.loading('Suppression en cours...');
                            try {
                              await dbService.owners.safeDelete(owner.id, user?.agency_id || undefined);
                              refetch();
                              toast.success('Propriétaire supprimé avec succès', { id: toastId });
                            } catch (err: any) {
                              console.error(err);
                              toast.error('Erreur lors de la suppression: ' + (err.message || ''), { id: toastId });
                            }
                          }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal d'ajout */}
      <OwnerForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedOwner(null);
        }}
        initialData={selectedOwner || undefined}
        onSuccess={() => {
          setShowForm(false);
          setSelectedOwner(null);
          refetch();
        }}
      />
    </div>
  );
};

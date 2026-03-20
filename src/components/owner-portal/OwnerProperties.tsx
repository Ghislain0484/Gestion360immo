import React, { useState, useMemo, useCallback } from 'react';
import { Search, LayoutGrid, List as ListIcon, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Property } from '../../types/db';
import { PropertyCard } from '../properties/PropertyCard';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { generateSlug } from '../../utils/idSystem';
import debounce from 'lodash/debounce';

export const OwnerProperties: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'vacant' | 'occupied'>('all');

  const fetchProperties = useCallback(() => dbService.properties.getAll({ limit: 1000 }), []);
  const { data: properties, initialLoading, error } = useRealtimeData<Property>(fetchProperties, 'properties', { limit: 1000 });

  const { data: contracts } = useRealtimeData(dbService.contracts.getAll, 'contracts', { limit: 1000 });
  const { data: tenants } = useRealtimeData(dbService.tenants.getAll, 'tenants', { limit: 1000 });

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

  const stats = useMemo(() => {
    if (!properties) return { total: 0, vacant: 0, occupied: 0 };
    return {
      total: properties.length,
      vacant: properties.filter(p => p.is_available && !getRentalInfo(p.id).isOccupied).length,
      occupied: properties.filter(p => getRentalInfo(p.id).isOccupied).length
    };
  }, [properties, contracts, tenants]);

  const debouncedSetSearchTerm = debounce((value: string) => setSearchTerm(value), 300);

  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    return properties.filter((property) => {
      const info = getRentalInfo(property.id);
      const isOccupied = info.isOccupied;
      const isAvailable = property.is_available && !isOccupied;

      const s = searchTerm.toLowerCase();
      const matchesSearch = property.title.toLowerCase().includes(s) || 
                            property.location.quartier.toLowerCase().includes(s);

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'vacant' && isAvailable) ||
        (filterStatus === 'occupied' && isOccupied);

      return matchesSearch && matchesStatus;
    });
  }, [properties, searchTerm, contracts, tenants, filterStatus]);

  const handlePropertyClick = (property: Property) => {
    const slug = generateSlug(property.id, property.title);
    // Might want to route to an owner-specific property detail view later
    navigate(`/proprietes/${slug}`);
  };

  if (initialLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-200 rounded-xl" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-lg">
        <p>Une erreur est survenue : {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes Biens</h1>
          <p className="text-sm text-slate-500 mt-1">Vous avez {properties?.length || 0} bien{properties?.length > 1 ? 's' : ''} enregistré{properties?.length > 1 ? 's' : ''}.</p>
        </div>
        <div className="bg-white border p-1 rounded-lg flex items-center hidden sm:flex">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-slate-100 text-emerald-600' : 'text-slate-400'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-slate-100 text-emerald-600' : 'text-slate-400'}`}
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Card className="p-4 shadow-sm border border-slate-100 bg-white">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher par titre, quartier..."
              className="pl-10 border-slate-200"
              onChange={(e) => debouncedSetSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setFilterStatus('all')}
                className={clsx("px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2", filterStatus === 'all' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >
                Tous
                <span className={clsx("px-1.5 py-0.5 rounded-full text-[10px]", filterStatus === 'all' ? "bg-emerald-100" : "bg-slate-200")}>{stats.total}</span>
              </button>
              <button
                onClick={() => setFilterStatus('vacant')}
                className={clsx("px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2", filterStatus === 'vacant' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >
                Vacants
                <span className={clsx("px-1.5 py-0.5 rounded-full text-[10px]", filterStatus === 'vacant' ? "bg-blue-100" : "bg-slate-200")}>{stats.vacant}</span>
              </button>
              <button
                onClick={() => setFilterStatus('occupied')}
                className={clsx("px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2", filterStatus === 'occupied' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
              >
                Occupés
                <span className={clsx("px-1.5 py-0.5 rounded-full text-[10px]", filterStatus === 'occupied' ? "bg-amber-100" : "bg-slate-200")}>{stats.occupied}</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {filteredProperties.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 border-dashed">
          <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Aucun bien trouvé</h3>
          <p className="text-slate-500 mt-1">Vos critères de recherche ne correspondent à aucun bien.</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {filteredProperties.map(property => (
            <div key={property.id} className="cursor-pointer" onClick={() => handlePropertyClick(property)}>
              <PropertyCard
                property={property}
                {...getRentalInfo(property.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

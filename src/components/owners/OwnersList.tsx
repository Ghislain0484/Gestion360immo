import React, { useState, useMemo } from 'react';
import { Plus, Search, MapPin, Phone, Eye, MessageCircle, Trash2, Edit, Download, ShieldCheck } from 'lucide-react';
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
import { clsx } from 'clsx';
import { ViewToggle } from '../shared/ViewToggle';
import { OwnerCard } from './OwnerCard';
import { exportToExcel, formatOwnersForExport } from '../../utils/exportUtils';
import { useLanguage } from '../../contexts/LanguageContext';

import { OwnerPaymentModal } from '../owner-portal/OwnerPaymentModal';
import { useCanDelete } from '../../hooks/useCanDelete';

export const OwnersList: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { agencyId: authAgencyId, user, refreshAuth } = useAuth();
  const canDelete = useCanDelete();
  const [showForm, setShowForm] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOccupancy, setFilterOccupancy] = useState<'all' | 'active' | 'free' | 'vacant_prop'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const fetchOwners = useCallback(() => dbService.owners.getAll({
    agency_id: authAgencyId || undefined,
    limit: 1000
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

  // Pre-calculate stats for all owners at once to avoid O(N^2) complexity in the render loop
  const ownerStatsMap = useMemo(() => {
    const statsMap = new Map();
    if (!owners || !properties || !contracts) return statsMap;

    owners.forEach(owner => {
      const ownerProperties = properties.filter(p => p.owner_id === owner.id);
      const total = ownerProperties.length;
      
      const activeContracts = contracts.filter(c => 
        c.owner_id === owner.id && 
        c.status === 'active' && 
        c.type === 'location' &&
        !!c.tenant_id
      );

      const occupied = ownerProperties.filter(p => 
        activeContracts.some(c => c.property_id === p.id)
      ).length;

      const tenantCount = new Set(activeContracts.map(c => c.tenant_id)).size;

      statsMap.set(owner.id, {
        total,
        occupied,
        vacant: total - occupied,
        tenantCount
      });
    });
    return statsMap;
  }, [owners, properties, contracts]);

  const ownerVacantProperties = useMemo(() => {
    const map = new Map();
    if (!owners || !properties || !contracts) return map;
    owners.forEach(owner => {
      const ownerProperties = properties.filter(p => p.owner_id === owner.id);
      const activeContracts = contracts.filter(c => 
        c.owner_id === owner.id && 
        c.status === 'active' && 
        c.type === 'location' &&
        !!c.tenant_id
      );
      const vacantProps = ownerProperties.filter(p => 
        !activeContracts.some(c => c.property_id === p.id)
      );
      map.set(owner.id, vacantProps);
    });
    return map;
  }, [owners, properties, contracts]);

  const debouncedSetSearchTerm = debounce((value: string) => setSearchTerm(value), 300);

  const filteredOwners = useMemo(() => {
    return owners.filter((owner) => {
      const lower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        owner.first_name.toLowerCase().includes(lower) ||
        owner.last_name.toLowerCase().includes(lower) ||
        owner.phone.includes(lower) ||
        owner.city.toLowerCase().includes(lower);

      const stats = ownerStatsMap.get(owner.id) || { total: 0, occupied: 0, vacant: 0, tenantCount: 0 };
      const matchesOccupancy = filterOccupancy === 'all' ||
        (filterOccupancy === 'active' && stats.occupied > 0) ||
        (filterOccupancy === 'free' && stats.occupied === 0) ||
        (filterOccupancy === 'vacant_prop' && stats.vacant > 0);

      return matchesSearch && matchesOccupancy;
    });
  }, [owners, searchTerm, filterOccupancy, ownerStatsMap]);

  const handleExport = () => {
    try {
      const dataToExport = formatOwnersForExport(filteredOwners);
      exportToExcel(dataToExport, 'Proprietaires_Gestion360', 'Propriétaires');
      toast.success('Export Excel réussi !');
    } catch (error) {
      toast.error('Erreur lors de l’export');
    }
  };

  const handleRowClick = (owner: Owner) => {
    // Generate human-readable slug using business_id if available, otherwise fallback to id
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("Propriétaires")}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {owners.length} {owners.length > 1 ? t("bailleurs enregistrés") : t("bailleur enregistré")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center space-x-2 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            <span>{t("Exporter")} Excel</span>
          </Button>

          <Button
            onClick={() => {
              setSelectedOwner(null);
              setShowForm(true);
            }}
            className="flex items-center space-x-2 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>{t("Nouveau Propriétaire")}</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t("Rechercher par nom, téléphone, ville...")}
              className="pl-10"
              onChange={(e) => debouncedSetSearchTerm(e.target.value)}
            />
          </div>
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
                  <button
                    onClick={() => setFilterOccupancy('all')}
                    className={clsx(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                      filterOccupancy === 'all' ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-450 shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    )}
                  >
                    {t("Tous")}
                  </button>
                  <button
                    onClick={() => setFilterOccupancy('active')}
                    className={clsx(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                      filterOccupancy === 'active' ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-450 shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    )}
                  >
                    {t("Actifs")}
                  </button>
                  <button
                    onClick={() => setFilterOccupancy('free')}
                    className={clsx(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                      filterOccupancy === 'free' ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-450 shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    )}
                  >
                    {t("Sans locataire")}
                  </button>
                  <button
                    onClick={() => setFilterOccupancy('vacant_prop')}
                    className={clsx(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                      filterOccupancy === 'vacant_prop' ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-450 shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    )}
                  >
                    {t("Bien non-occupé")}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 mr-2 uppercase tracking-tight">{t("Vue")}</span>
                <ViewToggle view={viewMode} onChange={setViewMode} />
              </div>
            </div>
        </div>
      </Card>

      {/* Results Count Badge */}
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="primary" className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm border-none">
          {filteredOwners.length}
        </Badge>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {filteredOwners.length > 1 ? t("bailleurs enregistrés") : t("bailleur enregistré")}
        </span>
      </div>

      {filteredOwners.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 border-dashed animate-fade-in">
          <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-gray-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t("Aucun propriétaire trouvé")}</h3>
          <p className="text-gray-500 dark:text-slate-400 mt-1 mb-4">{t("Enregistrer un propriétaire pour commencer la gestion de son patrimoine.")}</p>
          <Button onClick={() => setShowForm(true)}>{t("Ajouter un propriétaire")}</Button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-800/60">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-450 uppercase tracking-wider">
                  {t("Identité")} & Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-450 uppercase tracking-wider hidden lg:table-cell">
                  {t("Localisation")}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-450 uppercase tracking-wider">
                  {t("Biens Possédés")} & {t("Locataires")}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-450 uppercase tracking-wider">
                  {t("Abonnement Portal")}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-450 uppercase tracking-wider">
                  {t("Actions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
              {filteredOwners.map((owner) => (
                <tr
                  key={owner.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(owner)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center text-slate-900 dark:text-slate-100">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold">
                          <span>{owner.first_name[0]}{owner.last_name[0]}</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium">
                          <span>{owner.first_name} {owner.last_name}</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-500 font-mono">
                          <span>{owner.business_id || `PROP-${owner.id.slice(0, 8)}`}</span>
                        </div>
                      </div>
                    </div>
                    {filterOccupancy === 'vacant_prop' && (
                      <div className="mt-3 pl-3 border-l-2 border-amber-400 space-y-1">
                        <div className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1">
                          {t("Biens non-occupés")} :
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ownerVacantProperties.get(owner.id)?.map((prop: any) => (
                            <div key={prop.id} className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 bg-amber-50/50 px-2 py-1 rounded-lg border border-amber-100/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                              <span>{prop.title}</span>
                              {prop.monthly_rent && (
                                <span className="text-[9px] text-amber-700 font-bold bg-amber-100/70 px-1 py-0.2 rounded">
                                  {prop.monthly_rent.toLocaleString('fr-FR')} F
                                </span>
                              )}
                            </div>
                          ))}
                          {(!ownerVacantProperties.get(owner.id) || ownerVacantProperties.get(owner.id)?.length === 0) && (
                            <span className="text-xs italic text-gray-400">{t("Aucun")}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                    <div className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                      <MapPin className="h-4 w-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                      <span>{owner.city}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-slate-400 mt-1">
                      <Phone className="h-4 w-4 mr-1.5 text-gray-400 dark:text-slate-500" />
                      <span>{owner.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const stats = ownerStatsMap.get(owner.id) || { total: 0, occupied: 0, vacant: 0, tenantCount: 0 };
                      return (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                              <span>{stats.total}</span>
                            </Badge>
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Total</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-350">{stats.occupied}</span>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Occ.</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-350">{stats.vacant}</span>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Vac.</span>
                            </div>
                            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2 ml-1">
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{stats.tenantCount}</span>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Loc.</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <Badge 
                        variant="success"
                        className="w-fit font-black text-[9px] uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900/30"
                      >
                        <span>PRO ILLIMITÉ</span>
                      </Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
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
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {canDelete && (
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
                      )}

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOwners.map((owner) => (
            <OwnerCard
              key={owner.id}
              owner={owner}
              stats={ownerStatsMap.get(owner.id) || { total: 0, occupied: 0, vacant: 0, tenantCount: 0 }}
              tenantCount={ownerStatsMap.get(owner.id)?.tenantCount || 0}
              vacantProperties={filterOccupancy === 'vacant_prop' ? ownerVacantProperties.get(owner.id) : undefined}
              onNavigate={() => handleRowClick(owner)}
              onEdit={() => {
                setSelectedOwner(owner);
                setShowForm(true);
              }}
              onDelete={canDelete ? async () => {
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
              } : undefined}
            />
          ))}
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

      <OwnerPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedOwner(null);
        }}
        owner={selectedOwner}
        onSuccess={() => {
          refetch();
          refreshAuth();
        }}
        data={{
          type: 'service_fee',
          amount: 10000,
          title: 'Régularisation Portail Propriétaire',
          description: `Paiement des frais de service pour : ${selectedOwner?.first_name} ${selectedOwner?.last_name}`,
          targetId: selectedOwner?.id
        }}
      />
    </div>
  );
};

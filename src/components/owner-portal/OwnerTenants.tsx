import React, { useState, useMemo } from 'react';
import { Search, UserCheck, Phone, Mail, Building2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';

const formatCurrency = (amount: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

export const OwnerTenants: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: tenants, initialLoading: loadingTenants } = useRealtimeData(dbService.tenants.getAll, 'tenants', { limit: 1000 });
  const { data: contracts, initialLoading: loadingContracts } = useRealtimeData(dbService.contracts.getAll, 'contracts', { limit: 1000 });
  const { data: properties, initialLoading: loadingProps } = useRealtimeData(dbService.properties.getAll, 'properties', { limit: 1000 });

  const loading = loadingTenants || loadingContracts || loadingProps;

  const tenantDetails = useMemo(() => {
    if (!tenants || !contracts || !properties) return [];

    return tenants.map(tenant => {
      // Find active contract for this tenant
      const contract = contracts.find(c => c.tenant_id === tenant.id && c.status === 'active');
      const property = contract ? properties.find(p => p.id === contract.property_id) : null;

      return {
        ...tenant,
        contract,
        property
      };
    }).filter(t => t.contract && t.property); // Only show active tenants in properties
  }, [tenants, contracts, properties]);

  const filteredTenants = useMemo(() => {
    return tenantDetails.filter(t => {
      const s = searchTerm.toLowerCase();
      const fullName = `${t.first_name} ${t.last_name}`.toLowerCase();
      const propTitle = t.property?.title?.toLowerCase() || '';
      return fullName.includes(s) || propTitle.includes(s);
    });
  }, [tenantDetails, searchTerm]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/4 mb-8" />
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-32 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes Locataires</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez et consultez les informations de vos {tenantDetails.length} locataire{tenantDetails.length > 1 ? 's' : ''} actif{tenantDetails.length > 1 ? 's' : ''}.
          </p>
        </div>
      </div>

      <Card className="p-4 shadow-sm border border-slate-100 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher par nom, bien loué..."
            className="pl-10 border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {filteredTenants.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 border-dashed">
          <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <UserCheck className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Aucun locataire</h3>
          <p className="text-slate-500 mt-1">Vous n'avez aucun locataire correspondant à vos critères.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTenants.map(tenant => (
            <Card key={tenant.id} className="p-6 hover:shadow-md transition-shadow border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xl shadow-inner border border-emerald-100">
                    {tenant.first_name?.[0]}{tenant.last_name?.[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{tenant.first_name} {tenant.last_name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                      <Building2 className="w-4 h-4" />
                      <span>{tenant.property?.title}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="success" className="bg-emerald-50 text-emerald-700">En cours</Badge>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{tenant.phone || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="truncate" title={tenant.email || undefined}>{tenant.email || 'Non renseigné'}</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl flex flex-col justify-center items-end text-right">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loyer Mensuel</span>
                  <span className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(tenant.contract?.monthly_rent)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

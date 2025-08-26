// src/components/owners/OwnersList.tsx
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { OwnerForm } from './OwnerForm';
import { dbService } from '../../lib/supabase';
import { useRealtimeData } from '../../hooks/useSupabaseData';

export const OwnersList: React.FC = () => {
  // ⚠️ on renomme loading -> listLoading pour éviter toute collision
  const {
    data: owners,
    loading: listLoading,
    error,
    refetch,
  } = useRealtimeData<any>(dbService.getOwners, 'owners');

  const [formOpen, setFormOpen] = useState(false);

  const handleCreate = async (values: any) => {
    // insert minimal: le trigger mettra agency_id
    const inserted = await dbService.createOwner(values);
    await refetch?.();
    setFormOpen(false);
    return inserted;
  };

  if (listLoading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Chargement des propriétaires…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-4 text-red-600">
          Erreur: {String((error as any)?.message ?? error)}
        </div>
        <Button onClick={() => refetch?.()}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Propriétaires</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau propriétaire
        </Button>
      </div>

      {!owners || owners.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          Aucun propriétaire pour le moment.
          <div className="mt-4">
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un propriétaire
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {owners.map((o: any) => (
            <Card key={o.id} className="p-4">
              <div className="font-medium">
                {o.first_name} {o.last_name}
              </div>
              <div className="text-sm text-gray-500">
                {o.phone} • {o.city || '—'}
              </div>
            </Card>
          ))}
        </div>
      )}

      <OwnerForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
};

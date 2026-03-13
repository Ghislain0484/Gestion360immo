import React, { useState } from 'react';
import { Plus, FileText, Home, User, Printer } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Inventory, Property, Tenant } from '../../types/db';
import { InventoryDocument } from '../documents/InventoryDocument';
import { Modal } from '../ui/Modal';
import { InventoryForm } from './InventoryForm';
import toast from 'react-hot-toast';

export const InventoryList: React.FC = () => {
    const { user } = useAuth();
    const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
    const [showDocument, setShowDocument] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: inventories = [], initialLoading } = useRealtimeData<Inventory>(
        () => dbService.inventories.getAll({ agency_id: user?.agency_id }),
        'inventories',
        { agency_id: user?.agency_id }
    );

    const { data: properties = [] } = useRealtimeData<Property>(
        () => dbService.properties.getAll({ agency_id: user?.agency_id }),
        'properties',
        { agency_id: user?.agency_id }
    );

    const { data: tenants = [] } = useRealtimeData<Tenant>(
        () => dbService.tenants.getAll({ agency_id: user?.agency_id }),
        'tenants',
        { agency_id: user?.agency_id }
    );

    const getPropertyTitle = (id: string) => properties.find(p => p.id === id)?.title || 'Propriété inconnue';
    const getTenantName = (id?: string) => {
        if (!id) return 'Aucun locataire';
        const t = tenants.find(t => t.id === id);
        return t ? `${t.first_name} ${t.last_name}` : 'Locataire inconnu';
    };

    const [filterType, setFilterType] = useState<string>('all');

    const filteredInventories = inventories.filter(inv => {
        if (filterType === 'all') return true;
        return inv.type === filterType;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">États des Lieux</h1>
                    <p className="text-gray-500 mt-1">Gestion des états des lieux d'entrée et de sortie</p>
                </div>
                <Button
                    onClick={() => {
                        setSelectedInventory(null);
                        setIsFormOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    <span>Nouveau constat</span>
                </Button>
            </div>

            <Card className="p-4 shadow-sm border-none bg-white/80 backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="flex p-1 bg-gray-100 rounded-xl">
                            <button
                                onClick={() => setFilterType('all')}
                                className={clsx(
                                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                    filterType === 'all' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                Tous
                            </button>
                            <button
                                onClick={() => setFilterType('entry')}
                                className={clsx(
                                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                    filterType === 'entry' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                Entrée
                            </button>
                            <button
                                onClick={() => setFilterType('exit')}
                                className={clsx(
                                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                    filterType === 'exit' ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                Sortie
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="primary" className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm border-none">
                            {filteredInventories.length}
                        </Badge>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            constat{filteredInventories.length > 1 ? 's' : ''} trouvé{filteredInventories.length > 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </Card>

            {initialLoading ? (
                <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                </div>
            ) : filteredInventories.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Aucun état des lieux trouvé.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredInventories.map((inv) => (
                        <Card key={inv.id} className="p-0 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-lg ${inv.type === 'entry' ? 'bg-green-50' : 'bg-orange-50'}`}>
                                            <FileText className={`w-6 h-6 ${inv.type === 'entry' ? 'text-green-600' : 'text-orange-600'}`} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {inv.type === 'entry' ? "État des lieux d'entrée" : "État des lieux de sortie"}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                                <Home className="w-4 h-4" />
                                                <span>{getPropertyTitle(inv.property_id)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                                <User className="w-4 h-4" />
                                                <span>{getTenantName(inv.tenant_id)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                                <span>Cree le {new Date(inv.date).toLocaleDateString('fr-FR')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                        <Badge variant={inv.status === 'signed' ? 'success' : inv.status === 'completed' ? 'info' : 'secondary'}>
                                            {inv.status === 'signed' ? 'Signé' : inv.status === 'completed' ? 'Terminé' : 'Brouillon'}
                                        </Badge>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedInventory(inv);
                                                setIsFormOpen(true);
                                            }} className="text-gray-500 hover:text-primary-600">
                                                Modifier
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedInventory(inv);
                                                setShowDocument(true);
                                            }} className="text-gray-500 hover:text-primary-600">
                                                <Printer className="h-4 w-4 mr-2" />
                                                Imprimer
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {isFormOpen && (
                <InventoryForm
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    onSubmit={async (data) => {
                        setIsSubmitting(true);
                        try {
                            if (selectedInventory?.id && !selectedInventory.id.startsWith('draft-')) {
                                await dbService.inventories.update(selectedInventory.id, data);
                                toast.success('État des lieux mis à jour');
                            } else {
                                await dbService.inventories.create(data);
                                toast.success('Nouvel état des lieux enregistré');
                            }
                        } catch (error) {
                            console.error(error);
                            toast.error('Erreur lors de l’enregistrement');
                        } finally {
                            setIsSubmitting(false);
                            setIsFormOpen(false);
                        }
                    }}
                    initialData={selectedInventory || undefined}
                    isLoading={isSubmitting}
                />
            )}

            {showDocument && selectedInventory && (
                <Modal isOpen={showDocument} onClose={() => setShowDocument(false)} size="xl" title="Document État des Lieux">
                    <div className="max-h-[80vh] overflow-y-auto">
                        <InventoryDocument
                            inventory={selectedInventory}
                            agency={user ? { ...user, name: 'Mon Agence', address: 'Adresse Agence', phone: 'Contact', email: 'email@agence.com' } as any : undefined}
                            property={properties.find(p => p.id === selectedInventory.property_id)}
                            tenant={tenants.find(t => t.id === selectedInventory.tenant_id)}
                        />
                    </div>
                </Modal>
            )}
        </div>
    );
};

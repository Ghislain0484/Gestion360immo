import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Users, Star, Coffee, 
    ShieldCheck, Mail, Phone, ChevronRight, Loader2,
    Edit3, Trash2
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { FilterBar } from '../../shared/FilterBar';
import { useAuth } from '../../../contexts/AuthContext';
import { dbService } from '../../../lib/supabase';
import { ModularClient, ModuleType } from '../../../types/modular';
import { ClientForm } from './ClientForm';
import { ClientFinancialModal } from './ClientFinancialModal';
import toast from 'react-hot-toast';

interface ClientCRMProps {
    moduleType: ModuleType;
}

export const ClientCRM: React.FC<ClientCRMProps> = ({ moduleType }) => {
    const { agencyId } = useAuth();
    const [clients, setClients] = useState<ModularClient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<ModularClient | null>(null);
    const [selectedFinancialClient, setSelectedFinancialClient] = useState<ModularClient | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        clientType: 'all',
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleFilterChange = (id: string, value: any) => {
        setFilters(prev => ({ ...prev, [id]: value }));
    };

    const clearFilters = () => {
        setFilters({ clientType: 'all' });
        setSearchQuery('');
    };

    useEffect(() => {
        if (agencyId) {
            fetchClients();
        }
    }, [agencyId, moduleType]);

    const fetchClients = async () => {
        try {
            setIsLoading(true);
            const data = await dbService.modular.getClients(agencyId!, moduleType);
            setClients(data);
        } catch (error) {
            console.error('Error fetching clients:', error);
            toast.error('Erreur lors du chargement des clients');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (formData: any) => {
        try {
            setIsSaving(true);
            if (editingClient) {
                await dbService.modular.updateClient(editingClient.id, {
                    ...formData,
                    module_type: moduleType
                });
                toast.success('Client mis à jour');
            } else {
                await dbService.modular.createClient({
                    ...formData,
                    agency_id: agencyId!,
                    module_type: moduleType
                });
                toast.success('Client créé avec succès');
            }
            setIsModalOpen(false);
            setEditingClient(null);
            fetchClients();
        } catch (error) {
            console.error('Error saving client:', error);
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (client: ModularClient) => {
        if (!window.confirm(`Supprimer le client ${client.first_name} ${client.last_name} ?`)) return;
        try {
            await dbService.modular.deleteClient(client.id);
            toast.success('Client supprimé');
            fetchClients();
        } catch (error) {
            console.error('Error deleting client:', error);
            toast.error('Impossible de supprimer ce client (données liées)');
        }
    };

    const filteredClients = useMemo(() => {
        return clients.filter(c => {
            const matchesSearch = 
                `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.phone.includes(searchQuery) ||
                c.email?.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesType = filters.clientType === 'all' || c.client_type === filters.clientType;

            return matchesSearch && matchesType;
        });
    }, [clients, searchQuery, filters]);

    const statsByType = useMemo(() => {
        return {
            total: clients.length,
            vip: clients.filter(c => c.client_type === 'vip').length,
            corporate: clients.filter(c => c.client_type === 'corporate').length,
            regular: clients.filter(c => c.client_type === 'regular').length,
        };
    }, [clients]);

    const getStatusStyle = (status: ModularClient['client_type']) => {
        switch (status) {
            case 'vip': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'corporate': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case 'regular': return 'bg-slate-50 text-slate-500 border-slate-100';
            default: return 'bg-slate-50 text-slate-500 border-slate-100';
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <p className="text-[10px] font-black uppercase text-slate-400">Accès CRM...</p>
            </div>
        );
    }

    const handleSyncAll = async () => {
        try {
            setIsLoading(true);
            await dbService.modular.syncAllClientsStats(agencyId!, moduleType);
            toast.success('Statistiques synchronisées');
            fetchClients();
        } catch (error) {
            console.error('Error syncing clients:', error);
            toast.error('Erreur lors de la synchronisation');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 italic uppercase tracking-tighter">
                        <Users className="text-indigo-600" />
                        {moduleType === 'hotel' ? 'CRM Clients Hôtel' : 'CRM Résidents'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Base de données clients et fidélisation</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSyncAll}
                        leftIcon={<Loader2 className={isLoading ? 'animate-spin' : ''} size={14} />}
                        className="font-black italic text-[10px] uppercase border-2"
                    >
                        Synchroniser tout
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => { setEditingClient(null); setIsModalOpen(true); }} leftIcon={<Plus size={16} />}>
                        {moduleType === 'hotel' ? 'NOUVEAU CLIENT' : 'NOUVEAU RÉSIDENT'}
                    </Button>
                </div>
            </div>

            <Card className="p-4 border-2 border-slate-100 shadow-sm border-none bg-white/90">
                <FilterBar
                    fields={[
                        {
                            id: 'clientType',
                            label: 'Catégorie',
                            type: 'select',
                            options: [
                                { value: 'vip', label: 'VIP' },
                                { value: 'corporate', label: 'Corporate' },
                                { value: 'regular', label: 'Régulier' },
                            ]
                        }
                    ]}
                    values={filters}
                    onChange={handleFilterChange}
                    onClear={clearFilters}
                    searchTerm={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="RECHERCHER UN CLIENT..."
                    stats={[
                        {
                            label: 'Tous',
                            count: statsByType.total,
                            active: filters.clientType === 'all',
                            onClick: () => handleFilterChange('clientType', 'all')
                        },
                        {
                            label: 'VIP',
                            count: statsByType.vip,
                            active: filters.clientType === 'vip',
                            onClick: () => handleFilterChange('clientType', 'vip'),
                            activeColorClass: 'text-amber-600',
                            colorClass: 'bg-amber-100'
                        },
                        {
                            label: 'Corporate',
                            count: statsByType.corporate,
                            active: filters.clientType === 'corporate',
                            onClick: () => handleFilterChange('clientType', 'corporate'),
                            activeColorClass: 'text-indigo-600',
                            colorClass: 'bg-indigo-100'
                        }
                    ]}
                />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredClients.map((res) => (
                    <Card key={res.id} className="p-0 overflow-hidden border-0 shadow-lg group hover:scale-[1.02] transition-all bg-white">
                        <div className={`p-4 border-b ${getStatusStyle(res.client_type)} flex justify-between items-center`}>
                            <div className="flex items-center gap-2">
                                {res.client_type === 'vip' && <Star size={14} className="fill-amber-400 text-amber-400" />}
                                {res.client_type === 'corporate' && <ShieldCheck size={14} className="text-indigo-600" />}
                                <span className="text-[10px] font-black uppercase tracking-widest">{res.client_type}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => { setEditingClient(res); setIsModalOpen(true); }}
                                    className="p-1 hover:bg-black/5 rounded text-black/40 hover:text-indigo-600 transition-colors"
                                >
                                    <Edit3 size={14} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(res)}
                                    className="p-1 hover:bg-rose-50 rounded text-black/40 hover:text-rose-600 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <h4 className="font-black text-slate-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors uppercase italic">{res.first_name} {res.last_name}</h4>
                                <div className="flex flex-col gap-1 mt-2">
                                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                        <Mail size={10} /> {res.email || 'Pas d\'email'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                        <Phone size={10} /> {res.phone}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 relative">
                                {res.total_engaged && res.total_spent !== undefined && (res.total_engaged - res.total_spent) > 0 && (
                                    <div className="absolute -top-2 -right-2 px-2 py-1 bg-rose-500 text-white text-[8px] font-black rounded-lg shadow-lg animate-bounce">
                                        SOLDE: -{(res.total_engaged - res.total_spent).toLocaleString()} FCFA
                                    </div>
                                )}
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Total Séjours</p>
                                    <p className="text-sm font-black text-slate-800">{res.total_stays || 0}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Total Payé (FCFA)</p>
                                    <p className="text-sm font-black text-emerald-600">{res.total_spent?.toLocaleString() || 0}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Coffee size={10} /> Préférences
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {res.preferences?.length > 0 ? res.preferences.map((pref, i) => (
                                        <span key={i} className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md uppercase">
                                            {pref}
                                        </span>
                                    )) : (
                                        <span className="text-[8px] font-bold text-slate-300 italic uppercase">Aucune préférence</span>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-indigo-600">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black uppercase flex items-center gap-1">
                                        <Star size={12} className="text-amber-500" /> Fidelité: {res.loyalty_points || 0} pts
                                    </span>
                                    {res.last_stay_at && (
                                        <span className="text-[8px] font-bold text-slate-400 uppercase block">
                                            Dernier: {new Date(res.last_stay_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                 <div 
                                    onClick={() => setSelectedFinancialClient(res)}
                                    className="flex items-center gap-1 text-[10px] font-black uppercase hover:underline cursor-pointer group/details"
                                >
                                    Point financier
                                    <ChevronRight size={16} className="group-hover/details:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
                
                {filteredClients.length === 0 && (
                    <Card className="p-8 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-400 transition-all cursor-pointer group bg-slate-50/50 col-span-full py-20" onClick={() => { setEditingClient(null); setIsModalOpen(true); }}>
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Plus size={24} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest">
                            Ajouter votre premier {moduleType === 'hotel' ? 'client' : 'résident'}
                        </p>
                    </Card>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingClient(null); }} title={editingClient ? "Modifier le Résident" : "Nouveau Résident"} noPadding>
                <ClientForm 
                    initialData={editingClient || {}} 
                    onSubmit={handleSave} 
                    onCancel={() => { setIsModalOpen(false); setEditingClient(null); }} 
                    isSaving={isSaving}
                />
            </Modal>

            <Modal isOpen={!!selectedFinancialClient} onClose={() => setSelectedFinancialClient(null)} title="" noPadding>
                {selectedFinancialClient && (
                    <ClientFinancialModal 
                        client={selectedFinancialClient} 
                        onClose={() => setSelectedFinancialClient(null)} 
                    />
                )}
            </Modal>
        </div>
    );
};


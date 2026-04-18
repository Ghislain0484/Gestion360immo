import React, { useState, useMemo } from 'react';
import { Search, MapPin, Building2, Calendar, Filter, User as UserIcon, ShieldCheck, CreditCard, ChevronRight } from 'lucide-react';
import { useAgencies } from '../../../hooks/useAdminQueries';
import { supabase } from '../../../lib/config';
import { Owner, Agency } from '../../../types/db';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { AdminOwnerSubscriptionModal } from './AdminOwnerSubscriptionModal';

export const PlatformOwnersList: React.FC = () => {
    const [ownerSubscriptionPrice, setOwnerSubscriptionPrice] = useState(10000);
    const { data: agencies = [], isLoading: loadingAgencies } = useAgencies();
    const [owners, setOwners] = useState<Owner[]>([]);
    const [loadingOwners, setLoadingOwners] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAgencyId, setSelectedAgencyId] = useState<string>('all');
    const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadSettings = React.useCallback(async () => {
        const { data, error } = await supabase
            .from('platform_settings')
            .select('setting_value')
            .eq('setting_key', 'subscription_owner_price')
            .single();
        if (!error && data) {
            setOwnerSubscriptionPrice(Number(data.setting_value));
        }
    }, []);

    const loadAllOwners = React.useCallback(async () => {
        setLoadingOwners(true);
        try {
            let query = supabase.from('owners').select('*').order('created_at', { ascending: false });
            
            if (selectedAgencyId !== 'all') {
                query = query.eq('agency_id', selectedAgencyId);
            }

            const { data, error } = await query;
            if (error) throw error;
            setOwners(data || []);
        } catch (err) {
            console.error('Erreur chargement propriétaires:', err);
            toast.error('Impossible de charger la liste des propriétaires');
        } finally {
            setLoadingOwners(false);
        }
    }, [selectedAgencyId]);

    React.useEffect(() => {
        loadSettings();
        loadAllOwners();
    }, [loadSettings, loadAllOwners]);

    const filteredOwners = useMemo(() => {
        return owners.filter(o => 
            `${o.first_name} ${o.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.phone.includes(searchTerm)
        );
    }, [owners, searchTerm]);

    const getAgencyName = (id: string) => {
        return agencies.find(a => a.id === id)?.name || 'Agence Inconnue';
    };

    if (loadingAgencies && owners.length === 0) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 border-none text-white overflow-hidden relative">
                    <div className="relative z-10">
                        <p className="text-white/70 text-xs font-black uppercase tracking-widest mb-1">Total Propriétaires</p>
                        <h3 className="text-4xl font-black">{owners.length}</h3>
                    </div>
                    <UserIcon className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-white/10 rotate-12" />
                </Card>
                <Card className="p-6 bg-white border-slate-100 shadow-sm">
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Revenus Mensuels Estimés</p>
                    <h3 className="text-4xl font-black text-slate-900">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(owners.filter(o => o.subscription_status === 'active').length * ownerSubscriptionPrice)}
                    </h3>
                </Card>
                <Card className="p-6 bg-white border-slate-100 shadow-sm">
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Taux d'Activation</p>
                    <h3 className="text-4xl font-black text-emerald-600">
                        {owners.length > 0 ? Math.round((owners.filter(o => o.subscription_status === 'active').length / owners.length) * 100) : 0}%
                    </h3>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <Input 
                        placeholder="Rechercher un propriétaire (Nom, Email, Tel)..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 bg-slate-50 border-none rounded-2xl h-12"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group min-w-[200px]">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select 
                            value={selectedAgencyId}
                            onChange={(e) => setSelectedAgencyId(e.target.value)}
                            className="w-full pl-12 pr-10 h-12 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="all">Toutes les agences</option>
                            {agencies.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            <th className="px-8 py-6">Propriétaire</th>
                            <th className="px-8 py-6">Agence Gestionnaire</th>
                            <th className="px-8 py-6">Status Abonnement</th>
                            <th className="px-8 py-6">Expiration</th>
                            <th className="px-8 py-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loadingOwners ? (
                            <tr>
                                <td colSpan={5} className="py-20 text-center text-slate-400 font-bold italic">Mise à jour de la base...</td>
                            </tr>
                        ) : filteredOwners.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-20 text-center text-slate-400 font-bold italic">Aucun propriétaire trouvé</td>
                            </tr>
                        ) : (
                            filteredOwners.map(o => (
                                <tr key={o.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
                                                {o.first_name[0]}{o.last_name[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 leading-none">{o.first_name} {o.last_name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1">{o.email || o.phone}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-slate-200" />
                                            <span className="text-xs font-black text-slate-600 uppercase tracking-tighter">{getAgencyName(o.agency_id)}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <Badge 
                                            variant={o.subscription_status === 'active' ? 'success' : 'warning'}
                                            className={clsx(
                                                "font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg",
                                                o.subscription_status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                            )}
                                        >
                                            {o.subscription_status === 'active' ? 'PRO PREMIUM' : 'ACCÈS LIMITÉ'}
                                        </Badge>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span className="text-xs font-bold leading-none">
                                                {o.subscription_expires_at ? new Date(o.subscription_expires_at).toLocaleDateString() : 'Non définie'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button 
                                            onClick={() => {
                                                setSelectedOwner(o);
                                                setIsModalOpen(true);
                                            }}
                                            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-500/10 transition-all group/btn active:scale-95"
                                        >
                                            <ShieldCheck className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {selectedOwner && (
                <AdminOwnerSubscriptionModal 
                    isOpen={isModalOpen}
                    owner={selectedOwner}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedOwner(null);
                    }}
                    onSuccess={() => {
                        loadAllOwners();
                        setIsModalOpen(false);
                        setSelectedOwner(null);
                    }}
                />
            )}
        </div>
    );
};

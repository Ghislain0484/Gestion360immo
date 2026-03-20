import React, { useState, useEffect } from 'react';
import { 
    Receipt, Plus, Filter, Calendar, 
    TrendingUp, TrendingDown, Wallet, ArrowUpRight, 
    ArrowDownLeft, Loader2, Search, Download, Eye, Printer
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { dbService } from '../../../lib/supabase';
import { ModularTransaction, FinanceStats, ModuleType } from '../../../types/modular';
import { TransactionForm } from './TransactionForm';
import { ReceiptPrinter } from '../../../lib/utils/receiptPrinter';
import toast from 'react-hot-toast';

interface FinanceManagerProps {
    moduleType?: ModuleType;
}

export const FinanceManager: React.FC<FinanceManagerProps> = ({ moduleType }) => {
    const { agencyId, agencies } = useAuth();
    const currentAgency = agencies.find(a => a.agency_id === agencyId);
    const agencyName = currentAgency?.name;
    const [transactions, setTransactions] = useState<ModularTransaction[]>([]);
    const [stats, setStats] = useState<FinanceStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showTransactionForm, setShowTransactionForm] = useState(false);

    useEffect(() => {
        if (agencyId) {
            fetchFinanceData();
        }
    }, [agencyId, filterType, moduleType]);

    const fetchFinanceData = async () => {
        try {
            setLoading(true);
            const [transData, statsData] = await Promise.all([
                dbService.modular.getTransactions(agencyId!, { 
                    type: filterType || undefined,
                    module_type: moduleType
                }),
                dbService.modular.getFinanceStats(agencyId!, moduleType)
            ]);
            setTransactions(transData);
            setStats(statsData);
        } catch (error) {
            console.error('Error fetching finance data:', error);
            toast.error('Erreur lors du chargement des finances');
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('fr-FR').format(amount) + ' F';
    };

    const getTransactionIcon = (type: ModularTransaction['type']) => {
        switch (type) {
            case 'income': return <ArrowUpRight className="text-emerald-500" size={16} />;
            case 'expense': return <ArrowDownLeft className="text-rose-500" size={16} />;
            case 'salary': return <Wallet className="text-blue-500" size={16} />;
            case 'deposit': return <TrendingUp className="text-indigo-500" size={16} />;
            default: return <Receipt className="text-slate-400" size={16} />;
        }
    };

    if (loading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Calcul de la trésorerie...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2 italic uppercase tracking-tighter">
                        <Receipt className="text-indigo-600" />
                        Flux de Trésorerie
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Journal de caisse & centralisation des mouvements</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" leftIcon={<Download size={16} />} className="font-black italic">EXPORTER</Button>
                    <Button 
                        variant="primary" 
                        size="sm" 
                        leftIcon={<Plus size={16} />} 
                        className="font-black italic shadow-lg shadow-indigo-100 bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => setShowTransactionForm(true)}
                    >
                        NOUVEAU MOUVEMENT
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-5 border-0 shadow-md bg-white border-b-4 border-emerald-500">
                    <div className="flex justify-between items-start">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenus (In)</p>
                        <div className="p-1.5 bg-emerald-50 rounded-lg"><TrendingUp size={14} className="text-emerald-600" /></div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">{formatPrice(stats?.total_income || 0)}</p>
                    <p className="text-[9px] text-emerald-500 font-bold mt-1">Cumul des réservations</p>
                </Card>

                <Card className="p-5 border-0 shadow-md bg-white border-b-4 border-rose-500">
                    <div className="flex justify-between items-start">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dépenses (Out)</p>
                        <div className="p-1.5 bg-rose-50 rounded-lg"><TrendingDown size={14} className="text-rose-600" /></div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2">{formatPrice(stats?.total_expenses || 0)}</p>
                    <p className="text-[9px] text-rose-500 font-bold mt-1">Charges & Salaires</p>
                </Card>

                <Card className="p-5 border-0 shadow-md bg-slate-900 text-white border-b-4 border-amber-500">
                    <div className="flex justify-between items-start">
                        <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">Balance Nette</p>
                        <div className="p-1.5 bg-white/10 rounded-lg"><Wallet size={14} className="text-amber-400" /></div>
                    </div>
                    <p className="text-2xl font-black text-amber-400 mt-2">{formatPrice(stats?.net_balance || 0)}</p>
                    <p className="text-[9px] opacity-70 font-bold mt-1">Solde disponible en caisse</p>
                </Card>

                <Card className="p-5 border-0 shadow-md bg-indigo-600 text-white border-b-4 border-indigo-400">
                    <div className="flex justify-between items-start">
                        <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">Occupation</p>
                        <div className="p-1.5 bg-white/20 rounded-lg"><Calendar size={14} className="text-white" /></div>
                    </div>
                    <p className="text-2xl font-black mt-2">{Math.round(stats?.occupancy_rate || 0)}%</p>
                    <p className="text-[9px] opacity-70 font-bold mt-1">Performance du parc</p>
                </Card>
            </div>

            {/* Transactions List */}
            <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur-md">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="RECHERCHER UN MOUVEMENT..."
                            className="w-full bg-white border-2 border-slate-100 rounded-xl pl-10 pr-4 py-2 text-[11px] font-black uppercase outline-none focus:border-indigo-500 transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border-2 border-slate-100 shadow-sm">
                            <Filter size={14} className="text-slate-400" />
                            <select 
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="text-[10px] font-black uppercase text-slate-600 outline-none bg-transparent"
                            >
                                <option value="">Tous les Types</option>
                                <option value="income">Entrées (Revenus)</option>
                                <option value="expense">Sorties (Charges)</option>
                                <option value="salary">Salaires</option>
                                <option value="deposit">Dépôts</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider text-left">
                                <th className="px-6 py-5">Date</th>
                                <th className="px-6 py-5">Type / Catégorie</th>
                                <th className="px-6 py-5">Désignation</th>
                                <th className="px-6 py-5">Mode</th>
                                <th className="px-6 py-5 text-right">Montant</th>
                                <th className="px-6 py-5 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                            {transactions
                                .filter(t => 
                                    t.category.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center opacity-30">
                                            <Receipt size={48} className="mb-4" />
                                            <p className="text-xs font-black uppercase">Aucun mouvement trouvé</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                transactions
                                    .filter(t => 
                                        t.category.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-white transition-colors border border-transparent group-hover:border-slate-100">
                                                    <Calendar size={14} className="text-slate-400" />
                                                </div>
                                                <span className="text-[11px] font-black text-slate-600 uppercase">
                                                    {new Date(t.transaction_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg ${
                                                    t.type === 'income' ? 'bg-emerald-50' : 
                                                    t.type === 'expense' ? 'bg-rose-50' : 
                                                    'bg-blue-50'
                                                }`}>
                                                    {getTransactionIcon(t.type)}
                                                </div>
                                                <div>
                                                    <p className={`text-[10px] font-black uppercase leading-none ${
                                                        t.type === 'income' ? 'text-emerald-600' : 
                                                        t.type === 'expense' ? 'text-rose-600' : 
                                                        'text-blue-600'
                                                    }`}>
                                                        {t.type}
                                                    </p>
                                                    <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase">{t.category}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-black text-slate-700 italic">{t.description || 'Sans description'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-black px-2 py-1 rounded bg-slate-100 text-slate-500 uppercase tracking-tighter">
                                                {t.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-sm font-black italic ${
                                                t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                                            }`}>
                                                {t.type === 'income' ? '+' : '-'}{formatPrice(t.amount)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    title="Voir Détails"
                                                    onClick={() => ReceiptPrinter.printTransactionReceipt(t, t.booking?.client || t.client, t.booking, agencyName, t.module_type === 'residences' ? 'Résidences Meublées' : 'Hôtel', t.description?.includes('-') ? t.description.split('-').pop()?.trim() : undefined)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button 
                                                    title="Imprimer Reçu"
                                                    onClick={() => ReceiptPrinter.printTransactionReceipt(t, t.booking?.client || t.client, t.booking, agencyName, t.module_type === 'residences' ? 'Résidences Meublées' : 'Hôtel', t.description?.includes('-') ? t.description.split('-').pop()?.trim() : undefined)}
                                                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showTransactionForm && (
                <TransactionForm 
                    moduleType={moduleType}
                    onClose={() => setShowTransactionForm(false)}
                    onSuccess={() => {
                        setShowTransactionForm(false);
                        fetchFinanceData();
                    }}
                />
            )}
        </div>
    );
};

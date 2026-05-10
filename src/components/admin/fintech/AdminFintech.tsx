import React, { useEffect, useState } from 'react';
import { Wallet, DollarSign, ArrowUpRight, History, Search, Download, Building2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { getGlobalFintechData } from '../../../lib/adminApi';
import { formatAmount } from '../../../utils/format';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { downloadAgencyInvoicePDF } from '../../../utils/agencyInvoicing';
import { supabase } from '../../../lib/config';
import { toast } from 'react-hot-toast';

export const AdminFintech: React.FC = () => {
    const [data, setData] = useState<{ wallets: any[], transactions: any[], pendingFees: any[] }>({ wallets: [], transactions: [], pendingFees: [] });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const fintechData = await getGlobalFintechData();
            
            // Récupérer aussi les dettes de commission
            const { data: fees } = await supabase
                .from('agency_fintech_fees')
                .select('*, agencies(name)')
                .order('created_at', { ascending: false });

            setData({
                ...fintechData,
                pendingFees: fees || []
            });
        } catch (err) {
            console.error('Error loading admin fintech data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateFees = async () => {
        try {
            // Appelle la fonction SQL qui calcule les 1% pour toutes les agences
            const { error } = await supabase.rpc('process_monthly_fintech_commissions');
            if (error) throw error;
            toast.success('Commissions du mois générées ! Les agences peuvent maintenant payer.');
            loadData();
        } catch (error: any) {
            toast.error('Erreur de génération : ' + error.message);
        }
    };

    const handleDownloadInvoice = (tx: any) => {
        downloadAgencyInvoicePDF({
            invoiceNumber: tx.reference || `TX-${tx.id.substring(0, 8)}`,
            date: new Date(tx.created_at).toLocaleDateString('fr-FR'),
            agencyName: tx.agencies?.name || 'Agence',
            agencyCity: tx.agencies?.city,
            amount: Math.abs(tx.amount),
            type: tx.type === 'deposit' ? 'deposit' : 'commission',
            description: tx.description || (tx.type === 'deposit' ? 'Rechargement de compte' : 'Commission Fintech 1%'),
            potentialRevenue: tx.type === 'usage' ? Math.abs(tx.amount) * 100 : undefined
        });
    };
    
    // ... stats logic ...
    const stats = {
        totalBalance: data.wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0),
        totalTransactions: data.transactions.length,
        totalDeposit: data.transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + Number(t.amount || 0), 0),
        activeWallets: data.wallets.length
    };

    const filteredTransactions = data.transactions.filter(t => 
        t.agencies?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.reference?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" color="indigo" /></div>;

    return (
        <div className="animate-slide-up space-y-10">
            {/* ... header and stats grid ... */}
            <div>
                <div className="mb-3 flex items-center gap-2">
                    <span className="h-1.5 w-8 rounded-full bg-indigo-500" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">
                        Financial Oversight
                    </span>
                                <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Portefeuille <span className="text-indigo-600">Global</span>
                </h2>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="max-w-2xl text-lg text-slate-500 dark:text-slate-300">
                        Consultez l'état financier de toutes les agences et l'historique des paiements vers GESTION360IMMO.
                    </p>
                    <button 
                        onClick={handleGenerateFees}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                    >
                        <DollarSign className="w-5 h-5" />
                        Générer les commissions (1%)
                    </button>
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-6 border-none bg-indigo-600 text-white shadow-xl">
                    <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider">Trésorerie Globale</p>
                    <h3 className="text-3xl font-black mt-2">{formatAmount(stats.totalBalance)} FCFA</h3>
                    <div className="mt-4 flex items-center gap-2 text-indigo-100 text-xs italic">
                        <Wallet className="w-4 h-4" />
                        Sur {stats.activeWallets} agences actives
                    </div>
                </Card>

                <Card className="p-6 bg-white dark:bg-slate-900 shadow-sm border-slate-100">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Rechargements</p>
                    <h3 className="text-3xl font-black mt-2 text-slate-900 dark:text-white">{formatAmount(stats.totalDeposit)} FCFA</h3>
                    <div className="mt-4 flex items-center gap-2 text-emerald-500 text-xs font-bold">
                        <ArrowUpRight className="w-4 h-4" />
                        Depuis le début
                    </div>
                </Card>

                <Card className="p-6 bg-white dark:bg-slate-900 shadow-sm border-slate-100">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Transactions</p>
                    <h3 className="text-3xl font-black mt-2 text-slate-900 dark:text-white">{stats.totalTransactions}</h3>
                    <div className="mt-4 flex items-center gap-2 text-slate-400 text-xs">
                        <History className="w-4 h-4" />
                        Opérations enregistrées
                    </div>
                </Card>

                <Card className="p-6 bg-white dark:bg-slate-900 shadow-sm border-slate-100">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Commissions Perçues</p>
                    <h3 className="text-3xl font-black mt-2 text-slate-900 dark:text-white">
                        {formatAmount(data.transactions.filter(t => t.type === 'usage').reduce((sum, t) => sum + Math.abs(t.amount), 0))} FCFA
                    </h3>
                    <div className="mt-4 flex items-center gap-2 text-indigo-500 text-xs font-bold">
                        <DollarSign className="w-4 h-4" />
                        Revenus plateforme réels
                    </div>
                </Card>
            </div>

            {/* Commissions en attente */}
            {data.pendingFees.length > 0 && (
                <Card className="overflow-hidden border-none shadow-premium bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-100">
                    <div className="p-6 border-b border-amber-100 dark:border-amber-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                                <DollarSign className="h-6 w-6 text-amber-600" />
                            </div>
                            <h4 className="font-bold text-amber-900">Paiements en attente des agences</h4>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-amber-100/50 text-amber-700 text-[10px] uppercase font-black">
                                <tr>
                                    <th className="px-6 py-3 text-left">Agence</th>
                                    <th className="px-6 py-3 text-left">Période</th>
                                    <th className="px-6 py-3 text-right">Potentiel</th>
                                    <th className="px-6 py-3 text-right">Commission Due</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.pendingFees.filter(f => f.status === 'pending').map(fee => (
                                    <tr key={fee.id} className="border-t border-amber-100">
                                        <td className="px-6 py-4 font-bold text-amber-900 uppercase tracking-tighter">{fee.agencies?.name}</td>
                                        <td className="px-6 py-4 text-amber-700">{fee.period_month}</td>
                                        <td className="px-6 py-4 text-right font-medium">{formatAmount(fee.potential_revenue)} FCFA</td>
                                        <td className="px-6 py-4 text-right font-black text-amber-600">{formatAmount(fee.commission_amount)} FCFA</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-1 bg-amber-200 text-amber-800 rounded-lg text-[10px] font-black uppercase tracking-widest">En attente</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <Card className="overflow-hidden border-none shadow-premium bg-white dark:bg-slate-900">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Rechercher une agence, une référence..." 
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 ring-indigo-500/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all">
                        <Download className="w-4 h-4" />
                        Exporter CSV
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                            <tr>
                                <th className="px-6 py-4 text-left">Date</th>
                                <th className="px-6 py-4 text-left">Agence</th>
                                <th className="px-6 py-4 text-left">Description</th>
                                <th className="px-6 py-4 text-left">Type</th>
                                <th className="px-6 py-4 text-right">Montant</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                                        Aucune transaction enregistrée.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 font-medium">
                                            {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                                    <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter truncate max-w-[150px]">
                                                    {tx.agencies?.name || 'Agence Inconnue'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium italic">
                                            {tx.description}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                                                tx.type === 'deposit' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                tx.type === 'usage' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' :
                                                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                                {tx.type === 'deposit' ? 'RECHARGEMENT' : tx.type === 'usage' ? 'PRÉLÈVEMENT' : tx.type}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-black ${
                                            tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                        }`}>
                                            {tx.amount > 0 ? '+' : ''}{formatAmount(tx.amount)} FCFA
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => handleDownloadInvoice(tx)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="Télécharger la facture"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

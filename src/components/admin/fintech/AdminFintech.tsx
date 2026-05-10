import React, { useEffect, useState } from 'react';
import { Wallet, DollarSign, ArrowUpRight, History, Search, Download, Building2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { getGlobalFintechData } from '../../../lib/adminApi';
import { formatAmount } from '../../../utils/format';
import { LoadingSpinner } from '../../ui/LoadingSpinner';

export const AdminFintech: React.FC = () => {
    const [data, setData] = useState<{ wallets: any[], transactions: any[] }>({ wallets: [], transactions: [] });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const fintechData = await getGlobalFintechData();
            setData(fintechData);
        } catch (err) {
            console.error('Error loading admin fintech data:', err);
        } finally {
            setLoading(false);
        }
    };

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
            {/* Header section */}
            <div>
                <div className="mb-3 flex items-center gap-2">
                    <span className="h-1.5 w-8 rounded-full bg-indigo-500" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">
                        Financial Oversight
                    </span>
                </div>
                <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Portefeuille <span className="text-indigo-600">Global</span>
                </h2>
                <p className="max-w-2xl text-lg text-slate-500 dark:text-slate-300">
                    Consultez l'état financier de toutes les agences et l'historique des paiements vers GESTION360IMMO.
                </p>
            </div>

            {/* Stats Grid */}
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
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Commissions Estimées (1%)</p>
                    <h3 className="text-3xl font-black mt-2 text-slate-900 dark:text-white">{formatAmount(stats.totalDeposit * 0.01)} FCFA</h3>
                    <div className="mt-4 flex items-center gap-2 text-indigo-500 text-xs font-bold">
                        <DollarSign className="w-4 h-4" />
                        Revenus plateforme
                    </div>
                </Card>
            </div>

            {/* Transactions Table */}
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
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">
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
                                                tx.type === 'usage' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                                                'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400'
                                            }`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-black ${
                                            tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                        }`}>
                                            {tx.amount > 0 ? '+' : ''}{formatAmount(tx.amount)} FCFA
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

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
    const [generating, setGenerating] = useState(false);
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
            setGenerating(true);
            // Appelle la fonction SQL qui calcule les 1% pour toutes les agences
            const { error } = await supabase.rpc('process_monthly_fintech_commissions');
            if (error) throw error;
            toast.success('Commissions du mois générées ! Les agences peuvent maintenant payer.');
            loadData();
        } catch (error: any) {
            toast.error('Erreur de génération : ' + error.message);
        } finally {
            setGenerating(false);
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

    if (loading) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" color="indigo" /></    return (
        <div className="animate-fade-in space-y-12 pb-20">
            {/* Header Section */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-indigo-500/5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500">Fintech Intelligence</span>
                            </div>
                            <h2 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight">
                                Portefeuille <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Global</span>
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed max-w-2xl">
                                Supervision des flux financiers et gestion des prélèvements de performance pour l'écosystème <span className="font-bold text-slate-900 dark:text-white">GESTION360</span>.
                            </p>
                        </div>
                        <button 
                            onClick={handleGenerateFees}
                            disabled={generating}
                            className="group relative flex items-center gap-3 px-8 py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            {generating ? (
                                <>
                                    <LoadingSpinner size="sm" color="white" />
                                    <span>Génération en cours...</span>
                                </>
                            ) : (
                                <>
                                    <DollarSign className="w-5 h-5 text-indigo-400" />
                                    <span>Générer les commissions (1%)</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid - Harmonized Heights */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Trésorerie Globale', value: formatAmount(stats.totalBalance), icon: Wallet, color: 'from-indigo-600 to-indigo-700', sub: `${stats.activeWallets} agences actives` },
                    { label: 'Rechargements', value: formatAmount(stats.totalDeposit), icon: ArrowUpRight, color: 'from-slate-900 to-slate-800', sub: 'Volume de dépôts cumulé' },
                    { label: 'Opérations', value: stats.totalTransactions, icon: History, color: 'from-white to-slate-50', sub: 'Transactions traitées', light: true },
                    { label: 'Commissions', value: formatAmount(data.transactions.filter(t => t.type === 'usage').reduce((sum, t) => sum + Math.abs(t.amount), 0)), icon: DollarSign, color: 'from-emerald-500 to-teal-600', sub: 'Revenus plateforme nets' }
                ].map((stat, i) => (
                    <Card key={i} className={clsx(
                        "p-7 border-none shadow-xl transition-all hover:-translate-y-1 duration-500",
                        stat.light ? "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800" : `bg-gradient-to-br ${stat.color} text-white`
                    )}>
                        <div className="flex justify-between items-start mb-6">
                            <p className={clsx("text-[10px] font-black uppercase tracking-widest", stat.light ? "text-slate-400" : "text-white/70")}>
                                {stat.label}
                            </p>
                            <stat.icon className={clsx("w-5 h-5", stat.light ? "text-indigo-500" : "text-white/40")} />
                        </div>
                        <h3 className={clsx("text-2xl font-black tracking-tighter mb-4", stat.light ? "text-slate-900 dark:text-white" : "text-white")}>
                            {stat.value} <span className="text-sm font-bold opacity-60">{typeof stat.value === 'string' ? '' : 'Unités'}</span>
                        </h3>
                        <div className="flex items-center gap-2">
                            <div className={clsx("h-1 w-8 rounded-full", stat.light ? "bg-indigo-500" : "bg-white/30")}></div>
                            <span className={clsx("text-[10px] font-bold", stat.light ? "text-slate-400" : "text-white/60")}>{stat.sub}</span>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Commissions en attente - Styled Table */}
            {data.pendingFees.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-1.5 bg-amber-500 rounded-full"></div>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Commissions en attente de règlement</h4>
                        </div>
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-full border border-amber-100 dark:border-amber-900/30">
                            Prélèvement auto suggéré si solde suffisant
                        </p>
                    </div>
                    <Card className="overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/20">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-amber-50/50 dark:bg-amber-900/10">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-amber-700">Agence Partenaire</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-amber-700 text-center">Période</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-amber-700 text-right">Commission (1%)</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-amber-700 text-right">Solde Portefeuille</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-amber-700 text-center">Statut / Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-amber-100/50 dark:divide-amber-900/10">
                                    {data.pendingFees.filter(f => f.status === 'pending').map(fee => {
                                        const wallet = data.wallets.find(w => w.agency_id === fee.agency_id);
                                        const canPay = (wallet?.balance || 0) >= fee.commission_amount;
                                        
                                        return (
                                            <tr key={fee.id} className="group hover:bg-amber-50/30 dark:hover:bg-amber-900/5 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center font-black text-amber-700">
                                                            {fee.agencies?.name?.[0]}
                                                        </div>
                                                        <span className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm">{fee.agencies?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center text-xs font-bold text-slate-500">{fee.period_month}</td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className="text-lg font-black text-amber-600">{formatAmount(fee.commission_amount)}</span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className={`font-bold ${canPay ? 'text-emerald-600' : 'text-red-500 animate-pulse'}`}>
                                                            {formatAmount(wallet?.balance || 0)}
                                                        </span>
                                                        {!canPay && (
                                                            <span className="text-[9px] font-black uppercase text-red-400 mt-1">Rechargement requis</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${canPay ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${canPay ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                                                        {canPay ? 'Prêt pour prélèvement' : 'Attente Rechargement'}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* History Table */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-1.5 bg-indigo-500 rounded-full"></div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Journal des Flux Financiers</h4>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative hidden sm:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Filtrer l'historique..." 
                                className="pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-bold focus:ring-2 ring-indigo-500/20 w-[300px] transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                            <Download className="w-4 h-4" />
                            Export Ledger
                        </button>
                    </div>
                </div>

                <Card className="overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-900">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Horodatage</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Entité Agence</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Nature de l'opération</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Montant (FCFA)</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Récépissé</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 text-slate-300">
                                                <History size={64} strokeWidth={1} />
                                                <p className="text-sm font-bold italic">Aucune transaction dans le ledger pour le moment.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map((tx) => (
                                        <tr key={tx.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all duration-300">
                                            <td className="px-8 py-6 text-slate-500 font-bold text-[11px]">
                                                {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{tx.agencies?.name}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <span className={clsx(
                                                        "w-2 h-2 rounded-full",
                                                        tx.type === 'deposit' ? "bg-emerald-500" : "bg-indigo-500"
                                                    )}></span>
                                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate max-w-[200px]">{tx.description}</span>
                                                </div>
                                            </td>
                                            <td className={clsx(
                                                "px-8 py-6 text-right font-black text-lg tabular-nums",
                                                tx.amount >= 0 ? "text-emerald-600" : "text-slate-900 dark:text-white"
                                            )}>
                                                {tx.amount > 0 ? '+' : ''}{formatAmount(tx.amount)}
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <button 
                                                    onClick={() => handleDownloadInvoice(tx)}
                                                    className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all active:scale-90"
                                                >
                                                    <Download className="w-5 h-5" />
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
        </div>
    );
};

import React, { useEffect, useState } from 'react';
import { Wallet, DollarSign, ArrowUpRight, History, Search, Download, Building2, TrendingUp, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { Card } from '../../ui/Card';
import { formatAmount } from '../../../utils/format';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { downloadAgencyInvoicePDF } from '../../../utils/agencyInvoicing';
import { supabase } from '../../../lib/config';
import { toast } from 'react-hot-toast';

interface FeeRow {
    id: string;
    agency_id: string;
    period_month: string;
    potential_revenue: number;
    commission_amount: number;
    status: string;
    created_at: string;
    agencies?: { name: string; city?: string };
}

interface WalletRow {
    agency_id: string;
    balance: number;
    agencies?: { name: string };
}

interface TxRow {
    id: string;
    agency_id: string;
    type: string;
    amount: number;
    description: string;
    reference?: string;
    created_at: string;
    agencies?: { name: string; city?: string };
}

export const AdminFintech: React.FC = () => {
    const [fees, setFees] = useState<FeeRow[]>([]);
    const [wallets, setWallets] = useState<WalletRow[]>([]);
    const [transactions, setTransactions] = useState<TxRow[]>([]);
    const [agencyContracts, setAgencyContracts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [feesRes, walletsRes, txRes, contractsRes] = await Promise.all([
                supabase.from('agency_fintech_fees').select('*, agencies(name, city)').order('created_at', { ascending: false }),
                supabase.from('agency_wallets').select('*, agencies(name)'),
                supabase.from('wallet_transactions').select('*, agencies(name, city)').order('created_at', { ascending: false }).limit(50),
                supabase.from('contracts').select('agency_id, monthly_rent').in('status', ['active', 'renewed']),
            ]);

            const fetchedFees = feesRes.data || [];
            const fetchedTxs = txRes.data || [];

            // Background Reconciliation: reconcile paid commission transactions with pending fees
            const pendingFees = fetchedFees.filter((f: any) => f.status === 'pending');
                const { data: allCommissions } = await supabase
                    .from('wallet_transactions')
                    .select('*')
                    .in('type', ['commission', 'usage']);
                
                const commissionTxs = (allCommissions || []).filter((tx: any) =>
                    tx.type === 'commission' || 
                    (tx.type === 'usage' && tx.description?.toLowerCase().includes('commission'))
                );

                for (const fee of pendingFees) {
                    const matchingTx = commissionTxs.find((tx: any) => 
                        tx.agency_id === fee.agency_id && 
                        Math.abs(Number(tx.amount)) === Number(fee.commission_amount)
                    );
                    
                    if (matchingTx) {
                        await supabase
                            .from('agency_fintech_fees')
                            .update({ 
                                status: 'paid',
                                paid_at: matchingTx.created_at,
                                transaction_id: matchingTx.id
                            })
                            .eq('id', fee.id);
                        
                        fee.status = 'paid';
                        fee.paid_at = matchingTx.created_at;
                        fee.transaction_id = matchingTx.id;
                    }
                }

            setFees(fetchedFees);
            setWallets(walletsRes.data || []);
            setTransactions(fetchedTxs);

            // Calculer le volume par agence depuis les contrats réels
            const byAgency: Record<string, number> = {};
            (contractsRes.data || []).forEach((c: any) => {
                if (c.agency_id) byAgency[c.agency_id] = (byAgency[c.agency_id] || 0) + (c.monthly_rent || 0);
            });
            setAgencyContracts(byAgency);

        } catch (err) {
            console.error('Error loading admin fintech data:', err);
            toast.error('Erreur de chargement des données Fintech');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateFees = async () => {
        try {
            setGenerating(true);
            const { error } = await supabase.rpc('process_monthly_fintech_commissions');
            if (error) throw error;
            toast.success('Commissions du mois générées avec succès !');
            loadData();
        } catch (error: any) {
            toast.error('Erreur de génération : ' + error.message);
        } finally {
            setGenerating(false);
        }
    };

    const handleCollectCommission = async (agencyId: string, pendingAmount: number) => {
        try {
            setLoading(true);
            
            // 1. Get the pending fees for this agency
            const { data: pendingFees } = await supabase
                .from('agency_fintech_fees')
                .select('*')
                .eq('agency_id', agencyId)
                .eq('status', 'pending');
            
            if (!pendingFees || pendingFees.length === 0) {
                toast.error('Aucune commission en attente pour cette agence.');
                return;
            }

            // 2. Get the agency's wallet
            const { data: wallet } = await supabase
                .from('agency_wallets')
                .select('*')
                .eq('agency_id', agencyId)
                .single();
            
            if (!wallet || wallet.balance < pendingAmount) {
                toast.error("Le solde du portefeuille de l'agence est insuffisant pour collecter cette commission.");
                return;
            }

            // 3. Deduct from wallet balance
            const newBalance = Number(wallet.balance) - pendingAmount;
            const { error: walletErr } = await supabase
                .from('agency_wallets')
                .update({ balance: newBalance })
                .eq('agency_id', agencyId);
            
            if (walletErr) throw walletErr;

            // 4. Insert into wallet_transactions
            const { data: txData, error: txErr } = await supabase
                .from('wallet_transactions')
                .insert({
                    agency_id: agencyId,
                    wallet_id: wallet.id,
                    amount: -pendingAmount,
                    type: 'commission',
                    description: `Prélèvement Commission Fintech 1% - Collecte Automatique`,
                    reference: `PAY-${Date.now()}-${agencyId.slice(0, 4)}`
                })
                .select()
                .single();
            
            if (txErr) throw txErr;

            // 5. Mark pending fees as paid
            const { error: feeErr } = await supabase
                .from('agency_fintech_fees')
                .update({
                    status: 'paid',
                    paid_at: new Date().toISOString(),
                    transaction_id: txData.id
                })
                .eq('agency_id', agencyId)
                .eq('status', 'pending');
            
            if (feeErr) throw feeErr;

            toast.success('Commission encaissée avec succès !');
            await loadData();
        } catch (err: any) {
            console.error('Error collecting commission:', err);
            toast.error('Erreur lors du prélèvement : ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadInvoice = (tx: TxRow) => {
        downloadAgencyInvoicePDF({
            invoiceNumber: tx.reference || `TX-${tx.id.substring(0, 8)}`,
            date: new Date(tx.created_at).toLocaleDateString('fr-FR'),
            agencyName: tx.agencies?.name || 'Agence',
            agencyCity: tx.agencies?.city,
            amount: Math.abs(tx.amount),
            type: tx.type === 'deposit' ? 'deposit' : 'commission',
            description: tx.description || (tx.type === 'deposit' ? 'Rechargement de compte' : 'Commission Fintech 1%'),
            potentialRevenue: tx.type === 'usage' ? Math.abs(tx.amount) * 100 : undefined,
        });
    };

    // Statistiques globales depuis les fees
    const totalCommissions = fees.reduce((s, f) => s + (f.commission_amount || 0), 0);
    const collectedCommissions = fees.filter(f => f.status === 'paid').reduce((s, f) => s + (f.commission_amount || 0), 0);
    const pendingCommissions = fees.filter(f => f.status === 'pending').reduce((s, f) => s + (f.commission_amount || 0), 0);
    const totalWalletBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);

    // Résumé par agence pour l'affichage principal
    const agencySummary = Object.entries(
        fees.reduce((acc, fee) => {
            const id = fee.agency_id;
            if (!acc[id]) acc[id] = { name: fee.agencies?.name || '—', city: fee.agencies?.city, totalFees: 0, paid: 0, pending: 0, periods: [] };
            acc[id].totalFees += fee.commission_amount || 0;
            if (fee.status === 'paid') acc[id].paid += fee.commission_amount || 0;
            if (fee.status === 'pending') acc[id].pending += fee.commission_amount || 0;
            acc[id].periods.push(fee.period_month);
            return acc;
        }, {} as Record<string, any>)
    );

    const filteredTx = transactions.filter(t =>
        t.agencies?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" color="indigo" /></div>;

    return (
        <div className="animate-fade-in space-y-10 pb-20">

            {/* ── Hero Header ── */}
            <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-2xl shadow-indigo-500/5 p-8">
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 blur-3xl opacity-60" />
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" />
                            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500">Fintech Intelligence</span>
                        </div>
                        <h2 className="text-4xl font-black tracking-tighter text-slate-900 lg:text-5xl">
                            Portefeuille <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Global</span>
                        </h2>
                        <p className="text-slate-500 font-medium text-base lg:text-lg max-w-2xl">
                            Supervision des flux Fintech et commissions de <strong className="text-slate-900">1%</strong> pour chaque agence partenaire.
                        </p>
                    </div>
                    <button
                        onClick={handleGenerateFees}
                        disabled={generating}
                        className="group relative flex items-center gap-3 px-8 py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        {generating ? (
                            <><LoadingSpinner size="sm" color="white" /><span>Génération en cours...</span></>
                        ) : (
                            <><DollarSign className="w-5 h-5 text-indigo-400" /><span>Générer les commissions (1%)</span></>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Stats KPIs ── */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Commissions Totales', value: formatAmount(totalCommissions), icon: DollarSign, bg: 'bg-indigo-600', sub: `${fees.length} entrées générées` },
                    { label: 'Commissions Collectées', value: formatAmount(collectedCommissions), icon: ArrowUpRight, bg: 'bg-emerald-600', sub: 'Déjà encaissé' },
                    { label: 'En Attente', value: formatAmount(pendingCommissions), icon: History, bg: 'bg-amber-500', sub: 'Agences à relancer' },
                    { label: 'Solde Wallets', value: formatAmount(totalWalletBalance), icon: Wallet, bg: 'bg-slate-800', sub: `${wallets.length} portefeuilles` },
                ].map((stat, i) => (
                    <Card key={i} className={clsx('p-7 border-none shadow-xl text-white transition-all hover:-translate-y-1 duration-300', stat.bg)}>
                        <div className="flex justify-between items-start mb-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">{stat.label}</p>
                            <stat.icon className="w-5 h-5 text-white/40" />
                        </div>
                        <h3 className="text-2xl font-black tracking-tighter text-white mb-3">{stat.value}</h3>
                        <div className="flex items-center gap-2">
                            <div className="h-1 w-8 rounded-full bg-white/30" />
                            <span className="text-[10px] font-bold text-white/60">{stat.sub}</span>
                        </div>
                    </Card>
                ))}
            </div>

            {/* ── Commission par agence ── */}
            {fees.length === 0 ? (
                <Card className="border-none bg-white shadow-xl p-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-20 w-20 rounded-full bg-indigo-50 flex items-center justify-center">
                            <AlertCircle className="h-10 w-10 text-indigo-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Aucune commission générée</h3>
                        <p className="text-slate-500 max-w-md font-medium leading-relaxed">
                            Cliquez sur <strong>"Générer les commissions (1%)"</strong> ci-dessus pour calculer les commissions du mois en cours sur toutes les agences approuvées.
                        </p>
                        <p className="text-xs text-slate-400 italic">
                            Note : La fonction SQL <code className="bg-slate-100 px-1 rounded">process_monthly_fintech_commissions</code> doit exister en base de données.
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-1.5 rounded-full bg-indigo-500" />
                        <h4 className="text-xl font-black tracking-tight text-slate-900">Commissions par Agence</h4>
                    </div>
                    <Card className="overflow-hidden border-none shadow-2xl bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Agence</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Volume Loyers</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Commission Due (1%)</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Solde Wallet</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Statut</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {agencySummary.map(([agencyId, info]: [string, any]) => {
                                        const wallet = wallets.find(w => w.agency_id === agencyId);
                                        const contractVolume = agencyContracts[agencyId] || 0;
                                        const canPay = (wallet?.balance || 0) >= info.pending;
                                        return (
                                            <tr key={agencyId} className="group hover:bg-slate-50/80 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center font-black text-indigo-700 text-sm">
                                                            {info.name?.[0] || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900 uppercase tracking-tight text-sm">{info.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">{info.city || '—'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className="font-bold text-slate-600 text-sm">
                                                        {contractVolume > 0 ? formatAmount(contractVolume) : <span className="text-slate-300 italic text-xs">Aucun contrat actif</span>}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div>
                                                        <p className="text-lg font-black text-indigo-600">{formatAmount(info.totalFees)}</p>
                                                        {info.paid > 0 && <p className="text-[10px] text-emerald-600 font-bold">✓ {formatAmount(info.paid)} collecté</p>}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className={clsx('font-bold', canPay || info.pending === 0 ? 'text-emerald-600' : 'text-red-500')}>
                                                            {formatAmount(wallet?.balance || 0)}
                                                        </span>
                                                        {!canPay && info.pending > 0 && (
                                                            <span className="text-[9px] font-black text-red-400 uppercase mt-0.5">Rechargement requis</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    {info.pending > 0 ? (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className={clsx(
                                                                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest',
                                                                canPay ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                            )}>
                                                                <span className={clsx('w-1.5 h-1.5 rounded-full', canPay ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse')} />
                                                                {canPay ? 'Prêt' : 'En attente'}
                                                            </span>
                                                            {canPay && (
                                                                <button
                                                                    onClick={() => handleCollectCommission(agencyId, info.pending)}
                                                                    className="mt-1 px-3 py-1 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-[10px] font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                                                                >
                                                                    Encaisser
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                            ✓ Soldé
                                                        </span>
                                                    )}
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

            {/* ── Journal des transactions ── */}
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-1.5 rounded-full bg-slate-400" />
                        <h4 className="text-xl font-black tracking-tight text-slate-900">Journal des Flux Financiers</h4>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative hidden sm:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filtrer..."
                                className="pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 ring-indigo-500/20 w-64 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <Card className="overflow-hidden border-none shadow-xl bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Agence</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Nature</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Montant</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Récépissé</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTx.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-24 text-center">
                                            <div className="flex flex-col items-center gap-4 text-slate-300">
                                                <History size={56} strokeWidth={1} />
                                                <p className="text-sm font-bold italic">Aucune transaction — Les rechargements et prélèvements apparaîtront ici.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTx.map((tx) => (
                                        <tr key={tx.id} className="group hover:bg-slate-50/80 transition-all duration-200">
                                            <td className="px-8 py-5 text-slate-500 font-bold text-[11px]">
                                                {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-8 py-5 font-black text-slate-900 uppercase tracking-tight text-sm">{tx.agencies?.name}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <span className={clsx('w-2 h-2 rounded-full', tx.type === 'deposit' ? 'bg-emerald-500' : 'bg-indigo-500')} />
                                                    <span className="text-xs font-medium text-slate-500 truncate max-w-[200px]">{tx.description}</span>
                                                </div>
                                            </td>
                                            <td className={clsx('px-8 py-5 text-right font-black text-base tabular-nums', tx.amount >= 0 ? 'text-emerald-600' : 'text-slate-900')}>
                                                {tx.amount > 0 ? '+' : ''}{formatAmount(tx.amount)}
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <button
                                                    onClick={() => handleDownloadInvoice(tx)}
                                                    className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-90"
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
        </div>
    );
};

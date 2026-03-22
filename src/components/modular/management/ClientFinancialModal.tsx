import React, { useState, useEffect } from 'react';
import { 
    Receipt, Calendar, ArrowUpCircle, ArrowDownCircle, 
    CreditCard, Banknote, Landmark, Smartphone, Loader2, X
} from 'lucide-react';
import { dbService } from '../../../lib/supabase';
import { ModularClient, ModularTransaction } from '../../../types/modular';
import { usePriceCalculator } from '../../../hooks/usePriceCalculator';

interface ClientFinancialModalProps {
    client: ModularClient;
    onClose: () => void;
}

export const ClientFinancialModal: React.FC<ClientFinancialModalProps> = ({ client, onClose }) => {
    const [audit, setAudit] = useState<{
        transactions: ModularTransaction[],
        totalBooked: number,
        totalPaid: number,
        staysCount: number
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { formatPrice } = usePriceCalculator(null);

    useEffect(() => {
        const fetchAudit = async () => {
            try {
                setIsLoading(true);
                const data = await dbService.modular.getClientFinancialRecord(client.id);
                setAudit(data);
            } catch (error) {
                console.error('Error fetching client financial record:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAudit();
    }, [client.id]);

    const getPaymentIcon = (method: string) => {
        const m = (method || '').toLowerCase();
        if (m.includes('cash') || m.includes('espèces')) return <Banknote size={14} className="text-emerald-500" />;
        if (m.includes('card') || m.includes('carte')) return <CreditCard size={14} className="text-indigo-500" />;
        if (m.includes('bank') || m.includes('virement')) return <Landmark size={14} className="text-blue-500" />;
        if (m.includes('money')) return <Smartphone size={14} className="text-amber-500" />;
        return <Receipt size={14} className="text-slate-400" />;
    };

    const balance = (audit?.totalBooked || 0) - (audit?.totalPaid || 0);
    const averageSpent = (audit?.staysCount || 0) > 0 ? (audit?.totalPaid || 0) / (audit?.staysCount || 0) : 0;

    return (
        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl max-w-2xl w-full mx-auto font-sans border border-slate-100">
            <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                <button 
                    onClick={onClose}
                    className="absolute right-8 top-8 p-3 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white"
                >
                    <X size={24} />
                </button>
                
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                        <Receipt size={36} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter">Point Financier</h3>
                        <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest mt-1 opacity-80">
                            Client: {client.first_name} {client.last_name}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10 relative z-10">
                    <div className="bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-sm">
                        <p className="text-[9px] font-black uppercase text-white/40 mb-2 tracking-widest">Total Séjours</p>
                        <p className="text-2xl font-black">{audit?.staysCount || client.total_stays || 0}</p>
                    </div>
                    <div className="bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-sm">
                        <p className="text-[9px] font-black uppercase text-white/40 mb-2 tracking-widest">Total Encaissé</p>
                        <p className="text-2xl font-black text-emerald-400">{formatPrice(audit?.totalPaid || 0)}</p>
                    </div>
                    <div className="bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-sm">
                        <p className="text-[9px] font-black uppercase text-white/40 mb-2 tracking-widest">Total Engagé</p>
                        <p className="text-2xl font-black text-indigo-300">{formatPrice(audit?.totalBooked || 0)}</p>
                    </div>
                    <div className={`p-5 rounded-3xl border backdrop-blur-sm ${balance > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                        <p className={`text-[9px] font-black uppercase mb-2 tracking-widest ${balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>Solde Client</p>
                        <p className={`text-2xl font-black ${balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {balance > 0 ? formatPrice(balance) : 'SOLDÉ'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Calendar size={12} /> Historique des Transactions
                    </h4>
                    <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 italic">
                        <span className="text-[9px] font-black text-slate-400 uppercase mr-2">Moyenne / Séjour :</span>
                        <span className="text-xs font-black text-slate-700">{formatPrice(averageSpent)}</span>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-indigo-600" size={40} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Analyse des flux financiers...</p>
                    </div>
                ) : audit && audit.transactions.length > 0 ? (
                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-3 custom-scrollbar">
                        {audit.transactions.map((tx) => (
                            <div key={tx.id} className="group flex items-center justify-between p-5 bg-slate-50 hover:bg-white rounded-[1.5rem] border border-slate-100 hover:border-indigo-100 transition-all hover:shadow-xl hover:shadow-indigo-500/5">
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                                        tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                    }`}>
                                        {tx.type === 'income' ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800 uppercase italic leading-tight group-hover:text-indigo-600 transition-colors">
                                            {tx.description || tx.category}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                {new Date(tx.transaction_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </span>
                                            <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                {getPaymentIcon(tx.payment_method)}
                                                <span className="text-[9px] font-black text-slate-500 uppercase italic">
                                                    {tx.payment_method}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-lg font-black ${
                                        tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                        {tx.type === 'income' ? '+' : '-'}{formatPrice(tx.amount)}
                                    </p>
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest opacity-60">
                                        ID-{tx.id.slice(0,8).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                        <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-sm font-black text-slate-400 uppercase italic tracking-widest">Aucune transaction enregistrée</p>
                    </div>
                )}

                <div className="mt-10 pt-8 border-t border-slate-100">
                    <button 
                        onClick={onClose}
                        className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-3xl transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]"
                    >
                        Refermer le point financier
                    </button>
                </div>
            </div>
        </div>
    );
};

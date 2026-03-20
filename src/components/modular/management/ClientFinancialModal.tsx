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
    const [transactions, setTransactions] = useState<ModularTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { formatPrice } = usePriceCalculator(null);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                setIsLoading(true);
                const data = await dbService.modular.getClientTransactions(client.id);
                setTransactions(data);
            } catch (error) {
                console.error('Error fetching client transactions:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransactions();
    }, [client.id]);

    const getPaymentIcon = (method: string) => {
        const m = method.toLowerCase();
        if (m.includes('cash') || m.includes('espèces')) return <Banknote size={14} className="text-emerald-500" />;
        if (m.includes('card') || m.includes('carte')) return <CreditCard size={14} className="text-indigo-500" />;
        if (m.includes('bank') || m.includes('virement')) return <Landmark size={14} className="text-blue-500" />;
        if (m.includes('money')) return <Smartphone size={14} className="text-amber-500" />;
        return <Receipt size={14} className="text-slate-400" />;
    };

    return (
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full mx-auto font-sans">
            <div className="bg-slate-900 p-8 text-white relative">
                <button 
                    onClick={onClose}
                    className="absolute right-6 top-6 p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                >
                    <X size={20} />
                </button>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                        <Receipt size={32} className="text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter">Point Financier</h3>
                        <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mt-1">
                            Client: {client.first_name} {client.last_name}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <p className="text-[9px] font-black uppercase text-white/40 mb-1">Total Séjours</p>
                        <p className="text-xl font-black">{client.total_stays || 0}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <p className="text-[9px] font-black uppercase text-white/40 mb-1">Total Dépensé</p>
                        <p className="text-xl font-black text-emerald-400">{formatPrice(client.total_spent || 0)}</p>
                    </div>
                </div>
            </div>

            <div className="p-8">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
                    <Calendar size={12} /> Historique des Transactions
                </h4>

                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                        <p className="text-[10px] font-black text-slate-400 uppercase">Chargement de l'historique...</p>
                    </div>
                ) : transactions.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all hover:shadow-md">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                    }`}>
                                        {tx.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800 uppercase italic leading-tight group-hover:text-indigo-600 transition-colors">
                                            {tx.description || tx.category}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                {new Date(tx.transaction_date).toLocaleDateString('fr-FR')}
                                            </span>
                                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                            <div className="flex items-center gap-1">
                                                {getPaymentIcon(tx.payment_method)}
                                                <span className="text-[9px] font-black text-slate-500 uppercase italic">
                                                    {tx.payment_method}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-black ${
                                        tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                        {tx.type === 'income' ? '+' : '-'}{formatPrice(tx.amount)}
                                    </p>
                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">
                                        ID-{tx.id.slice(0,8)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-16 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <p className="text-xs font-bold text-slate-400 uppercase italic">Aucune transaction trouvée pour ce client.</p>
                    </div>
                )}

                <div className="mt-8 pt-8 border-t border-slate-100">
                    <button 
                        onClick={onClose}
                        className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all"
                    >
                        Refermer le point
                    </button>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../ui/Modal';
import { toast } from 'react-hot-toast';
import { audioService } from '../../utils/audio';

interface PayoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    ownerId: string;
    ownerName: string;
}

interface PayoutFormData {
    amount: number;
    description: string;
    transaction_date: string;
    payment_method: string;
}

export const PayoutModal: React.FC<PayoutModalProps> = ({ isOpen, onClose, onSuccess, ownerId, ownerName }) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [calculatingBalance, setCalculatingBalance] = useState(false);
    const [balance, setBalance] = useState<number | null>(null);
    const [breakdown, setBreakdown] = useState({
        earned: 0,
        paidOut: 0,
        maintenance: 0
    });

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<PayoutFormData>({
        defaultValues: {
            transaction_date: new Date().toISOString().split('T')[0],
            payment_method: 'bank_transfer',
            description: `Reversement - ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
        }
    });

    useEffect(() => {
        if (isOpen && ownerId) {
            calculateOwnerBalance();
            setValue('description', `Reversement ${ownerName} - ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`);
        } else {
            setBalance(null);
        }
    }, [isOpen, ownerId]);

    const calculateOwnerBalance = async () => {
        setCalculatingBalance(true);
        try {
            // 1. Get total expected owner payments from rent receipts
            const { data: rentReceipts } = await supabase
                .from('rent_receipts')
                .select('owner_payment, total_amount, amount_paid, payment_status, contract_id, property_id')
                .eq('owner_id', ownerId);

            // 2. Get all modular transactions for this owner
            const { data: manualTrans } = await supabase
                .from('modular_transactions')
                .select('amount, category, type, description, related_property_id, transaction_date, created_at')
                .eq('related_owner_id', ownerId);

            // Fetch owner transactions reversals
            const { data: ownerTrans } = await supabase
                .from('owner_transactions')
                .select('montant, date_transaction, created_at, type')
                .eq('owner_id', ownerId);

            const { data: contracts } = await supabase
                .from('contracts')
                .select('id, property_id, commission_rate, commission_amount, extra_data')
                .eq('status', 'active');

            const earnedFromReceipts = rentReceipts?.reduce((sum, r) => {
                if (r.payment_status === 'unpaid') return sum;
                
                const isPaid = r.payment_status === 'paid' || r.payment_status === 'full';
                const amountPaid = isPaid ? (Number(r.amount_paid || r.total_amount) || 0) : (Number(r.amount_paid) || 0);
                if (amountPaid === 0) return sum;

                const contract = contracts?.find(c => c.id === r.contract_id || c.property_id === r.property_id);
                const contractRent = contract ? ((contract.monthly_rent || 0) + (contract.charges || 0)) : 0;

                // Prioritize saved owner_payment on the receipt if it exists and is defined
                let ownerPart = Number(r.owner_payment);
                
                if (isNaN(ownerPart) || ownerPart === 0) {
                    const commType = contract?.extra_data?.commission_type || 'percentage';
                    if (commType === 'fixed') {
                        const comm = contract?.commission_amount !== undefined ? contract.commission_amount : 0;
                        const isFullRentReceipt = Math.abs(amountPaid - contractRent) <= Math.max(5000, contractRent * 0.05);
                        const baseAmount = (isPaid && contractRent > 0 && isFullRentReceipt) ? contractRent : amountPaid;
                        ownerPart = Math.max(0, baseAmount - comm);
                    } else {
                        const commRate = contract?.commission_rate !== undefined ? contract.commission_rate : 10;
                        const isFullRentReceipt = Math.abs(amountPaid - contractRent) <= Math.max(5000, contractRent * 0.05);
                        const baseAmount = (isPaid && contractRent > 0 && isFullRentReceipt) ? contractRent : amountPaid;
                        ownerPart = baseAmount * (1 - commRate / 100);
                    }
                }
                
                return sum + ownerPart;
            }, 0) || 0;

            // Déduplication des transactions de loyer manuelles par rapport aux reçus
            const uniqueManualTrans = manualTrans?.filter(m => {
                if (m.category !== 'rent_payment' || m.type === 'debit') return true;
                const isDuplicated = rentReceipts?.some(r =>
                    r.property_id === m.related_property_id &&
                    Math.abs(Number(r.amount_paid || r.total_amount) - Number(m.amount)) < 1 &&
                    Math.abs(new Date(r.payment_date || r.created_at).getTime() - new Date(m.transaction_date || m.created_at).getTime()) < 172800000
                );
                return !isDuplicated;
            }) || [];

            // 3. Calculate earnings from manual transactions (Rent)
            const earnedFromManual = uniqueManualTrans.reduce((s, t) => {
                if (t.type === 'debit') return s;
                if (t.category === 'rent_payment') {
                    const match = t.description?.match(/\[Part Proprio:\s*(\d+\.?\d*)\]/);
                    if (match) return s + Number(match[1]);
                    
                    const contract = contracts?.find(c => c.property_id === t.related_property_id);
                    const commType = contract?.extra_data?.commission_type || 'percentage';
                    if (commType === 'fixed') {
                        const comm = contract?.commission_amount !== undefined ? contract.commission_amount : 0;
                        return s + (Number(t.amount) - comm);
                    } else {
                        const commRate = contract?.commission_rate !== undefined ? contract.commission_rate : 10;
                        return s + (Number(t.amount) * (1 - commRate / 100));
                    }
                }
                return s;
            }, 0);

            // 4. Calculate total paid out (take both debit and expense types for robustness, and merge with owner_transactions)
            const manualPayouts = uniqueManualTrans.filter(t => t.category === 'owner_payout' && (t.type === 'debit' || t.type === 'expense'));
            const ownerTxReversals = ownerTrans?.filter(r => r.type !== 'credit') || [];

            const totalPaidOut = ownerTxReversals.reduce((sum, r) => sum + Number(r.montant), 0) +
                manualPayouts.reduce((sum, mp) => {
                    const isDuplicated = ownerTxReversals.some(r => 
                        Math.abs(Number(r.montant) - Number(mp.amount)) < 1 &&
                        Math.abs(new Date(r.date_transaction || r.created_at).getTime() - new Date(mp.transaction_date || mp.created_at).getTime()) < 172800000
                    );
                    return isDuplicated ? sum : sum + Number(mp.amount);
                }, 0);
            
            // 5. Get Maintenance costs
            const { data: maintenance } = await supabase
                .from('tickets')
                .select('cost')
                .eq('owner_id', ownerId)
                .eq('charge_to', 'owner')
                .eq('status', 'resolved');

            const totalMaintenance = maintenance?.reduce((sum, m) => sum + (Number(m.cost) || 0), 0) || 0;

            const totalEarned = earnedFromReceipts + earnedFromManual;

            setBreakdown({
                earned: totalEarned,
                paidOut: totalPaidOut,
                maintenance: totalMaintenance
            });
            setBalance(totalEarned - totalPaidOut - totalMaintenance);

        } catch (error) {
            console.error("Error calculating balance", error);
            setBalance(0);
            setBreakdown({ earned: 0, paidOut: 0, maintenance: 0 });
        } finally {
            setCalculatingBalance(false);
        }
    };

    const onSubmit = async (data: PayoutFormData) => {
        setIsLoading(true);
        try {
            const dbPaymentMethod = 
                data.payment_method === 'bank_transfer' ? 'virement' :
                data.payment_method === 'check' ? 'cheque' :
                data.payment_method === 'cash' ? 'especes' : 'mobile_money';

            // 1. Record in owner_transactions (Owner Ledger)
            const { error: ownerTxError } = await supabase
                .from('owner_transactions')
                .insert({
                    owner_id: ownerId,
                    agency_id: user?.agency_id,
                    type: 'debit',
                    montant: data.amount,
                    mode_paiement: dbPaymentMethod,
                    reference: '',
                    description: data.description,
                    notes: 'Enregistré depuis le menu caisse',
                    date_transaction: new Date(data.transaction_date).toISOString(),
                    created_by: user?.id,
                });

            if (ownerTxError) throw ownerTxError;

            // 2. Record in modular_transactions (Caisse Journal)
            const { error } = await supabase
                .from('modular_transactions')
                .insert([{
                    agency_id: user?.agency_id,
                    created_by: user?.id,
                    type: 'expense',
                    amount: data.amount,
                    category: 'owner_payout',
                    description: data.description,
                    transaction_date: data.transaction_date,
                    payment_method: data.payment_method,
                    related_owner_id: ownerId,
                    module_type: 'owner'
                }]);

            if (error) throw error;

            toast.success('Reversement enregistré');
            audioService.playCashOut();
            window.dispatchEvent(new CustomEvent('gestion360:refetch', { 
                detail: { table: 'all', action: 'create' } 
            }));
            reset();
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating payout:', error);
            toast.error('Erreur lors de l\'enregistrement');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Nouveau Reversement - ${ownerName}`}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                {/* Balance Display */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-1">Solde disponible</span>
                        {calculatingBalance ? (
                            <div className="h-8 w-24 bg-slate-800 animate-pulse rounded-lg" />
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black">{balance?.toLocaleString('fr-FR')}</span>
                                <span className="text-sm font-bold text-slate-400">FCFA</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Breakdown Details */}
                {!calculatingBalance && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Loyers Perçus</span>
                           <span className="text-sm font-bold text-emerald-700">+{breakdown.earned.toLocaleString('fr-FR')}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
                           <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-1">Reversements</span>
                           <span className="text-sm font-bold text-orange-700">-{breakdown.paidOut.toLocaleString('fr-FR')}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                           <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block mb-1">Dépenses/Travaux</span>
                           <span className="text-sm font-bold text-rose-700">-{breakdown.maintenance.toLocaleString('fr-FR')}</span>
                        </div>
                    </div>
                )}

                {/* Amount */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Montant du reversement (FCFA)</label>
                    <input
                        type="number"
                        {...register('amount', { required: 'Le montant est requis', min: 1 })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    {errors.amount && <span className="text-red-500 text-xs">{errors.amount.message}</span>}
                </div>

                {/* Payment Method */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Mode de paiement</label>
                    <select
                        {...register('payment_method')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                        <option value="bank_transfer">Virement Bancaire</option>
                        <option value="check">Chèque</option>
                        <option value="cash">Espèces</option>
                        <option value="mobile_money">Mobile Money</option>
                    </select>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <input
                        type="text"
                        {...register('description', { required: true })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                </div>

                {/* Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Date du reversement</label>
                    <input
                        type="date"
                        {...register('transaction_date', { required: true })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                        {isLoading ? 'Enregistrement...' : 'Valider le reversement'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

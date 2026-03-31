import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../ui/Modal';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '../ui/LoadingSpinner';

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
                .select('owner_payment')
                .eq('owner_id', ownerId);

            const totalEarned = rentReceipts?.reduce((sum, r) => sum + (Number(r.owner_payment) || 0), 0) || 0;

            // 2. Get past payouts (DEBITS of type 'owner_payout')
            const { data: transactions } = await supabase
                .from('modular_transactions')
                .select('amount')
                .eq('related_owner_id', ownerId)
                .eq('category', 'owner_payout')
                .eq('type', 'debit');

            const totalPaidOut = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
            
            // 3. Get Maintenance costs (resolved tickets charged to owner)
            const { data: maintenance } = await supabase
                .from('tickets')
                .select('cost')
                .eq('owner_id', ownerId)
                .eq('charge_to', 'owner')
                .eq('status', 'resolved');

            const totalMaintenance = maintenance?.reduce((sum, m) => sum + (Number(m.cost) || 0), 0) || 0;

            // Current Balance = Total Earned - Total Paid Out - Total Maintenance
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
            const { error } = await supabase
                .from('modular_transactions')
                .insert([{
                    agency_id: user?.agency_id,
                    created_by: user?.id,
                    type: 'debit',
                    amount: data.amount,
                    category: 'owner_payout',
                    description: data.description,
                    transaction_date: data.transaction_date,
                    payment_method: data.payment_method,
                    related_owner_id: ownerId
                }]);

            if (error) throw error;

            toast.success('Reversement enregistré');
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

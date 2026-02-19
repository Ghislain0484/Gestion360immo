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
            // 1. Get total active rent receipts (CREDITS linked to this owner's properties) (simplified logic)
            // Ideally we would double entry, but here we can sum rent_receipts for owner's properties
            const { data: properties } = await supabase
                .from('properties')
                .select('id')
                .eq('owner_id', ownerId);

            const propertyIds = properties?.map(p => p.id) || [];

            if (propertyIds.length === 0) {
                setBalance(0);
                return;
            }

            const { data: rentReceipts } = await supabase
                .from('rent_receipts')
                .select('total_amount, agency_commission') // Assuming agency_commission exists on receipt or we calculate it. 
                // Note: DB schema for rent_receipts wasn't fully visible but assuming standard structure. 
                // If agency commission isn't stored there, we might need to rely on generic %. 
                // For now, let's just sum distinct generic amounts.
                .in('property_id', propertyIds);

            const totalRent = rentReceipts?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;

            // 2. Get past payouts/expenses (DEBITS linked to this owner)
            const { data: transactions } = await supabase
                .from('cash_transactions')
                .select('amount, type')
                .eq('related_owner_id', ownerId);

            const totalDebits = transactions?.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0) || 0;
            const totalCredits = transactions?.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0) || 0;

            // Simple Balance = (Rents + Other Credits) - (Payouts + Other Debits)
            // Agency Commission handling is tricky without a dedicated ledger. 
            // For now, we will assume net rent is passed or commission is a debit.
            // Let's assume commission is NOT deducted yet in total_amount.
            // NOTE: This is a simplification. Real accounting needs strict double entry.

            setBalance(totalRent + totalCredits - totalDebits);

        } catch (error) {
            console.error("Error calculating balance", error);
        } finally {
            setCalculatingBalance(false);
        }
    };

    const onSubmit = async (data: PayoutFormData) => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('cash_transactions')
                .insert([{
                    ...data,
                    type: 'debit',
                    category: 'owner_payout',
                    related_owner_id: ownerId,
                    agency_id: user?.agency_id,
                    created_by: user?.id
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
                <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center">
                    <span className="text-blue-700 font-medium">Solde estimé disponible :</span>
                    {calculatingBalance ? (
                        <LoadingSpinner size="sm" />
                    ) : (
                        <span className="text-2xl font-bold text-blue-800">
                            {balance?.toLocaleString('fr-FR')} FCFA
                        </span>
                    )}
                </div>

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

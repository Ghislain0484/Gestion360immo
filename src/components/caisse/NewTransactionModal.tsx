import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../ui/Modal';
import { toast } from 'react-hot-toast';

interface NewTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface TransactionFormData {
    type: 'credit' | 'debit';
    amount: number;
    category: string;
    description: string;
    transaction_date: string;
    payment_method: string;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<TransactionFormData>({
        defaultValues: {
            type: 'debit',
            transaction_date: new Date().toISOString().split('T')[0],
            payment_method: 'cash'
        }
    });

    const transactionType = watch('type');

    const onSubmit = async (data: TransactionFormData) => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('cash_transactions')
                .insert([{
                    ...data,
                    agency_id: user?.agency_id,
                    created_by: user?.id
                }]);

            if (error) throw error;

            toast.success('Transaction enregistrée');
            reset();
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating transaction:', error);
            toast.error('Erreur lors de l\'enregistrement');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nouveau Mouvement de Caisse">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                {/* Type */}
                <div className="grid grid-cols-2 gap-4">
                    <label className={`
                flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors
                ${transactionType === 'credit' ? 'bg-green-50 border-green-500 text-green-700 font-medium' : 'bg-white border-gray-200 hover:bg-gray-50'}
            `}>
                        <input
                            type="radio"
                            value="credit"
                            className="sr-only"
                            {...register('type')}
                        />
                        Entrée (Crédit)
                    </label>
                    <label className={`
                flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors
                ${transactionType === 'debit' ? 'bg-red-50 border-red-500 text-red-700 font-medium' : 'bg-white border-gray-200 hover:bg-gray-50'}
            `}>
                        <input
                            type="radio"
                            value="debit"
                            className="sr-only"
                            {...register('type')}
                        />
                        Sortie (Débit)
                    </label>
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Montant (FCFA)</label>
                    <input
                        type="number"
                        {...register('amount', { required: 'Le montant est requis', min: 1 })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    {errors.amount && <span className="text-red-500 text-xs">{errors.amount.message}</span>}
                </div>

                {/* Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                        type="date"
                        {...register('transaction_date', { required: true })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Catégorie</label>
                    <select
                        {...register('category', { required: true })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                        <option value="">Sélectionner une catégorie</option>
                        <option value="rent_payment">Encaissement Loyer</option>
                        <option value="owner_payout">Reversement Propriétaire</option>
                        <option value="bank_deposit">Dépôt Banque</option>
                        <option value="withdrawal">Retrait</option>
                        <option value="supplies">Fournitures</option>
                        <option value="maintenance">Maintenance/Travaux</option>
                        <option value="salary">Salaires</option>
                        <option value="other">Autre</option>
                    </select>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Description / Motif</label>
                    <textarea
                        {...register('description', { required: 'Le motif est requis' })}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="Détails de l'opération..."
                    />
                    {errors.description && <span className="text-red-500 text-xs">{errors.description.message}</span>}
                </div>

                {/* Payment Method */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Mode de paiement</label>
                    <select
                        {...register('payment_method')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                        <option value="cash">Espèces</option>
                        <option value="bank_transfer">Virement</option>
                        <option value="check">Chèque</option>
                        <option value="mobile_money">Mobile Money</option>
                    </select>
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
                        className={`
                inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50
                ${transactionType === 'credit' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'}
             `}
                    >
                        {isLoading ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

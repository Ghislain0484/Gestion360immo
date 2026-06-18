import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../ui/Modal';
import { toast } from 'react-hot-toast';
import { SMSService } from '../../services/smsService';
import { audioService } from '../../utils/audio';

interface NewTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    transaction?: any; // To support editing
}

interface TransactionFormData {
    type: 'credit' | 'debit';
    amount: number;
    category: string;
    description: string;
    transaction_date: string;
    payment_method: string;
    related_owner_id?: string;
    related_tenant_id?: string;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({ isOpen, onClose, onSuccess, transaction }) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [owners, setOwners] = useState<any[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);

    // Charger les listes de propriétaires et locataires de l'agence
    useEffect(() => {
        const fetchLinkingLists = async () => {
            if (!user?.agency_id) return;
            try {
                const [ownersRes, tenantsRes] = await Promise.all([
                    supabase
                        .from('owners')
                        .select('id, first_name, last_name')
                        .eq('agency_id', user.agency_id)
                        .order('first_name'),
                    supabase
                        .from('tenants')
                        .select('id, first_name, last_name')
                        .eq('agency_id', user.agency_id)
                        .order('first_name')
                ]);
                if (ownersRes.data) setOwners(ownersRes.data);
                if (tenantsRes.data) setTenants(tenantsRes.data);
            } catch (err) {
                console.error('Erreur chargement des listes de liaison caisse:', err);
            }
        };

        if (isOpen) {
            fetchLinkingLists();
        }
    }, [user?.agency_id, isOpen]);

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<TransactionFormData>({
        defaultValues: {
            type: transaction?.type || 'debit',
            amount: transaction?.amount || 0,
            category: transaction?.category || '',
            description: transaction?.description || '',
            transaction_date: transaction?.transaction_date || new Date().toISOString().split('T')[0],
            payment_method: transaction?.payment_method || 'cash',
            related_owner_id: transaction?.related_owner_id || '',
            related_tenant_id: transaction?.related_tenant_id || ''
        }
    });

    // Reset form when transaction changes
    useEffect(() => {
        if (transaction) {
            reset({
                type: transaction.type === 'income' || transaction.type === 'credit' ? 'credit' : 'debit',
                amount: transaction.amount,
                category: transaction.category,
                description: transaction.description,
                transaction_date: transaction.transaction_date,
                payment_method: transaction.payment_method,
                related_owner_id: transaction.related_owner_id || '',
                related_tenant_id: transaction.related_tenant_id || ''
            });
        } else {
            reset({
                type: 'debit',
                amount: 0,
                category: '',
                description: '',
                transaction_date: new Date().toISOString().split('T')[0],
                payment_method: 'cash',
                related_owner_id: '',
                related_tenant_id: ''
            });
        }
    }, [transaction, reset, isOpen]);

    const transactionType = watch('type');
    const selectedCategory = watch('category');
    const watchedOwnerId = watch('related_owner_id');
    const watchedTenantId = watch('related_tenant_id');

    const onSubmit = async (data: TransactionFormData) => {
        setIsLoading(true);
        try {
            if (!user?.agency_id) {
                toast.error('Identifiant d\'agence manquant. Veuillez rafraîchir la page.');
                console.error('Missing agency_id for user:', user);
                return;
            }

            const payload = {
                agency_id: user?.agency_id,
                created_by: user?.id,
                type: data.type === 'credit' ? 'income' : 'expense', // Map back to DB-compatible types
                amount: Number(data.amount),
                category: data.category,
                description: data.description,
                transaction_date: data.transaction_date,
                payment_method: data.payment_method,
                module_type: data.related_owner_id ? 'owner' : data.related_tenant_id ? 'tenant' : 'agency',
                related_owner_id: data.related_owner_id || null,
                related_tenant_id: data.related_tenant_id || null
            };

            if (transaction?.id) {
                // Synchronisation en cascade avec owner_transactions
                const wasPayout = transaction.category === 'owner_payout' && transaction.related_owner_id;
                const isPayout = payload.category === 'owner_payout' && payload.related_owner_id;

                const dbPaymentMethod = 
                    payload.payment_method === 'bank_transfer' ? 'virement' :
                    payload.payment_method === 'check' ? 'cheque' :
                    payload.payment_method === 'cash' ? 'especes' : 'mobile_money';

                if (wasPayout && !isPayout) {
                    // Si l'opération n'est plus un reversement, on supprime la ligne correspondante dans owner_transactions
                    const { error: deleteError } = await supabase
                        .from('owner_transactions')
                        .delete()
                        .eq('owner_id', transaction.related_owner_id)
                        .eq('montant', transaction.amount)
                        .like('notes', '%journal de caisse%');
                    if (deleteError) {
                        console.error('Error deleting linked owner transaction during edit:', deleteError);
                    }
                } else if (!wasPayout && isPayout) {
                    // Si l'opération devient un reversement, on insère la ligne correspondante
                    const { error: insertError } = await supabase
                        .from('owner_transactions')
                        .insert({
                            owner_id: payload.related_owner_id,
                            agency_id: payload.agency_id,
                            type: 'debit',
                            montant: payload.amount,
                            mode_paiement: dbPaymentMethod,
                            reference: '',
                            description: payload.description,
                            notes: 'Enregistré manuellement depuis le journal de caisse (mis à jour)',
                            date_transaction: new Date(payload.transaction_date).toISOString(),
                            created_by: user?.id,
                        });
                    if (insertError) {
                        console.error('Error inserting linked owner transaction during edit:', insertError);
                    }
                } else if (wasPayout && isPayout) {
                    // Si l'opération reste un reversement, on cherche la ligne d'origine pour la mettre à jour
                    const { data: matchedTxs } = await supabase
                        .from('owner_transactions')
                        .select('id')
                        .eq('owner_id', transaction.related_owner_id)
                        .eq('montant', transaction.amount)
                        .like('notes', '%journal de caisse%')
                        .limit(1);
                    
                    if (matchedTxs && matchedTxs.length > 0) {
                        const { error: updateError } = await supabase
                            .from('owner_transactions')
                            .update({
                                owner_id: payload.related_owner_id,
                                montant: payload.amount,
                                mode_paiement: dbPaymentMethod,
                                description: payload.description,
                                date_transaction: new Date(payload.transaction_date).toISOString(),
                            })
                            .eq('id', matchedTxs[0].id);
                        if (updateError) {
                            console.error('Error updating linked owner transaction during edit:', updateError);
                        }
                    }
                }

                const { error } = await supabase
                    .from('modular_transactions')
                    .update(payload)
                    .eq('id', transaction.id);
                if (error) {
                    console.error('Update RLS error:', error);
                    throw error;
                }
                toast.success('Transaction mise à jour');
                
                // Play sound
                if (data.type === 'credit') {
                    audioService.playCashIn();
                } else {
                    audioService.playCashOut();
                }
            } else {
                const { error } = await supabase
                    .from('modular_transactions')
                    .insert([payload]);
                if (error) {
                    console.error('Insert RLS error:', error);
                    throw error;
                }

                // Synchronisation avec owner_transactions si c'est un reversement propriétaire
                if (payload.category === 'owner_payout' && payload.related_owner_id) {
                    const dbPaymentMethod = 
                        payload.payment_method === 'bank_transfer' ? 'virement' :
                        payload.payment_method === 'check' ? 'cheque' :
                        payload.payment_method === 'cash' ? 'especes' : 'mobile_money';
                    
                    const { error: ownerTxError } = await supabase
                        .from('owner_transactions')
                        .insert({
                            owner_id: payload.related_owner_id,
                            agency_id: payload.agency_id,
                            type: 'debit',
                            montant: payload.amount,
                            mode_paiement: dbPaymentMethod,
                            reference: '',
                            description: payload.description,
                            notes: 'Enregistré manuellement depuis le journal de caisse',
                            date_transaction: new Date(payload.transaction_date).toISOString(),
                            created_by: user?.id,
                        });
                    if (ownerTxError) {
                        console.error('Error syncing manual payout to owner_transactions:', ownerTxError);
                    }
                }

                toast.success('Transaction enregistrée');

                // Play sound
                if (data.type === 'credit') {
                    audioService.playCashIn();
                } else {
                    audioService.playCashOut();
                }

                // 📱 Alerte SMS au Directeur
                SMSService.notifyDirectorOfOperation(
                    user.agency_id, 
                    payload.amount, 
                    payload.type === 'income' ? 'Encaissement' : 'Décaissement'
                );
            }

            window.dispatchEvent(new CustomEvent('gestion360:refetch', { 
                detail: { table: 'all', action: transaction?.id ? 'update' : 'create' } 
            }));
            reset();
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving transaction:', error);
            toast.error('Erreur lors de l\'enregistrement');
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <Modal isOpen={isOpen} onClose={onClose} title={transaction?.id ? "Modifier le Mouvement" : "Nouveau Mouvement de Caisse"}>
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
                        <option value="caution">Caution (Dépôt de garantie)</option>
                        <option value="agency_fees">Honoraires Agence</option>
                        <option value="owner_payout">Reversement Propriétaire</option>
                        <option value="bank_deposit">Dépôt Banque</option>
                        <option value="withdrawal">Retrait / Décaissement</option>
                        <option value="supplies">Fournitures / Bureau</option>
                        <option value="maintenance">Maintenance / Travaux</option>
                        <option value="salary">Salaires / Commissions</option>
                        <option value="other">Autre</option>
                    </select>
                </div>

                {/* Warnings / Smart Prompting */}
                {selectedCategory === 'owner_payout' && !watchedOwnerId && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2 shadow-sm animate-pulse">
                        <span className="text-base">💡</span>
                        <div>
                            <span className="font-semibold">Détection :</span> Il s'agit d'un reversement. Veuillez lier un propriétaire pour qu'il apparaisse automatiquement dans son historique et son bilan comptable.
                        </div>
                    </div>
                )}

                {(selectedCategory === 'rent_payment' || selectedCategory === 'caution') && !watchedTenantId && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2 shadow-sm animate-pulse">
                        <span className="text-base">💡</span>
                        <div>
                            <span className="font-semibold">Détection :</span> Il s'agit d'un loyer ou d'une caution. Veuillez lier un locataire pour assurer une comptabilité précise et la traçabilité de ses paiements.
                        </div>
                    </div>
                )}

                {/* Liaisons Optionnelles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700">Propriétaire Lié (Bailleur)</label>
                        <select
                            {...register('related_owner_id')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm bg-white"
                        >
                            <option value="">-- Aucun propriétaire --</option>
                            {owners.map((owner) => (
                                <option key={owner.id} value={owner.id}>
                                    {owner.first_name} {owner.last_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700">Locataire Lié</label>
                        <select
                            {...register('related_tenant_id')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm bg-white"
                        >
                            <option value="">-- Aucun locataire --</option>
                            {tenants.map((tenant) => (
                                <option key={tenant.id} value={tenant.id}>
                                    {tenant.first_name} {tenant.last_name}
                                </option>
                            ))}
                        </select>
                    </div>
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

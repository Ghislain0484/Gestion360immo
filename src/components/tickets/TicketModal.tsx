import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../ui/Modal';
import { toast } from 'react-hot-toast';

interface Property {
    id: string;
    title: string;
    owner_id: string;
}

interface TicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    ticket?: any; // ToDo: Type properly
}

interface TicketFormData {
    title: string;
    description: string;
    property_id: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    cost: number;
    charge_to: 'owner' | 'agency' | 'tenant';
    is_billable: boolean;
}

export const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose, onSuccess, ticket }) => {
    const { user } = useAuth();
    const [properties, setProperties] = React.useState<Property[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<TicketFormData>({
        defaultValues: {
            priority: 'medium',
            cost: 0,
            charge_to: 'owner',
            is_billable: false,
        }
    });

    useEffect(() => {
        if (isOpen) {
            fetchProperties();
            if (ticket) {
                // Populate form if editing
                setValue('title', ticket.title);
                setValue('description', ticket.description);
                setValue('property_id', ticket.property_id);
                setValue('priority', ticket.priority);
                setValue('cost', ticket.cost);
                setValue('charge_to', ticket.charge_to);
                setValue('is_billable', ticket.is_billable);
            } else {
                reset({
                    priority: 'medium',
                    cost: 0,
                    charge_to: 'owner',
                    is_billable: false,
                });
            }
        }
    }, [isOpen, ticket, setValue, reset]);

    const fetchProperties = async () => {
        const { data } = await supabase
            .from('properties')
            .select('id, title, owner_id')
            .eq('agency_id', user?.agency_id)
            .order('title');

        if (data) setProperties(data);
    };

    const onSubmit = async (data: TicketFormData) => {
        setIsLoading(true);
        try {
            const property = properties.find(p => p.id === data.property_id);

            const payload = {
                ...data,
                agency_id: user?.agency_id,
                owner_id: property?.owner_id, // Auto-link owner
                // If creating, set status open/created_by
                ...(ticket ? {} : {
                    status: 'open',
                    created_by: user?.id
                })
            };

            if (ticket) {
                const { error } = await supabase
                    .from('tickets')
                    .update(payload)
                    .eq('id', ticket.id);
                if (error) throw error;
                toast.success('Ticket mis à jour');
            } else {
                const { error } = await supabase
                    .from('tickets')
                    .insert([payload]);
                if (error) throw error;
                toast.success('Ticket créé avec succès');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving ticket:', error);
            toast.error('Erreur lors de l\'enregistrement');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={ticket ? "Modifier le ticket" : "Nouveau ticket / État des lieux"}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Titre</label>
                    <input
                        type="text"
                        {...register('title', { required: 'Le titre est requis' })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="Ex: Fuite d'eau SDB"
                    />
                    {errors.title && <span className="text-red-500 text-xs">{errors.title.message}</span>}
                </div>

                {/* Property */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Propriété concernée</label>
                    <select
                        {...register('property_id', { required: 'La propriété est requise' })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                        <option value="">Sélectionner une propriété</option>
                        {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>
                    {errors.property_id && <span className="text-red-500 text-xs">{errors.property_id.message}</span>}
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        {...register('description')}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="Détails de l'intervention ou de l'état des lieux..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Priority */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Priorité</label>
                        <select
                            {...register('priority')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        >
                            <option value="low">Basse</option>
                            <option value="medium">Moyenne</option>
                            <option value="high">Haute</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </div>

                    {/* Cost */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Coût estimé (FCFA)</label>
                        <input
                            type="number"
                            {...register('cost', { min: 0 })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                    </div>
                </div>

                {/* Financials Logic */}
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <AlertCircle size={16} /> Imputation des charges
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase">À la charge de</label>
                            <select
                                {...register('charge_to')}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            >
                                <option value="owner">Propriétaire</option>
                                <option value="agency">Agence</option>
                                <option value="tenant">Locataire</option>
                            </select>
                        </div>

                        <div className="flex items-center pt-5">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    {...register('is_billable')}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-700">Facturable ?</span>
                            </label>
                        </div>
                    </div>
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
                        {isLoading ? 'Enregistrement...' : (ticket ? 'Mettre à jour' : 'Créer le ticket')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

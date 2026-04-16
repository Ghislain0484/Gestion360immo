import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatformSettings } from '../../hooks/useAdminQueries';
import { Modal } from '../ui/Modal';
import { toast } from 'react-hot-toast';
import { Building2, User, Calculator, Info } from 'lucide-react';
import { Property } from '../../types/properties';
import { Tenant } from '../../types/tenants';

interface TenantCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface CollectionFormData {
    property_id: string;
    tenant_id: string;
    monthly_rent: number;
    caution_months: number;
    advance_months: number;
    agency_months: number;
    payment_method: string;
    transaction_date: string;
}

export const TenantCollectionModal: React.FC<TenantCollectionModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const { data: platformSettings } = usePlatformSettings();
    const [isLoading, setIsLoading] = useState(false);
    const [properties, setProperties] = useState<Property[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);

    const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<CollectionFormData>({
        defaultValues: {
            caution_months: 2,
            advance_months: 2,
            agency_months: 1,
            payment_method: 'cash',
            transaction_date: new Date().toISOString().split('T')[0]
        }
    });

    const selectedPropertyId = watch('property_id');
    const monthlyRent = watch('monthly_rent') || 0;
    const cautionMonths = watch('caution_months') || 0;
    const advanceMonths = watch('advance_months') || 0;
    const agencyMonths = watch('agency_months') || 0;

    // Calculations
    const cautionAmount = monthlyRent * cautionMonths;
    const advanceAmount = monthlyRent * advanceMonths;
    const agencyAmount = monthlyRent * agencyMonths;
    const totalAmount = cautionAmount + advanceAmount + agencyAmount;

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        if (!user?.agency_id) return;
        try {
            const [propsRes, tenantsRes] = await Promise.all([
                supabase.from('properties').select('*').eq('agency_id', user.agency_id).order('title'),
                supabase.from('tenants').select('*').eq('agency_id', user.agency_id).order('first_name')
            ]);
            if (propsRes.data) setProperties(propsRes.data);
            if (tenantsRes.data) setTenants(tenantsRes.data);
        } catch (err) {
            console.error('Error fetching data:', err);
        }
    };

    useEffect(() => {
        const prop = properties.find(p => p.id === selectedPropertyId);
        if (prop?.monthly_rent) {
            setValue('monthly_rent', prop.monthly_rent);
        }
    }, [selectedPropertyId, properties, setValue]);

    const onSubmit = async (data: CollectionFormData) => {
        setIsLoading(true);
        try {
            const selectedProp = properties.find(p => p.id === data.property_id);
            const selectedTenant = tenants.find(t => t.id === data.tenant_id);

            // Fetch contract to get commission rate
            const { data: contract } = await supabase
                .from('contracts')
                .select('id, commission_rate, start_date')
                .eq('property_id', data.property_id)
                .eq('tenant_id', data.tenant_id)
                .eq('status', 'active')
                .maybeSingle();

            const commissionRate = contract?.commission_rate || 10;
            const tvaRate = platformSettings?.finance_tva_rate || 20;
            const airsiRate = platformSettings?.finance_airsi_rate || 2;

            const ownerRentPart = advanceAmount * (1 - commissionRate / 100);

            // Create 3 Transactions
            const transactions = [
                {
                    agency_id: user?.agency_id,
                    created_by: user?.id,
                    type: 'credit',
                    amount: cautionAmount,
                    category: 'caution',
                    description: `Caution (${data.caution_months} mois) - ${selectedProp?.title} - ${selectedTenant?.first_name} ${selectedTenant?.last_name}`,
                    transaction_date: data.transaction_date,
                    payment_method: data.payment_method,
                    related_owner_id: selectedProp?.owner_id,
                    related_property_id: data.property_id,
                    related_tenant_id: data.tenant_id
                },
                {
                    agency_id: user?.agency_id,
                    created_by: user?.id,
                    type: 'credit',
                    amount: advanceAmount,
                    category: 'rent_payment',
                    description: `Avance Loyer (${data.advance_months} mois) [Part Proprio: ${ownerRentPart}] - ${selectedProp?.title} - ${selectedTenant?.first_name} ${selectedTenant?.last_name}`,
                    transaction_date: data.transaction_date,
                    payment_method: data.payment_method,
                    related_owner_id: selectedProp?.owner_id,
                    related_property_id: data.property_id,
                    related_tenant_id: data.tenant_id
                },
                {
                    agency_id: user?.agency_id,
                    created_by: user?.id,
                    type: 'credit',
                    amount: agencyAmount,
                    category: 'agency_fees',
                    description: `Honoraires Agence (${data.agency_months} mois) - ${selectedProp?.title} - ${selectedTenant?.first_name} ${selectedTenant?.last_name}`,
                    transaction_date: data.transaction_date,
                    payment_method: data.payment_method,
                    related_owner_id: selectedProp?.owner_id,
                    related_property_id: data.property_id,
                    related_tenant_id: data.tenant_id
                }
            ].filter(t => t.amount > 0);

            const { error: transError } = await supabase.from('modular_transactions').insert(transactions);
            if (transError) throw transError;

            // Update Tenant Next Payment Date in Contract
            if (data.advance_months > 0 && contract) {
                const start = new Date(contract.start_date);
                start.setMonth(start.getMonth() + Number(data.advance_months));
                await supabase
                    .from('contracts')
                    .update({ next_payment_date: start.toISOString().split('T')[0] })
                    .eq('id', contract.id);
            }

            toast.success('Encaissement global réussi !');
            reset();
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error in global collection:', error);
            toast.error('Erreur lors de l\'enregistrement');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Encaissement Global Nouveau Locataire" size="xl">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Property & Tenant */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2 mb-1">
                                <Building2 className="w-4 h-4 text-primary-500" /> Propriété
                            </label>
                            <select
                                {...register('property_id', { required: 'Veuillez choisir une propriété' })}
                                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="">Choisir une propriété</option>
                                {properties.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.title} - {p.location.commune} ({p.monthly_rent?.toLocaleString()} FCFA) {!p.is_available ? ' - (Occupée)' : ''}
                                    </option>
                                ))}
                            </select>
                            {errors.property_id && <p className="text-red-500 text-xs mt-1">{errors.property_id.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-primary-500" /> Locataire
                            </label>
                            <select
                                {...register('tenant_id', { required: 'Veuillez choisir un locataire' })}
                                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="">Sélectionner le locataire</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                                ))}
                            </select>
                            {errors.tenant_id && <p className="text-red-500 text-xs mt-1">{errors.tenant_id.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Loyer Mensuel Négocié (FCFA)</label>
                            <input
                                type="number"
                                {...register('monthly_rent', { required: true, min: 1 })}
                                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-bold"
                            />
                        </div>
                    </div>

                    {/* Breakdown Params */}
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                        <h4 className="flex items-center gap-2 font-bold text-gray-800 text-sm uppercase tracking-wider">
                            <Calculator className="w-4 h-4" /> Détail du Pack
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Caution (Mois)</label>
                                <input type="number" {...register('caution_months')} className="w-full rounded-lg border-gray-200" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Montant Caution</label>
                                <div className="p-2 bg-white border border-gray-200 rounded-lg font-bold text-slate-800">
                                    {cautionAmount.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Avance Loyer (Mois)</label>
                                <input type="number" {...register('advance_months')} className="w-full rounded-lg border-gray-200" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Montant Loyer</label>
                                <div className="p-2 bg-white border border-gray-200 rounded-lg font-bold text-slate-800">
                                    {advanceAmount.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Agence (Mois)</label>
                                <input type="number" {...register('agency_months')} className="w-full rounded-lg border-gray-200" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Honoraires</label>
                                <div className="p-2 bg-white border border-gray-200 rounded-lg font-bold text-slate-800">
                                    {agencyAmount.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary & Submission */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-gray-100">
                    <div className="bg-primary-50 px-6 py-4 rounded-2xl border border-primary-100 flex items-center gap-6">
                        <div>
                            <p className="text-xs text-primary-600 font-bold uppercase">Total à Encaisser</p>
                            <p className="text-3xl font-black text-primary-700">{totalAmount.toLocaleString()} <span className="text-sm font-normal">FCFA</span></p>
                        </div>
                        <div className="h-10 w-[1px] bg-primary-200 hidden md:block"></div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-sm">
                                <label className="text-gray-600">Mode :</label>
                                <select {...register('payment_method')} className="bg-transparent border-none p-0 font-bold text-primary-800 focus:ring-0">
                                    <option value="cash">Espèces</option>
                                    <option value="bank_transfer">Virement</option>
                                    <option value="mobile_money">Mobile Money</option>
                                    <option value="check">Chèque</option>
                                </select>
                            </div>
                            <input type="date" {...register('transaction_date')} className="bg-transparent border-none p-0 text-xs text-primary-600 focus:ring-0" />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || totalAmount <= 0}
                            className="btn-premium px-8 py-3 shadow-lg shadow-primary-500/20 disabled:opacity-50"
                        >
                            {isLoading ? 'Enregistrement...' : 'Confirmer l\'Encaissement'}
                        </button>
                    </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-gray-500 bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p>Cette action créera automatiquement les mouvements de caisse pour la caution, les loyers d'avance et les honoraires d'agence. Ces montants seront visibles dans votre journal de caisse.</p>
                </div>
            </form>
        </Modal>
    );
};

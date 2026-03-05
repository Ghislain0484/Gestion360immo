import React, { useState, useCallback } from 'react';
import AsyncSelect from 'react-select/async';
import { Building2, Link, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { Property, Tenant } from '../../types/db';
import { toast } from 'react-hot-toast';

interface LinkTenantToPropertyModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenant: Tenant;
    onLinked: () => void;
}

export const LinkTenantToPropertyModal: React.FC<LinkTenantToPropertyModalProps> = ({
    isOpen,
    onClose,
    tenant,
    onLinked,
}) => {
    const { user } = useAuth();
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [monthlyRent, setMonthlyRent] = useState('');
    const [deposit, setDeposit] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [propertyOccupied, setPropertyOccupied] = useState(false);
    const [checkingProperty, setCheckingProperty] = useState(false);

    const loadPropertyOptions = useCallback(async (inputValue: string) => {
        if (!user?.agency_id) return [];
        try {
            return await dbService.properties.getAll({
                agency_id: user.agency_id,
                search: inputValue,
                limit: 20,
            });
        } catch {
            return [];
        }
    }, [user?.agency_id]);

    const handlePropertySelect = async (prop: Property | null) => {
        setSelectedProperty(prop);
        setPropertyOccupied(false);
        setError(null);
        if (prop?.monthly_rent) {
            setMonthlyRent(String(prop.monthly_rent));
            setDeposit(String(prop.monthly_rent * 2));
        }
        if (prop && user?.agency_id) {
            setCheckingProperty(true);
            try {
                const existingContracts = await dbService.contracts.getAll({
                    property_id: prop.id,
                    status: 'active',
                    type: 'location',
                });
                if (existingContracts.length > 0) setPropertyOccupied(true);
            } catch {
                // ignore
            } finally {
                setCheckingProperty(false);
            }
        }
    };

    const handleSubmit = async () => {
        if (!selectedProperty) { setError('Veuillez sélectionner un bien.'); return; }
        if (propertyOccupied) { setError('Ce bien a déjà un locataire actif.'); return; }
        if (!monthlyRent || parseFloat(monthlyRent) <= 0) { setError('Veuillez saisir un loyer mensuel valide.'); return; }
        if (!user?.agency_id) return;

        setSubmitting(true);
        setError(null);
        const toastId = toast.loading('Rattachement en cours…');

        try {
            const property = await dbService.properties.getById(selectedProperty.id, user.agency_id);
            if (!property.owner_id) {
                throw new Error('Ce bien n\'a pas de propriétaire associé. Veuillez en assigner un d\'abord.');
            }

            // Guard: double-check no concurrent assignment
            const existingContracts = await dbService.contracts.getAll({ property_id: selectedProperty.id, status: 'active', type: 'location' });
            if (existingContracts.length > 0) {
                throw new Error('Ce bien a déjà un locataire actif. Veuillez d\'abord résilier le contrat en cours.');
            }

            const contractPayload = {
                agency_id: user.agency_id,
                property_id: selectedProperty.id,
                owner_id: property.owner_id,
                tenant_id: tenant.id,
                type: 'location' as const,
                status: 'active' as const,
                start_date: startDate,
                monthly_rent: parseFloat(monthlyRent),
                deposit: parseFloat(deposit) || 0,
                commission_rate: 10,
                commission_amount: (parseFloat(monthlyRent) * 10) / 100,
                terms: `Contrat de bail - ${tenant.first_name} ${tenant.last_name} - ${selectedProperty.title}`,
                documents: [],
            };
            await dbService.contracts.create(contractPayload);
            await dbService.properties.update(selectedProperty.id, { is_available: false });

            toast.success(`${tenant.first_name} ${tenant.last_name} rattaché(e) à "${selectedProperty.title}" avec succès !`, { id: toastId });
            onLinked();
            onClose();
        } catch (err: any) {
            console.error(err);
            toast.error('Erreur : ' + (err.message || 'Impossible de créer le contrat'), { id: toastId });
            setError(err.message || 'Erreur inconnue');
        } finally {
            setSubmitting(false);
        }
    };

    const selectStyles = {
        control: (base: any) => ({
            ...base, borderColor: '#e5e7eb', borderRadius: '0.75rem', padding: '2px',
            '&:hover': { borderColor: '#3b82f6' }, boxShadow: 'none',
        }),
        menu: (base: any) => ({ ...base, borderRadius: '0.75rem', zIndex: 9999, boxShadow: '0 10px 25px -3px rgba(0,0,0,0.1)' }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
            color: state.isSelected ? 'white' : '#111827',
        }),
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Link className="w-5 h-5 text-blue-600" />
                    <span>Attribuer un bien</span>
                </div>
            }
            size="md"
        >
            <div className="space-y-5">
                {/* Tenant recap */}
                <Card className="p-4 bg-blue-50 border-blue-100">
                    <p className="text-sm text-blue-700 font-medium">
                        Locataire : <span className="font-bold">{tenant.first_name} {tenant.last_name}</span>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                        Un contrat de location actif sera créé pour ce locataire.
                    </p>
                </Card>

                {/* Occupied warning */}
                {propertyOccupied && (
                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-sm">Bien déjà occupé</p>
                            <p className="text-sm mt-0.5">Ce bien a déjà un locataire actif. Veuillez d'abord résilier le contrat en cours.</p>
                        </div>
                    </div>
                )}

                {error && !propertyOccupied && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
                )}

                {/* Property selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Building2 className="inline w-4 h-4 mr-1 text-gray-500" />
                        Sélectionner le bien
                        {checkingProperty && <span className="ml-2 text-xs text-blue-500 animate-pulse">Vérification…</span>}
                    </label>
                    <AsyncSelect<Property, false>
                        cacheOptions
                        defaultOptions
                        loadOptions={loadPropertyOptions}
                        getOptionLabel={(p) => `${p.title} — ${p.location?.commune}, ${p.location?.quartier}`}
                        getOptionValue={(p) => p.id}
                        value={selectedProperty}
                        onChange={handlePropertySelect}
                        placeholder="Rechercher un bien…"
                        styles={selectStyles}
                        isClearable
                    />
                </div>

                {/* Rental terms — hidden if occupied */}
                {!propertyOccupied && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <DollarSign className="inline w-4 h-4 mr-1 text-gray-500" />
                                    Loyer mensuel (FCFA)
                                </label>
                                <Input type="number" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} placeholder="Ex: 150000" min={0} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Caution (FCFA)</label>
                                <Input type="number" value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="Ex: 300000" min={0} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="inline w-4 h-4 mr-1 text-gray-500" />
                                Date d'entrée
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                    </>
                )}

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>Annuler</Button>
                    <Button onClick={handleSubmit} disabled={submitting || !selectedProperty || propertyOccupied || checkingProperty}>
                        <Link className="w-4 h-4 mr-2" />
                        {submitting ? 'Rattachement…' : 'Rattacher au bien'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

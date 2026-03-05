import React, { useState, useCallback } from 'react';
import AsyncSelect from 'react-select/async';
import { Building2, Link, DollarSign, Calendar, UserPlus, Users, Search, ChevronRight, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { Property, Tenant } from '../../types/db';
import { toast } from 'react-hot-toast';
import { validatePhoneCI } from '../../utils/validationUtils';

interface AssignTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    preSelectedProperty?: Property | null;
    onSuccess: () => void;
}

type Mode = 'existing' | 'new';

export const AssignTenantModal: React.FC<AssignTenantModalProps> = ({
    isOpen,
    onClose,
    preSelectedProperty,
    onSuccess,
}) => {
    const { user } = useAuth();
    const [mode, setMode] = useState<Mode>('existing');
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [newTenant, setNewTenant] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        address: '',
        city: '',
        profession: '',
        nationality: 'Ivoirienne',
        payment_status: 'bon' as const,
        marital_status: 'celibataire' as const,
    });
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(preSelectedProperty ?? null);
    const [monthlyRent, setMonthlyRent] = useState(
        preSelectedProperty?.monthly_rent ? String(preSelectedProperty.monthly_rent) : ''
    );
    const [deposit, setDeposit] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Track if selected property already has an active tenant
    const [propertyOccupied, setPropertyOccupied] = useState(false);
    const [checkingProperty, setCheckingProperty] = useState(false);

    // ─── AsyncSelect styles ─────────────────────────────────────────────────
    const selectStyles = {
        control: (base: any) => ({
            ...base, borderColor: '#e5e7eb', borderRadius: '0.75rem', padding: '2px',
            '&:hover': { borderColor: '#3b82f6' },
            boxShadow: 'none',
        }),
        menu: (base: any) => ({ ...base, borderRadius: '0.75rem', zIndex: 9999, boxShadow: '0 10px 25px -3px rgba(0,0,0,0.1)' }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
            color: state.isSelected ? 'white' : '#111827',
            borderRadius: '0.375rem',
            margin: '2px 4px',
            width: 'calc(100% - 8px)',
        }),
    };

    // ─── Loaders ────────────────────────────────────────────────────────────
    const loadTenantOptions = useCallback(async (inputValue: string) => {
        if (!user?.agency_id) return [];
        try {
            return await dbService.tenants.getAll({ agency_id: user.agency_id, search: inputValue, limit: 20 });
        } catch { return []; }
    }, [user?.agency_id]);

    const loadPropertyOptions = useCallback(async (inputValue: string) => {
        if (!user?.agency_id) return [];
        try {
            return await dbService.properties.getAll({ agency_id: user.agency_id, search: inputValue, limit: 20 });
        } catch { return []; }
    }, [user?.agency_id]);

    // ─── Property select handler — checks for existing active contract ───────
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
                });
                if (existingContracts.length > 0) {
                    setPropertyOccupied(true);
                }
            } catch {
                // ignore check error
            } finally {
                setCheckingProperty(false);
            }
        }
    };

    // ─── Validation ─────────────────────────────────────────────────────────
    const validate = (): string | null => {
        if (!selectedProperty) return 'Veuillez sélectionner un bien.';
        if (propertyOccupied) return 'Ce bien a déjà un locataire actif. Veuillez d\'abord résilier le contrat en cours.';
        if (!monthlyRent || parseFloat(monthlyRent) <= 0) return 'Veuillez saisir un loyer mensuel valide.';
        if (!startDate) return 'Veuillez saisir la date d\'entrée.';
        if (mode === 'existing') {
            if (!selectedTenant) return 'Veuillez sélectionner un locataire existant.';
        } else {
            if (!newTenant.first_name.trim()) return 'Prénom requis.';
            if (!newTenant.last_name.trim()) return 'Nom requis.';
            if (!newTenant.phone.trim()) return 'Téléphone requis.';
            if (!validatePhoneCI(newTenant.phone)) return 'Format de téléphone invalide (ex: 0708090102).';
            if (!newTenant.address.trim()) return 'Adresse requise.';
            if (!newTenant.city.trim()) return 'Ville requise.';
        }
        return null;
    };

    // ─── Submit ──────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        const validationError = validate();
        if (validationError) { setError(validationError); return; }
        if (!user?.agency_id) return;

        setSubmitting(true);
        setError(null);
        const toastId = toast.loading('Rattachement en cours…');

        try {
            const property = await dbService.properties.getById(selectedProperty!.id, user.agency_id);
            if (!property.owner_id) {
                throw new Error('Ce bien n\'a pas de propriétaire associé. Veuillez en assigner un d\'abord.');
            }

            let tenant: Tenant;
            if (mode === 'existing') {
                tenant = selectedTenant!;
            } else {
                const createdTenant = await dbService.tenants.create({
                    ...newTenant,
                    agency_id: user.agency_id,
                });
                tenant = createdTenant;
                toast.success(`Locataire ${tenant.first_name} ${tenant.last_name} créé !`);
            }

            // Double-check (guard against race conditions)
            const existingContracts = await dbService.contracts.getAll({
                property_id: property.id,
                status: 'active',
            });
            if (existingContracts.length > 0) {
                throw new Error('Ce bien a déjà un locataire actif. Veuillez d\'abord résilier le contrat en cours.');
            }

            const contractPayload = {
                agency_id: user.agency_id,
                property_id: property.id,
                owner_id: property.owner_id,
                tenant_id: tenant.id,
                type: 'location' as const,
                status: 'active' as const,
                start_date: startDate,
                monthly_rent: parseFloat(monthlyRent),
                deposit: parseFloat(deposit) || 0,
                commission_rate: 10,
                commission_amount: (parseFloat(monthlyRent) * 10) / 100,
                terms: `Contrat de bail — ${tenant.first_name} ${tenant.last_name} — ${property.title}`,
                documents: [],
            };
            await dbService.contracts.create(contractPayload);
            await dbService.properties.update(property.id, { is_available: false });

            toast.success(
                `${tenant.first_name} ${tenant.last_name} rattaché(e) à "${property.title}" avec succès !`,
                { id: toastId }
            );
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            const msg = err.message || 'Impossible de créer le contrat';
            toast.error('Erreur : ' + msg, { id: toastId });
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Reset when modal opens ───────────────────────────────────────────────
    React.useEffect(() => {
        if (isOpen) {
            setMode('existing');
            setSelectedTenant(null);
            setNewTenant({ first_name: '', last_name: '', phone: '', address: '', city: '', profession: '', nationality: 'Ivoirienne', payment_status: 'bon', marital_status: 'celibataire' });
            setSelectedProperty(preSelectedProperty ?? null);
            setMonthlyRent(preSelectedProperty?.monthly_rent ? String(preSelectedProperty.monthly_rent) : '');
            setDeposit(preSelectedProperty?.monthly_rent ? String(preSelectedProperty.monthly_rent * 2) : '');
            setStartDate(new Date().toISOString().split('T')[0]);
            setError(null);
            setPropertyOccupied(false);

            // If a property is pre-selected, check if it's already occupied
            if (preSelectedProperty && user?.agency_id) {
                setCheckingProperty(true);
                dbService.contracts.getAll({ property_id: preSelectedProperty.id, status: 'active' })
                    .then(contracts => { if (contracts.length > 0) setPropertyOccupied(true); })
                    .catch(() => { })
                    .finally(() => setCheckingProperty(false));
            }
        }
    }, [isOpen, preSelectedProperty]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Link className="w-5 h-5 text-blue-600" />
                    <span>Attribuer un locataire</span>
                </div>
            }
            size="md"
        >
            <div className="space-y-5">
                {/* Property occupied banner */}
                {propertyOccupied && (
                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-sm">Bien déjà occupé</p>
                            <p className="text-sm mt-0.5">Ce bien a déjà un locataire actif. Veuillez d'abord résilier le contrat en cours avant d'attribuer un nouveau locataire.</p>
                        </div>
                    </div>
                )}

                {/* General error (non-occupied) */}
                {error && !propertyOccupied && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
                        <span className="text-red-500 font-bold">✕</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* Property display / selector */}
                {preSelectedProperty ? (
                    <Card className="p-4 bg-blue-50 border border-blue-100">
                        <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">Bien sélectionné</p>
                        <p className="font-bold text-blue-900">{preSelectedProperty.title}</p>
                        <p className="text-sm text-blue-700">{preSelectedProperty.location?.commune}, {preSelectedProperty.location?.quartier}</p>
                    </Card>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Building2 className="inline w-4 h-4 mr-1 text-gray-500" />
                            Sélectionner le bien
                            {checkingProperty && <span className="ml-2 text-xs text-blue-500 animate-pulse">Vérification…</span>}
                        </label>
                        <AsyncSelect<Property, false>
                            cacheOptions defaultOptions
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
                )}

                {/* Mode toggle */}
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                    <button
                        onClick={() => setMode('existing')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mode === 'existing'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Search className="w-4 h-4" />
                        Locataire existant
                    </button>
                    <button
                        onClick={() => setMode('new')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mode === 'new'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <UserPlus className="w-4 h-4" />
                        Nouveau locataire
                    </button>
                </div>

                {/* Existing tenant selection */}
                {mode === 'existing' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Users className="inline w-4 h-4 mr-1 text-gray-500" />
                            Choisir un locataire
                        </label>
                        <AsyncSelect<Tenant, false>
                            cacheOptions defaultOptions
                            loadOptions={loadTenantOptions}
                            getOptionLabel={(t) => `${t.first_name} ${t.last_name} — ${t.phone}`}
                            getOptionValue={(t) => t.id}
                            value={selectedTenant}
                            onChange={(t) => setSelectedTenant(t)}
                            placeholder="Rechercher par nom ou téléphone…"
                            styles={selectStyles}
                            noOptionsMessage={() => 'Aucun résultat — essayez un autre terme'}
                            isClearable
                        />
                    </div>
                )}

                {/* New tenant form */}
                {mode === 'new' && (
                    <Card className="p-4 space-y-3 border border-blue-100 bg-blue-50/30">
                        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-blue-600" />
                            Informations du nouveau locataire
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Prénom *"
                                value={newTenant.first_name}
                                onChange={(e) => setNewTenant(p => ({ ...p, first_name: e.target.value }))}
                                placeholder="Jean"
                            />
                            <Input
                                label="Nom *"
                                value={newTenant.last_name}
                                onChange={(e) => setNewTenant(p => ({ ...p, last_name: e.target.value }))}
                                placeholder="Dupont"
                            />
                        </div>
                        <Input
                            label="Téléphone *"
                            value={newTenant.phone}
                            onChange={(e) => setNewTenant(p => ({ ...p, phone: e.target.value }))}
                            placeholder="0708090102"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Adresse *"
                                value={newTenant.address}
                                onChange={(e) => setNewTenant(p => ({ ...p, address: e.target.value }))}
                                placeholder="Rue de la Paix"
                            />
                            <Input
                                label="Ville *"
                                value={newTenant.city}
                                onChange={(e) => setNewTenant(p => ({ ...p, city: e.target.value }))}
                                placeholder="Abidjan"
                            />
                        </div>
                        <Input
                            label="Profession"
                            value={newTenant.profession}
                            onChange={(e) => setNewTenant(p => ({ ...p, profession: e.target.value }))}
                            placeholder="Commerçant"
                        />
                    </Card>
                )}

                {/* Rental terms — only shown if property is not occupied */}
                {!propertyOccupied && (
                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-gray-700">Conditions du bail</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    <DollarSign className="inline w-3 h-3 mr-1" />
                                    Loyer mensuel (FCFA) *
                                </label>
                                <Input
                                    type="number"
                                    value={monthlyRent}
                                    onChange={(e) => {
                                        setMonthlyRent(e.target.value);
                                        if (!deposit) setDeposit(String(parseFloat(e.target.value || '0') * 2));
                                    }}
                                    placeholder="150 000"
                                    min={0}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Caution (FCFA)</label>
                                <Input
                                    type="number"
                                    value={deposit}
                                    onChange={(e) => setDeposit(e.target.value)}
                                    placeholder="300 000"
                                    min={0}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                <Calendar className="inline w-3 h-3 mr-1" />
                                Date d'entrée *
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        Annuler
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || propertyOccupied || checkingProperty}>
                        <ChevronRight className="w-4 h-4 mr-2" />
                        {submitting ? 'En cours…' : 'Valider le rattachement'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

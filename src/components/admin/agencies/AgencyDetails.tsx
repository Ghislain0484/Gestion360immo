import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Phone, Mail, Calendar, Users, Home, FileText, DollarSign, X, Edit, Save } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Agency } from '../../../types/db';
import { dbService } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { usePlatformSettings } from '../../../hooks/useAdminQueries';

interface AgencyDetailsProps {
    agency: Agency;
    onClose: () => void;
    onUpdate?: () => void;
}

interface AgencyStats {
    totalProperties: number;
    totalTenants: number;
    totalContracts: number;
    monthlyRevenue: number;
}

export const AgencyDetails: React.FC<AgencyDetailsProps> = ({ agency, onClose, onUpdate }) => {
    const [stats, setStats] = useState<AgencyStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);

    // Charger les tarifs depuis platform_settings
    const { data: settings } = usePlatformSettings();

    // État du formulaire
    const [formData, setFormData] = useState({
        name: agency.name,
        city: agency.city,
        phone: agency.phone,
        email: agency.email,
        address: agency.address || '',
        commercial_register: agency.commercial_register || '',
        plan_type: agency.plan_type || 'basic',
        monthly_fee: agency.monthly_fee || 25000,
    });

    useEffect(() => {
        fetchAgencyStats();
    }, [agency.id]);

    const fetchAgencyStats = async () => {
        try {
            setLoading(true);
            const [properties, tenants, contracts] = await Promise.all([
                dbService.properties.getAll({ agency_id: agency.id }),
                dbService.tenants.getAll({ agency_id: agency.id }),
                dbService.contracts.getAll({ agency_id: agency.id }),
            ]);

            setStats({
                totalProperties: properties?.length || 0,
                totalTenants: tenants?.length || 0,
                totalContracts: contracts?.length || 0,
                monthlyRevenue: agency.monthly_fee || 0,
            });
        } catch (error: any) {
            console.error('Erreur lors du chargement des statistiques:', error);
            toast.error('Impossible de charger les statistiques');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            await dbService.agencies.update(agency.id, {
                name: formData.name,
                city: formData.city,
                phone: formData.phone,
                email: formData.email,
                address: formData.address,
                commercial_register: formData.commercial_register,
                plan_type: formData.plan_type as any,
                monthly_fee: formData.monthly_fee,
            });

            toast.success('Agence modifiée avec succès');
            setEditMode(false);
            onUpdate?.();
        } catch (error: any) {
            console.error('Erreur lors de la modification:', error);
            toast.error('Erreur lors de la modification de l\'agence');
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0,
        }).format(amount);

    const getStatusBadge = (status: string) => {
        const variants: Record<string, any> = {
            active: { variant: 'success', label: 'Active' },
            suspended: { variant: 'warning', label: 'Suspendue' },
            trial: { variant: 'secondary', label: 'Essai' },
            cancelled: { variant: 'danger', label: 'Annulée' },
        };
        const config = variants[status] || { variant: 'secondary', label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
                            <Building2 className="h-7 w-7 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{agency.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                {agency.subscription_status && getStatusBadge(agency.subscription_status)}
                                {agency.plan_type && (
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-medium">
                                        {agency.plan_type.charAt(0).toUpperCase() + agency.plan_type.slice(1)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Informations générales */}
                    <Card>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Informations générales</h3>
                                {!editMode && (
                                    <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Modifier
                                    </Button>
                                )}
                            </div>

                            {editMode ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Nom de l'agence
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Ville
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.city}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Téléphone
                                            </label>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Adresse
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Registre de commerce
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.commercial_register}
                                                onChange={(e) => setFormData({ ...formData, commercial_register: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Plan d'abonnement
                                            </label>
                                            <select
                                                value={formData.plan_type}
                                                onChange={(e) => {
                                                    const plan = e.target.value as 'basic' | 'premium' | 'enterprise';
                                                    const fees = {
                                                        basic: settings?.subscription_basic_price || 25000,
                                                        premium: settings?.subscription_premium_price || 35000,
                                                        enterprise: settings?.subscription_enterprise_price || 50000
                                                    };
                                                    setFormData({
                                                        ...formData,
                                                        plan_type: plan,
                                                        monthly_fee: fees[plan]
                                                    });
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="basic">Basic ({new Intl.NumberFormat('fr-FR').format(settings?.subscription_basic_price || 25000)} FCFA)</option>
                                                <option value="premium">Premium ({new Intl.NumberFormat('fr-FR').format(settings?.subscription_premium_price || 35000)} FCFA)</option>
                                                <option value="enterprise">Enterprise ({new Intl.NumberFormat('fr-FR').format(settings?.subscription_enterprise_price || 50000)} FCFA)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Frais mensuels (FCFA)
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.monthly_fee}
                                                onChange={(e) => setFormData({ ...formData, monthly_fee: Number(e.target.value) })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                        <div>
                                            <p className="text-gray-500">Ville</p>
                                            <p className="font-medium text-gray-900">{agency.city}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <div>
                                            <p className="text-gray-500">Téléphone</p>
                                            <p className="font-medium text-gray-900">{agency.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <div>
                                            <p className="text-gray-500">Email</p>
                                            <p className="font-medium text-gray-900">{agency.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                        <div>
                                            <p className="text-gray-500">Date d'inscription</p>
                                            <p className="font-medium text-gray-900">
                                                {new Date(agency.created_at).toLocaleDateString('fr-FR')}
                                            </p>
                                        </div>
                                    </div>
                                    {agency.commercial_register && (
                                        <div className="flex items-center gap-2 col-span-2">
                                            <FileText className="h-4 w-4 text-gray-400" />
                                            <div>
                                                <p className="text-gray-500">Registre de commerce</p>
                                                <p className="font-medium text-gray-900">{agency.commercial_register}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Statistiques */}
                    {loading ? (
                        <div className="grid grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <Card key={i} className="animate-pulse">
                                    <div className="p-4 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-16" />
                                        <div className="h-6 bg-gray-200 rounded w-12" />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : stats ? (
                        <div className="grid grid-cols-4 gap-4">
                            <Card className="bg-blue-50 border-blue-200">
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Home className="h-5 w-5 text-blue-600" />
                                        <p className="text-xs font-semibold text-blue-900">Propriétés</p>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-900">{stats.totalProperties}</p>
                                </div>
                            </Card>
                            <Card className="bg-green-50 border-green-200">
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users className="h-5 w-5 text-green-600" />
                                        <p className="text-xs font-semibold text-green-900">Locataires</p>
                                    </div>
                                    <p className="text-2xl font-bold text-green-900">{stats.totalTenants}</p>
                                </div>
                            </Card>
                            <Card className="bg-purple-50 border-purple-200">
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="h-5 w-5 text-purple-600" />
                                        <p className="text-xs font-semibold text-purple-900">Contrats</p>
                                    </div>
                                    <p className="text-2xl font-bold text-purple-900">{stats.totalContracts}</p>
                                </div>
                            </Card>
                            <Card className="bg-emerald-50 border-emerald-200">
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <DollarSign className="h-5 w-5 text-emerald-600" />
                                        <p className="text-xs font-semibold text-emerald-900">Abonnement</p>
                                    </div>
                                    <p className="text-lg font-bold text-emerald-900">{formatCurrency(formData.monthly_fee)}</p>
                                </div>
                            </Card>
                        </div>
                    ) : null}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        {editMode ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setEditMode(false);
                                        setFormData({
                                            name: agency.name,
                                            city: agency.city,
                                            phone: agency.phone,
                                            email: agency.email,
                                            address: agency.address || '',
                                            commercial_register: agency.commercial_register || '',
                                            plan_type: agency.plan_type || 'basic',
                                            monthly_fee: agency.monthly_fee || 25000,
                                        });
                                    }}
                                    className="flex-1"
                                    disabled={saving}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleSave}
                                    className="flex-1"
                                    isLoading={saving}
                                    disabled={saving}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    Enregistrer
                                </Button>
                            </>
                        ) : (
                            <Button variant="outline" onClick={onClose} className="flex-1">
                                Fermer
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

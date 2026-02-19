import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Plus, Edit, Save, X } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { usePlatformSettings, useUpdatePlatformSetting } from '../../../hooks/useAdminQueries';

interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    features: string[];
    maxProperties: number;
    maxUsers: number;
    isPopular?: boolean;
}

export const SubscriptionPlans: React.FC = () => {
    const { data: settings, isLoading } = usePlatformSettings();
    const updateSetting = useUpdatePlatformSetting();

    const [editingPlan, setEditingPlan] = useState<string | null>(null);
    const [editPrice, setEditPrice] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);

    const plans: SubscriptionPlan[] = useMemo(
        () => [
            {
                id: 'basic',
                name: 'Basic',
                price: settings?.subscription_basic_price || 25000,
                maxProperties: 10,
                maxUsers: 2,
                features: [
                    'Gestion de 10 propriétés',
                    '2 utilisateurs',
                    'Support email',
                    'Rapports mensuels',
                ],
            },
            {
                id: 'premium',
                name: 'Premium',
                price: settings?.subscription_premium_price || 35000,
                maxProperties: 50,
                maxUsers: 5,
                isPopular: true,
                features: [
                    'Gestion de 50 propriétés',
                    '5 utilisateurs',
                    'Support prioritaire',
                    'Rapports personnalisés',
                    'API access',
                    'Collaboration avancée',
                ],
            },
            {
                id: 'enterprise',
                name: 'Enterprise',
                price: settings?.subscription_enterprise_price || 50000,
                maxProperties: -1, // illimité
                maxUsers: -1,
                features: [
                    'Propriétés illimitées',
                    'Utilisateurs illimités',
                    'Support 24/7',
                    'Rapports avancés',
                    'API complète',
                    'Formation personnalisée',
                    'Gestionnaire de compte dédié',
                ],
            },
        ],
        [settings]
    );

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0,
        }).format(amount);

    const handleEditPrice = (plan: SubscriptionPlan) => {
        setEditingPlan(plan.id);
        setEditPrice(plan.price.toString());
        setShowEditModal(true);
    };

    const handleSavePrice = () => {
        if (!editingPlan) return;

        const newPrice = parseInt(editPrice, 10);
        if (isNaN(newPrice) || newPrice < 0) return;

        const settingKey = `subscription_${editingPlan}_price`;
        updateSetting.mutate(
            { settingKey, settingValue: newPrice },
            {
                onSuccess: () => {
                    setShowEditModal(false);
                    setEditingPlan(null);
                    setEditPrice('');
                },
            }
        );
    };

    if (isLoading) {
        return (
            <Card className="border-none bg-white/90 shadow-md">
                <div className="p-6 space-y-4 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-48" />
                    <div className="grid md:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-64 bg-gray-100 rounded-xl" />
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <>
            <div className="space-y-6">
                <Card className="border-none bg-white/90 shadow-md">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Plans d'abonnement</h3>
                                <p className="text-sm text-slate-500">Gérez les plans disponibles pour les agences</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {plans.map((plan) => (
                                <Card
                                    key={plan.id}
                                    className={`relative ${plan.isPopular ? 'border-2 border-blue-500 shadow-lg' : 'border border-gray-200'
                                        }`}
                                >
                                    {plan.isPopular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                            <Badge variant="primary">Plus populaire</Badge>
                                        </div>
                                    )}
                                    <div className="p-6">
                                        <h4 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h4>
                                        <div className="mb-4">
                                            <span className="text-3xl font-bold text-slate-900">
                                                {formatCurrency(plan.price)}
                                            </span>
                                            <span className="text-slate-500">/mois</span>
                                        </div>

                                        <ul className="space-y-2 mb-6">
                                            {plan.features.map((feature, index) => (
                                                <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                                                    <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => handleEditPrice(plan)}
                                            >
                                                <Edit className="h-4 w-4 mr-1" />
                                                Modifier prix
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Edit Price Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingPlan(null);
                    setEditPrice('');
                }}
                title="Modifier le prix du plan"
                size="md"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">
                            Plan {plans.find((p) => p.id === editingPlan)?.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                            Prix actuel : {formatCurrency(plans.find((p) => p.id === editingPlan)?.price || 0)}
                        </p>
                    </div>

                    <Input
                        label="Nouveau prix (FCFA)"
                        type="number"
                        min="0"
                        step="1000"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        placeholder="Ex: 25000"
                    />

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            Ce changement affectera tous les nouveaux abonnements. Les abonnements existants ne seront
                            pas modifiés automatiquement.
                        </p>
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setShowEditModal(false);
                                setEditingPlan(null);
                                setEditPrice('');
                            }}
                        >
                            <X className="h-4 w-4 mr-2" />
                            Annuler
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSavePrice}
                            isLoading={updateSetting.isPending}
                            disabled={!editPrice || parseInt(editPrice) < 0}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Enregistrer
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default SubscriptionPlans;

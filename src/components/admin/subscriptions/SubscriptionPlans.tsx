import React, { useState, useMemo } from 'react';
import { TrendingUp, Plus, Edit, Save, X } from 'lucide-react';
import clsx from 'clsx';
import { Card } from '../../ui/Card';
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
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const plans: SubscriptionPlan[] = useMemo(
        () => [
            {
                id: 'basic',
                name: 'Basic',
                price: settings?.subscription_basic_price || 25000,
                maxProperties: 10,
                maxTenants: 10,
                maxUsers: 2,
                features: [
                    'Gestion de 10 propriétés',
                    'Jusqu\'à 10 locataires',
                    '2 utilisateurs',
                    'Support email',
                    'Rapports mensuels',
                ],
            },
            {
                id: 'premium',
                name: 'Premium',
                price: settings?.subscription_premium_price || 50000,
                maxProperties: 50,
                maxTenants: 50,
                maxUsers: 5,
                isPopular: true,
                features: [
                    'Gestion de 50 propriétés',
                    'Jusqu\'à 50 locataires',
                    '5 utilisateurs',
                    'Support prioritaire',
                    'Rapports personnalisés',
                    'API access',
                ],
            },
            {
                id: 'enterprise',
                name: 'Enterprise',
                price: settings?.subscription_enterprise_price || 100000,
                maxProperties: -1, // illimité
                maxTenants: -1,
                maxUsers: -1,
                features: [
                    'Propriétés illimitées',
                    'Locataires illimités',
                    'Utilisateurs illimités',
                    'Support 24/7',
                    'Rapports avancés',
                    'API complète',
                    'Gestionnaire dédié',
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

    const getDisplayPrice = (monthlyPrice: number) => {
        if (billingCycle === 'yearly') {
            return monthlyPrice * 0.8; // 20% discount
        }
        return monthlyPrice;
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
            <div className="space-y-10">
                <div className="relative group overflow-hidden rounded-[40px] p-px bg-gradient-to-br from-slate-200 via-white to-slate-200 shadow-2xl">
                    <div className="relative bg-white/80 backdrop-blur-xl p-10 rounded-[39px]">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="h-1.5 w-8 rounded-full bg-indigo-500" />
                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em]">Monetization Strategy</span>
                                </div>
                                <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight">Plans d'abonnement <span className="text-indigo-600">Premium</span></h3>
                                <p className="text-slate-500 text-lg mt-2 max-w-xl">
                                    Structure de prix optimisée avec une période d'essai de 60 jours pour toute nouvelle agence.
                                </p>
                            </div>
                            <div className="flex items-center gap-4 p-2 bg-slate-100/50 rounded-2xl border border-slate-200/50">
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={clsx(
                                        "px-6 py-3 rounded-xl shadow-sm text-sm font-bold transition-all duration-300",
                                        billingCycle === 'monthly'
                                            ? "bg-white text-indigo-600 border border-indigo-100"
                                            : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    Mensuel
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={clsx(
                                        "px-6 py-3 rounded-xl shadow-sm text-sm font-bold transition-all duration-300",
                                        billingCycle === 'yearly'
                                            ? "bg-white text-indigo-600 border border-indigo-100"
                                            : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    Annuel (-20%)
                                </button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={clsx(
                                        "relative group/plan flex flex-col rounded-[32px] p-8 transition-all duration-500 hover:-translate-y-2",
                                        plan.isPopular
                                            ? "bg-slate-900 text-white shadow-3xl shadow-indigo-500/20"
                                            : "bg-white border border-slate-100 shadow-xl shadow-slate-200/30 hover:border-indigo-100"
                                    )}
                                >
                                    {plan.isPopular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                                            Recommandé
                                        </div>
                                    )}

                                    <div className="mb-8">
                                        <h4 className={clsx(
                                            "text-xl font-bold mb-4 tracking-tight",
                                            plan.isPopular ? "text-indigo-400" : "text-slate-900"
                                        )}>{plan.name}</h4>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black tracking-tighter">
                                                {formatCurrency(getDisplayPrice(plan.price)).split(',')[0]}
                                            </span>
                                            <span className={clsx(
                                                "text-sm font-medium",
                                                plan.isPopular ? "text-slate-400" : "text-slate-500"
                                            )}>/ mois</span>
                                        </div>
                                        {billingCycle === 'yearly' && (
                                            <div className={clsx(
                                                "mt-1 text-[10px] font-bold",
                                                plan.isPopular ? "text-indigo-400" : "text-indigo-600"
                                            )}>
                                                Facturé annuellement: {formatCurrency(getDisplayPrice(plan.price) * 12).split(',')[0]}
                                            </div>
                                        )}
                                        <div className={clsx(
                                            "mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider",
                                            plan.isPopular ? "bg-indigo-500/10 text-indigo-300" : "bg-emerald-50 text-emerald-600"
                                        )}>
                                            <Plus className="h-3 w-3" />
                                            60 jours d'essai offerts
                                        </div>
                                    </div>

                                    <div className={clsx(
                                        "h-px w-full mb-8",
                                        plan.isPopular ? "bg-slate-800" : "bg-slate-100"
                                    )} />

                                    <ul className="space-y-4 mb-10 grow">
                                        {plan.features.map((feature, index) => (
                                            <li key={index} className="flex items-center gap-3 text-sm">
                                                <div className={clsx(
                                                    "h-5 w-5 rounded-full flex items-center justify-center shrink-0",
                                                    plan.isPopular ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-50 text-indigo-500"
                                                )}>
                                                    <TrendingUp className="h-3 w-3" />
                                                </div>
                                                <span className={plan.isPopular ? "text-slate-300" : "text-slate-600"}>
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    <Button
                                        variant={plan.isPopular ? "primary" : "outline"}
                                        className={clsx(
                                            "w-full rounded-2xl h-12 font-bold transition-all duration-300",
                                            plan.isPopular
                                                ? "bg-indigo-600 border-none hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
                                                : "border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/50"
                                        )}
                                        onClick={() => handleEditPrice(plan)}
                                    >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Configuration du plan
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
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

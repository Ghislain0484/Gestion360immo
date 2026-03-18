import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import { useQuotaManager } from '../../hooks/useQuotaManager';
import { usePlatformSettings } from '../../hooks/useAdminQueries';
import toast from 'react-hot-toast';

export const SubscriptionSettings: React.FC = () => {
    const { agencyId, refreshAuth } = useAuth();
    const { stats, isEnterprise, gracePeriodDaysRemaining } = useQuotaManager();
    const { data: settings } = usePlatformSettings();
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);

    useEffect(() => {
        const fetchSubscription = async () => {
            if (!agencyId) return;
            try {
                // Fetch subscription WITH agency modules
                const { data, error } = await supabase
                    .from('agency_subscriptions')
                    .select('*, agency:agencies(enabled_modules)')
                    .eq('agency_id', agencyId)
                    .maybeSingle();

                if (error) throw error;
                setSubscription(data);
            } catch (err: any) {
                console.error('Error fetching subscription:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSubscription();
    }, [agencyId]);

    const handleUpgrade = async (plan: 'premium' | 'enterprise') => {
        if (!agencyId) return;
        
        setUpgrading(true);
        try {
            const price = plan === 'premium' ? 
                (settings?.subscription_premium_price || 50000) : 
                (settings?.subscription_enterprise_price || 100000);

            // Tenter d'updater ou d'insérer si inexistant
            const { error } = await supabase
                .from('agency_subscriptions')
                .upsert({
                    agency_id: agencyId,
                    plan_type: plan,
                    status: 'active',
                    monthly_fee: price,
                    next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Reset billing cycle
                    updated_at: new Date().toISOString()
                }, { onConflict: 'agency_id' });

            if (error) throw error;
            
            // 🔄 Synchroniser avec la table agencies pour le dashboard admin
            await dbService.agencies.update(agencyId, { 
                plan_type: plan, 
                monthly_fee: price,
                subscription_status: 'active',
                updated_at: new Date().toISOString()
            } as any);

            // 🔐 Rafraîchir le contexte d'authentification pour mettre à jour les permissions/UI
            if (refreshAuth) await refreshAuth();

            toast.success(`Votre pack a été mis à jour vers ${plan.toUpperCase()} !`);
            setSubscription((prev: any) => ({ ...prev, plan_type: plan, status: 'active', monthly_fee: price }));
        } catch (err: any) {
            toast.error("Erreur lors de la mise à jour : " + err.message);
        } finally {
            setUpgrading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const plans = [
        {
            id: 'basic',
            name: 'Basic',
            price: settings?.subscription_basic_price || 25000,
            limit: 10,
            features: ['10 propriétés', '2 utilisateurs', 'Support email']
        },
        {
            id: 'premium',
            name: 'Premium',
            price: settings?.subscription_premium_price || 50000,
            limit: 50,
            features: ['50 propriétés', '5 utilisateurs', 'Support prioritaire']
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: settings?.subscription_enterprise_price || 100000,
            limit: Infinity,
            features: ['Propriétés illimitées', 'Utilisateurs illimités', 'Support 24/7']
        }
    ];

    const currentModules = subscription?.agency?.enabled_modules || ['base'];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Abonnement & Facturation</h3>
                    <p className="text-sm text-gray-500 mt-1">Gérez votre forfait et consultez vos limites d'utilisation.</p>
                </div>
                <div className="flex gap-2">
                    {subscription?.status === 'trial' && (
                        <Badge variant="warning" size="md">
                            <Clock className="h-4 w-4 mr-2" />
                            Période d'essai : {subscription.trial_days_remaining} jours restants
                        </Badge>
                    )}
                    {gracePeriodDaysRemaining > 0 && (
                        <Badge variant="danger" size="md" className="animate-pulse">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Délai de grâce : {gracePeriodDaysRemaining} jours restants
                        </Badge>
                    )}
                </div>
            </div>

            <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white overflow-hidden relative">
                <div className="p-6 relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-blue-100 uppercase text-xs font-bold tracking-wider mb-1">Pack actuel</p>
                            <h4 className="text-3xl font-black mb-4 uppercase">{subscription?.plan_type || 'Basic'}</h4>
                        </div>
                        <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
                            <Zap className="h-6 w-6 text-white" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                        <div className="space-y-4">
                            <div>
                                <p className="text-blue-100 text-sm mb-1">Utilisation des biens</p>
                                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-white rounded-full" 
                                        style={{ width: `${Math.min(100, (stats.properties.current / (stats.properties.max || 1)) * 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-right text-[10px] mt-1 text-blue-50 font-medium">
                                    {stats.properties.current} / {isEnterprise ? '∞' : stats.properties.max} unités
                                </p>
                            </div>
                            <div>
                                <p className="text-blue-100 text-sm mb-1">Utilisateurs actifs</p>
                                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-white rounded-full" 
                                        style={{ width: `${Math.min(100, (stats.users.current / (stats.users.max || 1)) * 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-right text-[10px] mt-1 text-blue-50 font-medium">
                                    {stats.users.current} / {isEnterprise ? '∞' : stats.users.max} accès
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col justify-end text-right">
                            <p className="text-blue-100 text-sm italic">Status :</p>
                            <p className="text-xl font-bold uppercase">{subscription?.status || 'Actif'}</p>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                {plans.map((plan) => {
                    const isCurrent = (subscription?.plan_type || 'basic') === plan.id;
                    const canUpgrade = !isCurrent && 
                        (plan.id === 'enterprise' || (plan.id === 'premium' && (subscription?.plan_type === 'basic' || !subscription)));

                    return (
                        <Card key={plan.id} className={isCurrent ? 'border-2 border-blue-600 shadow-md ring-1 ring-blue-600/20' : ''}>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h5 className="font-bold text-gray-900">{plan.name}</h5>
                                    {isCurrent && <Badge variant="success">Actif</Badge>}
                                </div>
                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-3xl font-black text-gray-900">
                                        {new Intl.NumberFormat('fr-FR').format(plan.price)}
                                    </span>
                                    <span className="text-xs text-gray-500 uppercase">XOF/mois</span>
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center text-sm text-gray-600">
                                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                
                                <Button
                                    variant={isCurrent ? 'outline' : 'primary'}
                                    disabled={!canUpgrade || upgrading}
                                    className="w-full"
                                    onClick={() => handleUpgrade(plan.id as any)}
                                >
                                    {isCurrent ? 'Plan actuel' : upgrading ? 'Mise à jour...' : 'Choisir ce plan'}
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3 mt-8">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                    <p className="font-bold mb-1">Informations sur les limites</p>
                    <p>
                        Les limites de biens et d'utilisateurs sont calculées sur la base de vos données actives. 
                        Si vous dépassez vos limites, vous ne pourrez plus ajouter de nouveaux dossiers avant d'avoir mis à jour votre forfait.
                    </p>
                </div>
            </div>
        </div>
    );
};

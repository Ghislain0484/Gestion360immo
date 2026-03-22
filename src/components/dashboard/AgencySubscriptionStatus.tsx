import React, { useEffect, useState } from 'react';
import { CreditCard, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/config';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SubscriptionPaymentModal } from './SubscriptionPaymentModal';
import { AgencySubscription } from '../../types/db';

export const AgencySubscriptionStatus: React.FC = () => {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState<AgencySubscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const fetchSubscription = async () => {
        if (!user?.agency_id) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('agency_subscriptions')
                .select('*')
                .eq('agency_id', user.agency_id)
                .maybeSingle();

            if (error) throw error;
            setSubscription(data);
        } catch (err) {
            console.error('Erreur chargement abonnement:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscription();
    }, [user?.agency_id]);

    if (loading || !user?.agency_id || !subscription) return null;

    const isTrial = subscription.status === 'trial';
    const isSuspended = subscription.status === 'suspended';
    const nextPaymentDate = new Date(subscription.next_payment_date);
    const today = new Date();
    const diffDays = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const needsPayment = diffDays <= 7 || isSuspended;

    return (
        <Card className="border-none shadow-premium overflow-hidden bg-white">
            <div className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${isTrial ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            <CreditCard className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900">
                                    Abonnement {subscription.plan_type.toUpperCase()}
                                </h3>
                                <Badge variant={isTrial ? 'secondary' : subscription.status === 'active' ? 'success' : 'warning'}>
                                    {isTrial ? 'Période d\'essai' : subscription.status === 'active' ? 'Actif' : 'Suspendu'}
                                </Badge>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                                {isTrial 
                                    ? `Votre essai gratuit se termine dans ${diffDays} jours (${nextPaymentDate.toLocaleDateString('fr-FR')})`
                                    : `Prochaine échéance : ${nextPaymentDate.toLocaleDateString('fr-FR')}`
                                }
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-right mr-4">
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Montant mensuel</p>
                            <p className="text-xl font-black text-slate-900">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(subscription.monthly_fee)}
                            </p>
                        </div>
                        <Button 
                            onClick={() => setShowPaymentModal(true)}
                            className={`${needsPayment ? 'btn-premium' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} border-none`}
                        >
                            {needsPayment ? 'Payer maintenant' : 'Gérer l\'abonnement'}
                        </Button>
                    </div>
                </div>

                {needsPayment && !isSuspended && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-3 text-amber-800 text-sm">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <p>
                            Votre abonnement arrive à échéance bientôt. Payez maintenant pour éviter toute interruption de service.
                        </p>
                    </div>
                )}

                {isSuspended && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-800 text-sm">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <p>
                            <strong>Abonnement suspendu.</strong> Veuillez régulariser votre situation pour réactiver l'accès complet à la plateforme.
                        </p>
                    </div>
                )}
            </div>

            <SubscriptionPaymentModal 
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                subscription={subscription}
                onSuccess={() => {
                    fetchSubscription();
                    setShowPaymentModal(false);
                }}
            />
        </Card>
    );
};

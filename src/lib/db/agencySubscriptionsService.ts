import { supabase } from '../config';
import { normalizeAgencySubscription } from '../normalizers';
import { formatSbError, logAuthContext } from '../helpers';
import { AgencySubscription } from "../../types/db";

export const agencySubscriptionsService = {
    async getAll(): Promise<AgencySubscription[]> {
        const { data, error } = await supabase.from('agency_subscriptions').select('*').order('created_at', { ascending: false });
        if (error) throw new Error(formatSbError('❌ agency_subscriptions.select', error));
        return data ?? [];
    },
    async create(sub: Partial<AgencySubscription>): Promise<AgencySubscription> {
        const clean = normalizeAgencySubscription(sub);
        const { data, error } = await supabase.from('agency_subscriptions').insert(clean).select('*').single();
        if (error) throw new Error(formatSbError('❌ agency_subscriptions.insert', error));
        return data;
    },
    async update(id: string, updates: Partial<AgencySubscription>): Promise<AgencySubscription> {
        const clean = normalizeAgencySubscription(updates);
        const { data, error } = await supabase.from('agency_subscriptions').update(clean).eq('id', id).select('*').single();
        if (error) throw new Error(formatSbError('❌ agency_subscriptions.update', error));
        return data;
    },
    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('agency_subscriptions').delete().eq('id', id);
        if (error) throw new Error(formatSbError('❌ agency_subscriptions.delete', error));
        return true;
    },
    async extend(agencyId: string, months: number): Promise<boolean> {
        const { user } = await logAuthContext('extendSubscription');
        if (!user) throw new Error('Utilisateur non authentifié');

        // Vérifier si l'utilisateur est admin
        const { data: admin, error: adminError } = await supabase
            .from('platform_admins')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
        if (adminError || !admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            throw new Error('Permissions insuffisantes');
        }

        const { data: sub, error: subError } = await supabase
            .from('agency_subscriptions')
            .select('*')
            .eq('agency_id', agencyId)
            .single();
        if (subError || !sub) throw new Error(formatSbError('❌ agency_subscriptions.select', subError));

        const nextPaymentDate = new Date(sub.next_payment_date || Date.now());
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + months);

        const payment = {
            date: new Date().toISOString(),
            amount: sub.monthly_fee * months,
        };

        const updatedHistory = [...(sub.payment_history || []), payment];

        const updates = {
            next_payment_date: nextPaymentDate.toISOString().split('T')[0],
            payment_history: updatedHistory,
            status: 'active',
        };

        const { error } = await supabase
            .from('agency_subscriptions')
            .update(updates)
            .eq('id', sub.id);
        if (error) throw new Error(formatSbError('❌ agency_subscriptions.update', error));

        return true;
    },
    async suspend(agencyId: string, reason: string): Promise<boolean> {
        const { user } = await logAuthContext('suspendSubscription');
        if (!user) throw new Error('Utilisateur non authentifié');

        // Vérifier si l'utilisateur est admin
        const { data: admin, error: adminError } = await supabase
            .from('platform_admins')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
        if (adminError || !admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            throw new Error('Permissions insuffisantes');
        }

        const { data: sub, error: subError } = await supabase
            .from('agency_subscriptions')
            .select('id')
            .eq('agency_id', agencyId)
            .single();
        if (subError || !sub) throw new Error(formatSbError('❌ agency_subscriptions.select', subError));

        const { error } = await supabase
            .from('agency_subscriptions')
            .update({ status: 'suspended', suspension_reason: reason })
            .eq('id', sub.id);
        if (error) throw new Error(formatSbError('❌ agency_subscriptions.update', error));

        return true;
    },
    async activate(agencyId: string): Promise<boolean> {
        const { user } = await logAuthContext('activateSubscription');
        if (!user) throw new Error('Utilisateur non authentifié');

        // Vérifier si l'utilisateur est admin
        const { data: admin, error: adminError } = await supabase
            .from('platform_admins')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
        if (adminError || !admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            throw new Error('Permissions insuffisantes');
        }

        const { data: sub, error: subError } = await supabase
            .from('agency_subscriptions')
            .select('*')
            .eq('agency_id', agencyId)
            .single();
        if (subError || !sub) throw new Error(formatSbError('❌ agency_subscriptions.select', subError));

        // Essai gratuit de 60 jours
        const nextPaymentDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const { error } = await supabase
            .from('agency_subscriptions')
            .update({ 
                status: 'trial', 
                next_payment_date: nextPaymentDate,
                trial_days_remaining: 60
            })
            .eq('id', sub.id);
        if (error) throw new Error(formatSbError('❌ agency_subscriptions.update', error));

        return true;
    },

    /**
     * Synchronise les informations d'abonnement entre les tables 'agencies' et 'agency_subscriptions'
     */
    async syncSubscription(agencyId: string, planType: string, monthlyFee: number, status: string = 'active'): Promise<boolean> {
        console.log('🔄 agencySubscriptionsService.syncSubscription', { agencyId, planType, monthlyFee, status });
        
        // 1. Calculer la prochaine date de paiement
        const now = new Date();
        let nextPaymentDate = new Date();
        
        if (status === 'trial') {
            nextPaymentDate.setDate(now.getDate() + 60);
        } else {
            nextPaymentDate.setMonth(now.getMonth() + 1);
        }
        
        const { error: subError } = await supabase
            .from('agency_subscriptions')
            .upsert({
                agency_id: agencyId,
                plan_type: planType,
                monthly_fee: monthlyFee,
                status: status,
                next_payment_date: nextPaymentDate.toISOString().split('T')[0],
                updated_at: new Date().toISOString()
            }, { onConflict: 'agency_id' });

        if (subError) {
            console.error('❌ Error syncing agency_subscriptions:', subError);
            throw new Error(formatSbError('❌ agency_subscriptions.upsert', subError));
        }

        // 2. Mise à jour de la table agencies
        const { error: agencyError } = await supabase
            .from('agencies')
            .update({
                plan_type: planType,
                monthly_fee: monthlyFee,
                subscription_status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', agencyId);

        if (agencyError) {
            console.error('❌ Error syncing agencies table:', agencyError);
            throw new Error(formatSbError('❌ agencies.update (sync)', agencyError));
        }

        return true;
    }
};
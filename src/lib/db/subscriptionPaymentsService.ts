import { supabase } from '../config';
import { normalizeSubscriptionPayment } from '../normalizers';
import { formatSbError } from '../helpers';
import { SubscriptionPayment } from "../../types/db";

export const subscriptionPaymentsService = {
    async getAll(): Promise<SubscriptionPayment[]> {
        const { data, error } = await supabase.from('subscription_payments').select('*').order('created_at', { ascending: false });
        if (error) throw new Error(formatSbError('❌ subscription_payments.select', error));
        return data ?? [];
    },
    async create(payment: Partial<SubscriptionPayment>): Promise<SubscriptionPayment> {
        const clean = normalizeSubscriptionPayment(payment);
        const { data, error } = await supabase.from('subscription_payments').insert(clean).select('*').single();
        if (error) throw new Error(formatSbError('❌ subscription_payments.insert', error));
        return data;
    },
    async update(id: string, updates: Partial<SubscriptionPayment>): Promise<SubscriptionPayment> {
        const clean = normalizeSubscriptionPayment(updates);
        const { data, error } = await supabase.from('subscription_payments').update(clean).eq('id', id).select('*').single();
        if (error) throw new Error(formatSbError('❌ subscription_payments.update', error));
        return data;
    },
    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('subscription_payments').delete().eq('id', id);
        if (error) throw new Error(formatSbError('❌ subscription_payments.delete', error));
        return true;
    },
};
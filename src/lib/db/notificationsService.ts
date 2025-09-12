import { supabase } from '../config';
import { normalizeNotification } from '../normalizers';
import { formatSbError } from '../helpers';
import { Notification } from "../../types/db";

export const notificationsService = {
    async getAll(): Promise<Notification[]> {
        const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
        if (error) throw new Error(formatSbError('❌ notifications.select', error));
        return data ?? [];
    },
    async getByUser(userId: string): Promise<Notification[]> {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw new Error(formatSbError('❌ notifications.select', error));
        return data ?? [];
    },
    async create(notification: Partial<Notification>): Promise<Notification> {
        const clean = normalizeNotification(notification);
        const { data, error } = await supabase
            .from('notifications')
            .insert(clean)
            .select()
            .single();
        if (error) throw new Error(formatSbError('❌ notifications.insert', error));
        return data;
    },
    async update(id: string, updates: Partial<Notification>): Promise<Notification> {
        const clean = normalizeNotification(updates);
        const { data, error } = await supabase.from('notifications').update(clean).eq('id', id).select('*').single();
        if (error) throw new Error(formatSbError('❌ notifications.update', error));
        return data;
    },
    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('notifications').delete().eq('id', id);
        if (error) throw new Error(formatSbError('❌ notifications.delete', error));
        return true;
    },
};
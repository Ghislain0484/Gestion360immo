import { NotificationSettings, NotificationSettingsUpsert } from '../../types/db';
import { supabase } from '../config';
import { formatSbError } from '../helpers';

export const notificationSettingsService = {
    async getByUser(userId: string): Promise<NotificationSettings | null> {
        const { data, error } = await supabase
            .from('notification_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw new Error(formatSbError('❌ notification_settings.select', error));
        }
        return data ?? null;
    },
    async upsert(
        userId: string,
        settings: NotificationSettingsUpsert
    ): Promise<NotificationSettings> {
        const insertPayload = {
            ...settings,
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('notification_settings')
            .upsert(insertPayload, { onConflict: 'user_id' })
            .select('*')
            .single();

        if (error) throw new Error(formatSbError('❌ notification_settings.upsert', error));
        return data!;
    },
};
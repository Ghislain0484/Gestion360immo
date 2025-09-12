import { EmailNotification } from "../../types/db";
import { supabase } from "../config";
import { formatSbError } from "../helpers";
import { normalizeEmailNotification } from "../normalizers";


export const emailNotificationsService = {
    getByAgency: async (agencyId: string): Promise<EmailNotification[]> => {
        const { data, error } = await supabase
            .from('email_notifications')
            .select('*')
            .eq('agency_id', agencyId)
            .order('created_at', { ascending: false });
        if (error) throw new Error(formatSbError('❌ email_notifications.select', error));
        return data ?? [];
    },
    create: async (notification: Partial<EmailNotification>) => {
        const clean = normalizeEmailNotification(notification);
        const { data, error } = await supabase.from('email_notifications').insert(clean).select('*').single();
        if (error) throw new Error(formatSbError('❌ email_notifications.insert', error));
        return data;
    },
    update: async (notificationId: string, updates: Partial<EmailNotification>) => {
        const clean = normalizeEmailNotification(updates);
        const { data, error } = await supabase
            .from('email_notifications')
            .update(clean)
            .eq('id', notificationId)
            .select('*')
            .single();
        if (error) throw new Error(formatSbError('❌ email_notifications.update', error));
        return data;
    },
};
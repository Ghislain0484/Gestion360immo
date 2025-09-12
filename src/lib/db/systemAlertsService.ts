import { supabase } from '../config';
import { SystemAlert } from '../../types/db';

export const systemAlertsService = {
    async systemAlerts(): Promise<SystemAlert[]> {
        try {
            const { data, error } = await supabase
                .from('platform_settings')
                .select('setting_value')
                .eq('setting_key', 'system_alerts')
                .eq('is_public', true)
                .limit(1)
                .maybeSingle();

            if (error) {
                throw new Error(`❌ platform_settings.select (system_alerts) | code=${error.code} | msg=${error.message}`);
            }

            return (data?.setting_value as SystemAlert[]) || [];
        } catch (err: any) {
            console.error('getSystemAlerts:', err);
            throw new Error(`❌ getSystemAlerts: ${err.message}`);
        }
    },
};
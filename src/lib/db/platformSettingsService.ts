import { supabase } from '../config';
import { normalizePlatformSetting } from '../normalizers';
import { formatSbError, logAuthContext } from '../helpers';
import { PlatformSetting } from "../../types/db";

export const platformSettingsService = {
        async getAll(): Promise<PlatformSetting[]> {
            const { data, error } = await supabase.from('platform_settings').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ platform_settings.select', error));
            return data ?? [];
        },
        async create(setting: Partial<PlatformSetting>): Promise<PlatformSetting> {
            const clean = normalizePlatformSetting(setting);
            const { data, error } = await supabase.from('platform_settings').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ platform_settings.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<PlatformSetting>): Promise<PlatformSetting> {
            const clean = normalizePlatformSetting(updates);
            const { data, error } = await supabase.from('platform_settings').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ platform_settings.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('platform_settings').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ platform_settings.delete', error));
            return true;
        },
        upsert: async (settings: Partial<PlatformSetting>[]): Promise<void> => {
            const { user } = await logAuthContext('platformSettingsUpsert');
            if (!user) throw new Error('Utilisateur non authentifié');

            // Vérifier si l'utilisateur est admin
            const { data: admin } = await supabase
                .from('platform_admins')
                .select('role')
                .eq('user_id', user.id)
                .single();
            if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
                throw new Error('Permissions insuffisantes');
            }

            const cleanSettings = settings.map(setting => ({
                ...normalizePlatformSetting(setting),
                updated_by: user.id,
                updated_at: new Date().toISOString(),
            }));

            const { error } = await supabase
                .from('platform_settings')
                .upsert(cleanSettings, { onConflict: 'setting_key' });
            if (error) throw new Error(formatSbError('❌ platform_settings.upsert', error));
        },
};


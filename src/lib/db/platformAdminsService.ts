import { supabase } from '../config';
import { normalizePlatformAdmin } from '../normalizers';
import { formatSbError } from '../helpers';
import { PlatformAdmin } from "../../types/db";

export const platformAdminsService = {
    async getAll(): Promise<PlatformAdmin[]> {
        const { data, error } = await supabase.from('platform_admins').select('*').order('created_at', { ascending: false });
        if (error) throw new Error(formatSbError('❌ platform_admins.select', error));
        return data ?? [];
    },
    async create(admin: Partial<PlatformAdmin>): Promise<PlatformAdmin> {
        const clean = normalizePlatformAdmin(admin);
        const { data, error } = await supabase.from('platform_admins').insert(clean).select('*').single();
        if (error) throw new Error(formatSbError('❌ platform_admins.insert', error));
        return data;
    },
    async update(id: string, updates: Partial<PlatformAdmin>): Promise<PlatformAdmin> {
        const clean = normalizePlatformAdmin(updates);
        const { data, error } = await supabase.from('platform_admins').update(clean).eq('id', id).select('*').single();
        if (error) throw new Error(formatSbError('❌ platform_admins.update', error));
        return data;
    },
    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('platform_admins').delete().eq('id', id);
        if (error) throw new Error(formatSbError('❌ platform_admins.delete', error));
        return true;
    },
};
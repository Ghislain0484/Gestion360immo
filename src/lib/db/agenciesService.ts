import { supabase } from '../config';
import { normalizeAgency } from '../normalizers';
import { formatSbError } from '../helpers';
import { Agency } from "../../types/db";

export const agenciesService = {
    async getAll(): Promise<Agency[]> {
        const { data, error } = await supabase.from('agencies').select('*').order('created_at', { ascending: false });
        if (error) throw new Error(formatSbError('❌ agencies.select', error));
        return data ?? [];
    },
    async getById(id: string): Promise<Agency | null> {
        const { data, error } = await supabase.from('agencies').select('*').eq('id', id).maybeSingle();
        if (error) throw new Error(formatSbError('❌ agencies.select (by id)', error));
        return data;
    },
    async create(agency: Partial<Agency>): Promise<Agency> {
        const clean = normalizeAgency(agency);
        const { data, error } = await supabase.from('agencies').insert(clean).select('*').single();
        if (error) throw new Error(formatSbError('❌ agencies.insert', error));
        return data;
    },
    async update(id: string, updates: Partial<Agency>): Promise<Agency> {
        const clean = normalizeAgency(updates);
        const { data, error } = await supabase.from('agencies').update(clean).eq('id', id).select('*').single();
        if (error) throw new Error(formatSbError('❌ agencies.update', error));
        return data;
    },
    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('agencies').delete().eq('id', id);
        if (error) throw new Error(formatSbError('❌ agencies.delete', error));
        return true;
    },
    async getRecent(limit: number = 5): Promise<Agency[]> {
        const { data, error } = await supabase
            .from('agencies')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw new Error(formatSbError('❌ agencies.select (recent)', error));
        return data ?? [];
    },
};
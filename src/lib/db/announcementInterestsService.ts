import { supabase } from '../config';
import { normalizeAnnouncementInterest } from '../normalizers';
import { formatSbError } from '../helpers';
import { AnnouncementInterest } from "../../types/db";

export const announcementInterestsService = {
    async getAll(): Promise<AnnouncementInterest[]> {
        const { data, error } = await supabase.from('announcement_interests').select('*').order('created_at', { ascending: false });
        if (error) throw new Error(formatSbError('❌ announcement_interests.select', error));
        return data ?? [];
    },
    async create(interest: Partial<AnnouncementInterest>): Promise<AnnouncementInterest> {
        const clean = normalizeAnnouncementInterest(interest);
        const { data, error } = await supabase.from('announcement_interests').insert(clean).select('*').single();
        if (error) throw new Error(formatSbError('❌ announcement_interests.insert', error));
        return data;
    },
    async update(id: string, updates: Partial<AnnouncementInterest>): Promise<AnnouncementInterest> {
        const clean = normalizeAnnouncementInterest(updates);
        const { data, error } = await supabase.from('announcement_interests').update(clean).eq('id', id).select('*').single();
        if (error) throw new Error(formatSbError('❌ announcement_interests.update', error));
        return data;
    },
    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('announcement_interests').delete().eq('id', id);
        if (error) throw new Error(formatSbError('❌ announcement_interests.delete', error));
        return true;
    },
};
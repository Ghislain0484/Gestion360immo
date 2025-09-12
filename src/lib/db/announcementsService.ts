import { supabase } from '../config';
import { normalizeAnnouncement } from '../normalizers';
import { formatSbError } from '../helpers';
import { Announcement } from "../../types/db";

export const announcementsService = {
    async getAll(): Promise<Announcement[]> {
        const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
        if (error) throw new Error(formatSbError('❌ announcements.select', error));
        return data ?? [];
    },
    async create(announcement: Partial<Announcement>): Promise<Announcement> {
        const clean = normalizeAnnouncement(announcement);
        const { data, error } = await supabase.from('announcements').insert(clean).select('*').single();
        if (error) throw new Error(formatSbError('❌ announcements.insert', error));
        return data;
    },
    async update(id: string, updates: Partial<Announcement>): Promise<Announcement> {
        const clean = normalizeAnnouncement(updates);
        const { data, error } = await supabase.from('announcements').update(clean).eq('id', id).select('*').single();
        if (error) throw new Error(formatSbError('❌ announcements.update', error));
        return data;
    },
    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) throw new Error(formatSbError('❌ announcements.delete', error));
        return true;
    },
};
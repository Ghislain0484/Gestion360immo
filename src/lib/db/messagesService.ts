import { supabase } from '../config';
import { normalizeMessage } from '../normalizers';
import { formatSbError } from '../helpers';
import { Message } from "../../types/db";

export const messagesService = {
    async getAll(): Promise<Message[]> {
        const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
        if (error) throw new Error(formatSbError('❌ messages.select', error));
        return data ?? [];
    },
    async create(message: Partial<Message>): Promise<Message> {
        const clean = normalizeMessage(message);
        const { data, error } = await supabase
            .from('messages')
            .insert(clean)
            .select()
            .single();
        if (error) throw new Error(formatSbError('❌ messages.insert', error));
        return data;
    },
    async update(id: string, updates: Partial<Message>): Promise<Message> {
        const clean = normalizeMessage(updates);
        const { data, error } = await supabase.from('messages').update(clean).eq('id', id).select('*').single();
        if (error) throw new Error(formatSbError('❌ messages.update', error));
        return data;
    },
    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('messages').delete().eq('id', id);
        if (error) throw new Error(formatSbError('❌ messages.delete', error));
        return true;
    },
};
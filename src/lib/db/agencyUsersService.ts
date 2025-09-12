import { supabase } from '../config';
import { normalizeAgencyUser, normalizePartialAgencyUser } from '../normalizers';
import { formatSbError } from '../helpers';
import { AgencyUser } from "../../types/db";
import { AgencyUserRole } from '../../types/enums';

export const agencyUsersService = {
    async getAll(): Promise<AgencyUser[]> {
        const { data, error } = await supabase.from('agency_users').select('*').order('created_at', { ascending: false });
        if (error) throw new Error(formatSbError('❌ agency_users.select', error));
        return data ?? [];
    },
    async create(agencyUser: {
        user_id: string;
        agency_id: string;
        role: AgencyUserRole;
        created_at?: string;
        updated_at?: string;
    }) {
        try {
            const normalizedUser = normalizeAgencyUser({
                ...agencyUser,
                created_at: agencyUser.created_at ?? new Date().toISOString(),
                updated_at: agencyUser.updated_at ?? new Date().toISOString(),
            });
            console.log('Inserting agency_user:', normalizedUser);
            const { data, error } = await supabase
                .from('agency_users')
                .insert([normalizedUser])
                .select('*')
                .single();
            if (error) {
                console.error('agency_users.insert error:', error);
                throw new Error(`agency_users.insert | code=${error.code} | msg=${error.message}`);
            }
            console.log('Agency user inserted successfully:', data);
            return data;
        } catch (err) {
            console.error('Error in agencyUsersService.create:', err);
            throw err;
        }
    },
    /*
    async update(user_id: string, updates: Partial<AgencyUser>): Promise<AgencyUser> {
        const clean = normalizeAgencyUser(updates);
        const { data, error } = await supabase.from('agency_users').update(clean).eq('user_id', user_id).select('*').single();
        if (error) throw new Error(formatSbError('❌ agency_users.update', error));
        return data;
    },
    */
    async update(user_id: string, updates: Partial<AgencyUser>): Promise<AgencyUser> {
        // Filtrer les null/undefined
        const clean = Object.fromEntries(
            Object.entries(updates).filter(([_, value]) => value !== null && value !== undefined)
        );

        // Normaliser seulement les champs fournis
        const normalized = normalizePartialAgencyUser(clean);

        const { data, error } = await supabase
            .from('agency_users')
            .update(normalized)
            .eq('user_id', user_id)
            .select('*')
            .single();

        if (error) throw new Error(formatSbError('❌ agency_users.update', error));
        return data;
    },
    async delete(user_id: string): Promise<boolean> {
        const { error } = await supabase.from('agency_users').delete().eq('user_id', user_id);
        if (error) throw new Error(formatSbError('❌ agency_users.delete', error));
        return true;
    },
};
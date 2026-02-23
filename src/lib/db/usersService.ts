import { supabase } from '../config';
import { normalizePartialUser, normalizeUser } from '../normalizers';
import { formatSbError } from '../helpers';
import { User, UserPermissions } from "../../types/db";
import { AgencyUserRole } from '../../types/enums';

export const usersService = {
    async getCurrent(): Promise<User | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data, error } = await supabase.from('users').select('*').eq('id', user.id).limit(1);
        if (error) throw new Error(formatSbError('❌ users.select (current)', error));
        return data?.[0] || null;
    },
    async countByAgency(agency_id: string): Promise<number> {
        const { count, error } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('agency_id', agency_id);
        if (error) {
            console.error('Erreur count users:', error);
            return 0;
        }
        return count ?? 0;
    },
    async getAll(): Promise<User[]> {
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (error) throw new Error(formatSbError('❌ users.select', error));
        return data ?? [];
    },
    async create(user: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        is_active: boolean;
        permissions: UserPermissions;
        agency_id?: string | undefined;
        created_at: string;
        updated_at: string;
    }) {
        try {
            console.log('Upserting user into users table:', user);
            const normalizedUser = normalizeUser(user);
            const { data, error } = await supabase
                .from('users')
                .upsert([normalizedUser], { onConflict: 'id' })
                .select('*')
                .limit(1);
            if (error) {
                console.error('users.upsert error:', error);
                throw new Error(`users.upsert | code=${error.code} | msg=${error.message}`);
            }
            console.log('User upserted successfully:', data?.[0]);
            return data?.[0];
        } catch (err) {
            console.error('Error in usersService.create:', err);
            throw err;
        }
    },
    async update(id: string, updates: Partial<User>): Promise<User> {
        // Filtrer les null/undefined pour éviter les inclusions inutiles
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, value]) => value !== null && value !== undefined)
        );

        // Normaliser seulement les champs fournis (sans ajouter de null pour les absents)
        const normalizedUpdates = normalizePartialUser(cleanUpdates);

        // Supprimer id pour éviter écrasement (clé pour .eq('id', id))
        delete (normalizedUpdates as any).id;

        console.log('Clean updates for user update:', normalizedUpdates);  // Log mis à jour

        const { data, error } = await supabase
            .from('users')
            .update(normalizedUpdates)
            .eq('id', id)
            .select('*')
            .limit(1);

        if (error) throw new Error(formatSbError('❌ users.update', error));
        return data?.[0];
    },
    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw new Error(formatSbError('❌ users.delete', error));
        return true;
    },
    async getByAgency(agencyId: string): Promise<(User & { role: AgencyUserRole; agency_id: string | null })[]> {
        const { data, error } = await supabase
            .from('agency_users')
            .select('*, users!inner(*)')
            .eq('agency_id', agencyId)
            .order('created_at', { ascending: false });
        if (error) throw new Error(formatSbError('❌ agency_users.select (by agency)', error));
        return data.map((au) => ({
            ...au.users,
            role: au.role,
            agency_id: au.agency_id,
        }));
    },
};
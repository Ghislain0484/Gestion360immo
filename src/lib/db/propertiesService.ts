import { supabase } from '../config';
import { normalizeProperty } from '../normalizers';
import { formatSbError } from '../helpers';
import { Property, Contract, Tenant } from "../../types/db";

export const propertiesService = {
    async getAll({
        agency_id,
        limit,
        offset,
        search,
        standing
    }: {
        agency_id?: string;
        limit?: number;
        offset?: number;
        search?: string;
        standing?: string;
    } = {}): Promise<Property[]> {
        let query = supabase
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false });

        if (agency_id) {
            query = query.eq('agency_id', agency_id);
        }
        if (search) {
            query = query.or(`title.ilike.%${search}%,location->>commune.ilike.%${search}%,location->>quartier.ilike.%${search}%`);
        }
        if (standing) {
            query = query.eq('standing', standing);
        }
        if (limit !== undefined && offset !== undefined) {
            query = query.range(offset, offset + limit - 1);
        }

        const { data, error } = await query;
        if (error) throw new Error(formatSbError("❌ properties.select", error));
        return data ?? [];
    },
    async create(property: Partial<Property>): Promise<Property> {
        const clean = normalizeProperty(property);
        const { data, error } = await supabase.from('properties').insert(clean).select('*').single();
        if (error) throw new Error(formatSbError('❌ properties.insert', error));
        return data;
    },
    async update(id: string, updates: Partial<Property>): Promise<Property> {
        const clean = normalizeProperty(updates);
        const { data, error } = await supabase.from('properties').update(clean).eq('id', id).select('*').single();
        if (error) throw new Error(formatSbError('❌ properties.update', error));
        return data;
    },
    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('properties').delete().eq('id', id);
        if (error) throw new Error(formatSbError('❌ properties.delete', error));
        return true;
    },
    async findOne(id: string): Promise<Property | null> {
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(formatSbError('❌ properties.findOne', error));
        }
        return data;
    },
    async getByOwnerId(
        ownerId: string,
        agencyId: string
    ): Promise<{
        data: (Property & { contracts: (Contract & { tenants: Tenant })[] })[] | null;
        error: any;
    }> {
        const { data, error } = await supabase
            .from('properties')
            .select('*, contracts(*, tenants(*))')
            .eq('owner_id', ownerId)
            .eq('agency_id', agencyId);
        if (error) throw new Error(formatSbError('❌ properties.select', error));
        return { data: data ?? [], error: null };
    },
    async getById(id: string): Promise<Property> {
        const { data, error } = await supabase
            .from('properties')
            .select('*, owner_id, agency_id')
            .eq('id', id)
            .single();
        if (error) throw new Error(formatSbError('❌ properties.select', error));
        return data;
    },
};
import { supabase } from '../config';
import { normalizeTenant } from '../normalizers';
import { formatSbError } from '../helpers';
import { Tenant, TenantFilters } from "../../types/db";

export const tenantsService = {
    async getAll(filters: TenantFilters = {}): Promise<Tenant[]> {
        let query = supabase.from('tenants').select('*').order('created_at', { ascending: false });

        if (filters.agency_id) {
            query = query.eq('agency_id', filters.agency_id);
        }
        if (filters.marital_status) {
            query = query.eq('marital_status', filters.marital_status);
        }
        if (filters.payment_status) {
            query = query.eq('payment_status', filters.payment_status);
        }
        if (filters.search) {
            const search = `%${filters.search.toLowerCase()}%`;
            query = query.or(
                `first_name.ilike.${search},last_name.ilike.${search},phone.ilike.${search},city.ilike.${search},profession.ilike.${search}`
            );
        }

        if (filters.limit !== undefined) {
            const from = filters.offset ?? 0;
            const to = from + filters.limit - 1;
            query = query.range(from, to);
        }

        const { data, error } = await query;
        if (error) throw new Error(formatSbError('❌ tenants.select', error));
        return data ?? [];
    },
    async create(tenant: Partial<Tenant>): Promise<Tenant> {
        const clean = normalizeTenant(tenant);
        const { data, error } = await supabase.from('tenants').insert(clean).select('*').single();
        if (error) throw new Error(formatSbError('❌ tenants.insert', error));
        return data;
    },
    async update(id: string, updates: Partial<Tenant>): Promise<Tenant> {
        const clean = normalizeTenant(updates);
        const { data, error } = await supabase.from('tenants').update(clean).eq('id', id).select('*').single();
        if (error) throw new Error(formatSbError('❌ tenants.update', error));
        return data;
    },
    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('tenants').delete().eq('id', id);
        if (error) throw new Error(formatSbError('❌ tenants.delete', error));
        return true;
    },
    async findOne(id: string): Promise<Tenant | null> {
        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(formatSbError('❌ tenants.findOne', error));
        }
        return data;
    },
};
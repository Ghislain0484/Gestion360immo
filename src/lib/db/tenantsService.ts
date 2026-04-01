import { supabase } from '../config';
import { normalizeTenant } from '../normalizers';
import { formatSbError } from '../helpers';
import { Tenant, TenantFilters } from "../../types/db";

export const tenantsService = {
    async getAll(filters: TenantFilters = {}): Promise<Tenant[]> {
        if (filters.agency_id === '00000000-0000-0000-0000-000000000000') {
            const { MOCK_TENANTS } = await import('../mockData');
            let result = [...MOCK_TENANTS];
            if (filters.search) {
                const s = filters.search.toLowerCase();
                result = result.filter(t => 
                    t.first_name.toLowerCase().includes(s) || 
                    t.last_name.toLowerCase().includes(s) ||
                    t.phone.toLowerCase().includes(s)
                );
            }
            if (filters.marital_status) result = result.filter(t => t.marital_status === filters.marital_status);
            if (filters.payment_status) result = result.filter(t => t.payment_status === filters.payment_status);
            
            // Note: On pourrait aussi simuler active_contracts ici si besoin
            return result;
        }
        let query = supabase
            .from('tenants')
            .select('*, active_contracts:contracts(id, status, monthly_rent, property_id, owner_id, property:properties(title))')
            .order('created_at', { ascending: false });

        // Note: Joining with contracts might return multiple rows if not filtered properly.
        // Supabase allows filtering joined tables, but here we want the nested data, not top-level filtering.

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

        const limit = filters.limit ?? 100;
        const from = filters.offset ?? 0;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error } = await query;
        if (error) throw new Error(formatSbError('❌ tenants.select', error));
        return data ?? [];
    },
    async create(tenant: Partial<Tenant>): Promise<Tenant> {
        const clean = normalizeTenant(tenant);
        console.log("📡 tenantsService.create: envoi vers Supabase:", clean);
        const { data, error } = await supabase.from('tenants').insert(clean).select('*').single();
        if (error) {
            console.error("📛 tenantsService.create ERROR:", error);
            throw new Error(formatSbError('❌ tenants.insert', error));
        }
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
    async findOne(id: string, agencyId?: string): Promise<Tenant | null> {
        if (agencyId === '00000000-0000-0000-0000-000000000000' || id.startsWith('demo-tenant-')) {
            const { MOCK_TENANTS } = await import('../mockData');
            return MOCK_TENANTS.find(t => t.id === id) || null;
        }
        let query = supabase
            .from('tenants')
            .select('*')
            .eq('id', id);

        if (agencyId) {
            query = query.eq('agency_id', agencyId);
        }

        const { data, error } = await query.maybeSingle();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(formatSbError('❌ tenants.findOne', error));
        }
        return data;
    },
    async getBySlugId(id: string, agencyId?: string): Promise<Tenant | null> {
        if (agencyId === '00000000-0000-0000-0000-000000000000' || id.startsWith('demo-tenant-')) {
            const { MOCK_TENANTS } = await import('../mockData');
            return MOCK_TENANTS.find(t => t.id === id) || null;
        }
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let query = supabase.from('tenants').select('*');
        if (isUuid) {
            query = query.eq('id', id);
        } else {
            query = query.eq('business_id', id);
        }

        if (agencyId) {
            query = query.eq('agency_id', agencyId);
        }
        const { data, error } = await query.maybeSingle();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(formatSbError('❌ tenants.getBySlugId', error));
        }
        return data;
    },
};
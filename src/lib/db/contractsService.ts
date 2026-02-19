import { supabase } from '../config';
import { normalizeContract } from '../normalizers';
import { formatSbError } from '../helpers';
import { Contract } from "../../types/db";

export const contractsService = {
  async getAll({
    agency_id,
    limit,
    offset,
    search,
    status,
    tenant_id,
    property_id,
  }: {
    agency_id?: string;
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    tenant_id?: string;
    property_id?: string;
  } = {}): Promise<Contract[]> {
    let query = supabase
      .from('contracts')
      .select(`
        *,
        property:properties(id, title, business_id),
        tenant:tenants(id, first_name, last_name, business_id, phone),
        owner:owners(id, first_name, last_name, business_id, phone)
      `)
      .order('created_at', { ascending: false });

    if (agency_id) {
      query = query.eq('agency_id', agency_id);
    }
    if (search) {
      query = query.or(`terms.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id);
    }
    if (property_id) {
      query = query.eq('property_id', property_id);
    }
    if (limit !== undefined && offset !== undefined) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    if (error) throw new Error(formatSbError('❌ contracts.select', error));
    return data ?? [];
  },
  async create(contract: Partial<Contract>): Promise<Contract> {
    const clean = normalizeContract(contract);
    const { data, error } = await supabase.from('contracts').insert(clean).select('*').single();
    if (error) throw new Error(formatSbError('❌ contracts.insert', error));
    return data;
  },
  async update(id: string, updates: Partial<Contract>): Promise<Contract> {
    const clean = normalizeContract(updates);
    const { data, error } = await supabase
      .from('contracts')
      .update(clean)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(formatSbError('❌ contracts.update', error));
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) throw new Error(formatSbError('❌ contracts.delete', error));
    return true;
  },
  async findOne(id: string): Promise<Contract | null> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(formatSbError('❌ contracts.findOne', error));
    }
    return data;
  },
};
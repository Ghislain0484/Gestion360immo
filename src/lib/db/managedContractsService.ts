import { supabase } from '../config';
import { formatSbError } from '../helpers';
import { ManagedContract, ContractLifecycleStatus, ContractTemplateType } from '../../types/contracts';

const TABLE = 'contracts_managed';

interface GetContractsParams {
  agency_id?: string;
  owner_id?: string;
  property_id?: string;
  tenant_id?: string;
  status?: ContractLifecycleStatus;
  contract_type?: ContractTemplateType;
}

export const managedContractsService = {
  async getAll(params: GetContractsParams = {}): Promise<ManagedContract[]> {
    let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false });

    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'undefined' || value === null) return;
      query = query.eq(key, value);
    });

    const { data, error } = await query;
    if (error) throw new Error(formatSbError('contracts_managed.getAll', error));
    return data ?? [];
  },

  async findById(id: string): Promise<ManagedContract | null> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(formatSbError('contracts_managed.findById', error));
    return data ?? null;
  },

  async create(payload: Partial<ManagedContract>): Promise<ManagedContract> {
    const { data, error } = await supabase.from(TABLE).insert(payload).select('*').single();
    if (error) throw new Error(formatSbError('contracts_managed.create', error));
    return data;
  },

  async update(id: string, payload: Partial<ManagedContract>): Promise<ManagedContract> {
    const { data, error } = await supabase.from(TABLE).update(payload).eq('id', id).select('*').single();
    if (error) throw new Error(formatSbError('contracts_managed.update', error));
    return data;
  },
};

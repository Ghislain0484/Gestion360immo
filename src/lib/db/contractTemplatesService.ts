import { supabase } from '../config';
import { formatSbError } from '../helpers';
import { ContractTemplateType, ContractTemplate } from '../../types/contracts';

interface GetTemplatesParams {
  contract_type?: ContractTemplateType;
  usage_type?: 'habitation' | 'professionnel' | null;
  agency_id?: string;
  activeOnly?: boolean;
}

const TABLE = 'contract_templates';

export const contractTemplatesService = {
  async getAll(params: GetTemplatesParams = {}): Promise<ContractTemplate[]> {
    const { contract_type, usage_type, agency_id, activeOnly } = params;
    let query = supabase.from(TABLE).select('*').order('version', { ascending: false });

    if (agency_id) {
      query = query.eq('agency_id', agency_id);
    }
    if (contract_type) {
      query = query.eq('contract_type', contract_type);
    }
    if (typeof usage_type !== 'undefined') {
      query = usage_type === null ? query.is('usage_type', null) : query.eq('usage_type', usage_type);
    }
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw new Error(formatSbError('contract_templates.getAll', error));
    return data ?? [];
  },

  async getLatest(
    contractType: ContractTemplateType,
    usage: 'habitation' | 'professionnel' | null,
    agencyId?: string,
  ): Promise<ContractTemplate | null> {
    let query = supabase
      .from(TABLE)
      .select('*')
      .eq('contract_type', contractType)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1);

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }
    if (usage === null) {
      query = query.is('usage_type', null);
    } else {
      query = query.eq('usage_type', usage);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(formatSbError('contract_templates.getLatest', error));
    return data ?? null;
  },

  async create(payload: Partial<ContractTemplate>): Promise<ContractTemplate> {
    const { data, error } = await supabase.from(TABLE).insert(payload).select('*').single();
    if (error) throw new Error(formatSbError('contract_templates.create', error));
    return data;
  },

  async update(id: string, payload: Partial<ContractTemplate>): Promise<ContractTemplate> {
    const { data, error } = await supabase.from(TABLE).update(payload).eq('id', id).select('*').single();
    if (error) throw new Error(formatSbError('contract_templates.update', error));
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw new Error(formatSbError('contract_templates.delete', error));
  },
};

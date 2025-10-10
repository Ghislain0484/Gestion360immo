import { supabase } from '../config';
import { formatSbError } from '../helpers';
import { ContractVersion } from '../../types/contracts';

const TABLE = 'contract_versions';

export const contractVersionsService = {
  async getByContract(contractId: string): Promise<ContractVersion[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('contract_id', contractId)
      .order('version_number', { ascending: false });
    if (error) throw new Error(formatSbError('contract_versions.getByContract', error));
    return data ?? [];
  },

  async getLatest(contractId: string): Promise<ContractVersion | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('contract_id', contractId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(formatSbError('contract_versions.getLatest', error));
    return data ?? null;
  },

  async create(payload: Partial<ContractVersion>): Promise<ContractVersion> {
    const { data, error } = await supabase.from(TABLE).insert(payload).select('*').single();
    if (error) throw new Error(formatSbError('contract_versions.create', error));
    return data;
  },
};

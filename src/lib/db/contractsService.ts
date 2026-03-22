import { supabase } from '../config';
import { normalizeContract } from '../normalizers';
import { formatSbError } from '../helpers';
import { Contract } from "../../types/db";
import { auditLogsService } from './auditLogsService';

export const contractsService = {
  async getAll({
    agency_id,
    limit,
    offset,
    search,
    status,
    type,
    tenant_id,
    property_id,
    owner_id,
  }: {
    agency_id?: string;
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    type?: string;
    tenant_id?: string;
    property_id?: string;
    owner_id?: string;
  } = {}): Promise<Contract[]> {
    if (agency_id === '00000000-0000-0000-0000-000000000000') {
      const { MOCK_CONTRACTS, MOCK_PROPERTIES, MOCK_TENANTS, MOCK_OWNERS } = await import('../mockData');
      let result = [...MOCK_CONTRACTS];
      
      if (status) result = result.filter(c => c.status === status);
      if (type) result = result.filter(c => c.type === type);
      if (tenant_id) result = result.filter(c => c.tenant_id === tenant_id);
      if (property_id) result = result.filter(c => c.property_id === property_id);
      if (owner_id) result = result.filter(c => c.owner_id === owner_id);
      
      if (search) {
        const s = search.toLowerCase();
        result = result.filter(c => 
            c.terms.toLowerCase().includes(s) || 
            c.id.toLowerCase().includes(s)
        );
      }

      // Simuler les jointures attendues par les composants
      return result.map(c => ({
        ...c,
        property: MOCK_PROPERTIES.find(p => p.id === c.property_id),
        tenant: MOCK_TENANTS.find(t => t.id === c.tenant_id),
        owner: MOCK_OWNERS.find(o => o.id === c.owner_id)
      })) as any[];
    }

    let query = supabase
      .from('contracts')
      .select(`
        *,
        property:properties(id, title, business_id),
        tenant:tenants(id, first_name, last_name, business_id, phone),
        owner:owners(id, first_name, last_name, business_id, phone)
      `)
      .order('created_at', { ascending: false });

    if (agency_id) query = query.eq('agency_id', agency_id);
    if (search) query = query.or(`terms.ilike.%${search}%,id.ilike.%${search}%`);
    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);
    if (tenant_id) query = query.eq('tenant_id', tenant_id);
    if (property_id) query = query.eq('property_id', property_id);
    if (owner_id) query = query.eq('owner_id', owner_id);
    
    const limitVal = limit ?? 100;
    const offsetVal = offset ?? 0;
    query = query.range(offsetVal, offsetVal + limitVal - 1);

    const { data, error } = await query;
    if (error) throw new Error(formatSbError('❌ contracts.select', error));
    return data ?? [];
  },
  async create(contract: Partial<Contract>): Promise<Contract> {
    const clean = normalizeContract(contract);
    const { data, error } = await supabase.from('contracts').insert(clean).select('*').single();
    if (error) throw new Error(formatSbError('❌ contracts.insert', error));
    
    // Log action
    await auditLogsService.insert({
      action: `Nouveau contrat: ${data.type}`,
      table_name: 'properties', // We log on the property record for the history view
      record_id: data.property_id,
      new_values: data,
    });
    
    return data;
  },
  async update(id: string, updates: Partial<Contract>): Promise<Contract> {
    const { normalizePartialContract } = await import('../normalizers');
    const clean = normalizePartialContract(updates);
    const { data, error } = await supabase
      .from('contracts')
      .update(clean)
      .eq('id', id)
      .select('*, property_id')
      .single();
    if (error) throw new Error(formatSbError('❌ contracts.update', error));
    
    // Log action
    await auditLogsService.insert({
      action: `MAJ Contrat: ${data.status}`,
      table_name: 'properties',
      record_id: data.property_id,
      new_values: data,
    });
    
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) throw new Error(formatSbError('❌ contracts.delete', error));
    return true;
  },
  async deleteAllByAgency(agencyId: string): Promise<void> {
    const { error } = await supabase.from('contracts').delete().eq('agency_id', agencyId);
    if (error) throw new Error(formatSbError('❌ contracts.deleteAllByAgency', error));
  },
  async findOne(id: string): Promise<Contract | null> {
    if (id.startsWith('demo-')) {
      const { MOCK_CONTRACTS, MOCK_PROPERTIES, MOCK_TENANTS, MOCK_OWNERS } = await import('../mockData');
      const contract = MOCK_CONTRACTS.find(c => c.id === id);
      if (!contract) return null;
      
      return {
        ...contract,
        property: MOCK_PROPERTIES.find(p => p.id === contract.property_id),
        tenant: MOCK_TENANTS.find(t => t.id === contract.tenant_id),
        owner: MOCK_OWNERS.find(o => o.id === contract.owner_id)
      } as any;
    }

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
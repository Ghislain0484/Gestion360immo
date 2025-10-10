import { supabase } from '../config';
import { formatSbError } from '../helpers';
import { PropertyTenantAssignment } from '../../types/contracts';

const TABLE = 'property_tenant_assignments';

interface GetAssignmentsParams {
  property_id?: string;
  tenant_id?: string;
  agency_id?: string;
  status?: 'active' | 'inactive' | 'terminated';
}

export const propertyTenantAssignmentsService = {
  async getAll(params: GetAssignmentsParams = {}): Promise<PropertyTenantAssignment[]> {
    let query = supabase.from(TABLE).select('*').order('lease_start', { ascending: false });

    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'undefined' || value === null) return;
      query = query.eq(key, value);
    });

    const { data, error } = await query;
    if (error) throw new Error(formatSbError('property_tenant_assignments.getAll', error));
    return data ?? [];
  },

  async create(payload: Partial<PropertyTenantAssignment>): Promise<PropertyTenantAssignment> {
    const { data, error } = await supabase.from(TABLE).insert(payload).select('*').single();
    if (error) throw new Error(formatSbError('property_tenant_assignments.create', error));
    return data;
  },

  async update(id: string, payload: Partial<PropertyTenantAssignment>): Promise<PropertyTenantAssignment> {
    const { data, error } = await supabase.from(TABLE).update(payload).eq('id', id).select('*').single();
    if (error) throw new Error(formatSbError('property_tenant_assignments.update', error));
    return data;
  },
};

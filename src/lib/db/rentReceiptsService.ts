import { supabase } from '../config';
import { normalizeRentReceipt } from '../normalizers';
import { formatSbError } from '../helpers';
import { RentReceipt } from '../../types/db';
import { v4 as uuidv4 } from 'uuid';

interface GetAllParams {
  agency_id?: string;
  [key: string]: any;
}

export const rentReceiptsService = {
  async getAll(params?: GetAllParams): Promise<RentReceipt[]> {
    let query = supabase
      .from('rent_receipts')
      .select(`
        *,
        contracts!inner(agency_id),
        property:properties(business_id),
        tenant:tenants(business_id),
        owner:owners(business_id)
      `)
      .order('created_at', { ascending: false });

    if (params?.agency_id) {
      query = query.eq('contracts.agency_id', params.agency_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(formatSbError('❌ rent_receipts.select', error));
    return (data ?? []).map((item: any) => ({
      ...item,
    }));
  },
  async findOne(id: string): Promise<RentReceipt | null> {
    const { data, error } = await supabase
      .from('rent_receipts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(formatSbError('❌ rent_receipts.findOne', error));
    }
    return data;
  },
  async create(receipt: Partial<RentReceipt>): Promise<RentReceipt> {
    console.log('🔧 Service: Starting create receipt...');
    console.log('📥 Service: Input receipt:', receipt);

    // Normalize first, then override critical fields
    const normalized = normalizeRentReceipt(receipt);
    console.log('🔄 Service: Normalized receipt:', normalized);

    const clean: Partial<RentReceipt> = {
      ...normalized,
      id: receipt.id ?? uuidv4(),
      agency_id: receipt.agency_id, // Must not be undefined
      created_at: new Date().toISOString(),
    };

    console.log('✨ Service: Clean receipt before validation:', clean);

    // Validate required fields
    if (!clean.agency_id) {
      console.error('❌ Service: Missing agency_id');
      throw new Error('agency_id is required');
    }
    if (!clean.contract_id) {
      console.error('❌ Service: Missing contract_id');
      throw new Error('contract_id is required');
    }
    if (!clean.tenant_id) {
      console.error('❌ Service: Missing tenant_id');
      throw new Error('tenant_id is required');
    }

    console.log('📤 Service: Inserting into database:', clean);

    const { data, error } = await supabase
      .from('rent_receipts')
      .insert(clean)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Service: Database error:', error);
      throw new Error(formatSbError('❌ rent_receipts.insert', error));
    }

    console.log('✅ Service: Receipt created successfully:', data);
    return data;
  },
  async update(id: string, updates: Partial<RentReceipt>): Promise<RentReceipt> {
    const cleanUpdates = normalizeRentReceipt(updates);
    const { data, error } = await supabase
      .from('rent_receipts')
      .update(cleanUpdates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(formatSbError('❌ rent_receipts.update', error));
    return data;
  },
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('rent_receipts').delete().eq('id', id);
    if (error) throw new Error(formatSbError('❌ rent_receipts.delete', error));
    return true;
  },
};
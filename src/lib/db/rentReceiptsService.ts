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
      .select('*, contracts!inner(agency_id)')
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
    const clean: Partial<RentReceipt> = {
      id: receipt.id ?? uuidv4(),
      agency_id: receipt.agency_id,
      created_at: new Date().toISOString(),
      ...normalizeRentReceipt(receipt),
    };

    const { data, error } = await supabase
      .from('rent_receipts')
      .insert(clean)
      .select('*')
      .single();

    if (error) throw new Error(formatSbError('❌ rent_receipts.insert', error));
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
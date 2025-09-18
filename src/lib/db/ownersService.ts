import { supabase } from '../config';
import { normalizeOwner } from '../normalizers';
import { formatSbError } from '../helpers';
import { Owner } from "../../types/db";

interface GetAllParams {
  agency_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}


export const ownersService = {
    async findOne(id: string): Promise<Owner | null> {
        const { data, error } = await supabase
            .from('owners')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(formatSbError('❌ owners.findOne', error));
        }
        return data;
    },
    async getAll({
        agency_id,
        search,
        limit = 10,
        offset = 0,
      }: GetAllParams = {}): Promise<Owner[]> {
        let query = supabase
          .from('owners')
          .select('*')
          .order('created_at', { ascending: false });
    
        if (agency_id) {
          query = query.eq('agency_id', agency_id);
        }
        if (search) {
          query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
        }
        if (limit !== undefined && offset !== undefined) {
          query = query.range(offset, offset + limit - 1);
        }
    
        const { data, error } = await query;
        if (error) throw new Error(formatSbError('❌ owners.select', error));
        return data ?? [];
      },
    async getById(id: string): Promise<Owner> {
        const { data, error } = await supabase
            .from('owners')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw new Error(formatSbError('❌ owners.select', error));
        return data;
    },
    async create(owner: Partial<Owner>): Promise<Owner> {
        const cleanOwner = normalizeOwner(owner);
        const { data, error } = await supabase
            .from('owners')
            .insert(cleanOwner)
            .select('*')
            .single();
        if (error) throw new Error(formatSbError('❌ owners.insert', error));
        return data;
    },
    async update(id: string, updates: Partial<Owner>): Promise<Owner> {
        const cleanUpdates = normalizeOwner(updates);
        const { data, error } = await supabase
            .from('owners')
            .update(cleanUpdates)
            .eq('id', id)
            .select('*')
            .single();
        if (error) throw new Error(formatSbError('❌ owners.update', error));
        return data;
    },
    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('owners').delete().eq('id', id);
        if (error) throw new Error(formatSbError('❌ owners.delete', error));
    },
};